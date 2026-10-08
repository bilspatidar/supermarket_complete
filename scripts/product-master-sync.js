import fs from "fs";
import mysql from "mysql2/promise";
import xlsx from "xlsx";
import "dotenv/config";

const excelFile = "./AVAILABLE STOCK TILL 02 OCT (1).xls";

const clean = (v) => String(v ?? "").trim();

const normalizeName = (v) =>
  clean(v)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/(\d+)(GM|G)\b/g, "$1G")
    .replace(/(\d+)(KG|KGS)\b/g, "$1KG");

const normalizeBrand = (v) =>
  clean(v)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const number = (v) => {
  if (v === "" || v == null) return null;

  const n = Number(
    String(v)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .trim()
  );

  return Number.isFinite(n) ? n : null;
};

const productKey = (name, price) =>
  `${normalizeName(name)}|${Number(price).toFixed(2)}`;

const slugify = (value) =>
  clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");


    function getUniqueSlug(baseValue, fallbackValue, usedSlugs) {
        const base = slugify(baseValue) || slugify(fallbackValue);
      
        if (!usedSlugs.has(base)) {
          usedSlugs.add(base);
          return base;
        }
      
        const fallback = slugify(fallbackValue);
        const candidate = `${base}-${fallback}`;
      
        if (!usedSlugs.has(candidate)) {
          usedSlugs.add(candidate);
          return candidate;
        }
      
        let counter = 2;
      
        while (usedSlugs.has(`${candidate}-${counter}`)) {
          counter++;
        }
      
        const finalSlug = `${candidate}-${counter}`;
      
        usedSlugs.add(finalSlug);
      
        return finalSlug;
      }

const workbook = xlsx.readFile(excelFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

const raw = xlsx.utils.sheet_to_json(sheet, {
  range: 2,
  defval: "",
});

console.log("\n=== PRODUCT MASTER SYNC ===\n");
console.log("Excel rows:", raw.length);

const rows = raw.map((r, i) => {
  const h = {};

  for (const k of Object.keys(r)) {
    h[k.toLowerCase().replace(/[.\s_-]+/g, "")] = r[k];
  }

  return {
    excel_row: i + 3,
    name: clean(h.productname),
    unit: clean(h.unit),
    stock: number(h.currentstock) ?? 0,
    mrp: number(h.mrp),
    sales_price: number(h.salesprice),
    company: clean(h.company),
    barcode: clean(h.barcode),
  };
});

const invalid = rows.filter(
  (r) => !r.name || r.sales_price === null
);

if (invalid.length > 0) {
  throw new Error(
    `Found ${invalid.length} invalid Excel rows. Sync stopped.`
  );
}

const valid = rows;

// --------------------------------------------------
// GROUP EXCEL PRODUCTS
// --------------------------------------------------

const groups = new Map();

for (const row of valid) {
  const key = productKey(row.name, row.sales_price);

  if (!groups.has(key)) {
    groups.set(key, []);
  }

  groups.get(key).push(row);
}

const finalExcel = [];
const duplicateExcelRows = [];

for (const [key, list] of groups) {
  let keep = list[0];

  for (const row of list.slice(1)) {
    const keepSpaces = (keep.name.match(/\s/g) || []).length;
    const rowSpaces = (row.name.match(/\s/g) || []).length;

    if (
      rowSpaces > keepSpaces ||
      (rowSpaces === keepSpaces &&
        row.name.length > keep.name.length)
    ) {
      keep = row;
    }
  }

  const totalStock = list.reduce(
    (sum, row) => sum + (Number(row.stock) || 0),
    0
  );

  finalExcel.push({
    ...keep,
    stock: totalStock,
    identity: key,
  });

  for (const row of list) {
    if (row !== keep) {
      duplicateExcelRows.push(row);
    }
  }
}

// --------------------------------------------------
// DATABASE
// --------------------------------------------------

const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "supermarket_db",
});

try {
  // ------------------------------------------------
  // SAFETY BACKUP
  // ------------------------------------------------

  const backupTable = `products_backup_sync_${new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14)}`;

  console.log("Creating products backup...");

  await db.query(`
    CREATE TABLE \`${backupTable}\`
    AS SELECT * FROM products
  `);

  console.log("Backup table:", backupTable);

  // ------------------------------------------------
  // LOAD DB
  // ------------------------------------------------

  const [products] = await db.execute(`
    SELECT
      id,
      product_code,
      barcode,
      name,
      slug,
      category_id,
      brand_id,
      original_price,
      selling_price,
      tax_percent,
      unit,
      stock,
      minimum_stock,
      description,
      image,
      image2,
      status,
      featured,
      sort_order,
      created_at,
      updated_at,
      is_image
    FROM products
  `);

  const [brands] = await db.execute(`
    SELECT id, name, slug
    FROM brands
  `);


  const existingProductSlugs = new Set(
    products
      .map((p) => clean(p.slug))
      .filter(Boolean)
  );
  
  const existingBrandSlugs = new Set(
    brands
      .map((b) => clean(b.slug))
      .filter(Boolean)
  );
  // ------------------------------------------------
  // PRODUCT MAP
  // ------------------------------------------------

  const dbMap = new Map();

  for (const p of products) {
    const key = productKey(p.name, p.selling_price);

    if (!dbMap.has(key)) {
      dbMap.set(key, []);
    }

    dbMap.get(key).push(p);
  }

  // ------------------------------------------------
  // HIGHEST SP CODE
  // ------------------------------------------------

  let highestSP = 0;

  for (const p of products) {
    const match = /^SP(\d+)$/i.exec(
      clean(p.product_code)
    );

    if (match) {
      highestSP = Math.max(
        highestSP,
        Number(match[1])
      );
    }
  }

  let nextSP = highestSP + 1;

  // ------------------------------------------------
  // BRAND MAP
  // ------------------------------------------------

  const brandMap = new Map();

  for (const brand of brands) {
    brandMap.set(
      normalizeBrand(brand.name),
      brand
    );
  }

  // ------------------------------------------------
  // PLAN SYNC
  // ------------------------------------------------

  const matched = [];
  const duplicateDeletes = [];
  const newProducts = [];

  const excelKeys = new Set();

  for (const row of finalExcel) {
    excelKeys.add(row.identity);

    const matches =
      dbMap.get(row.identity) || [];

    // ----------------------------------------------
    // EXACTLY ONE EXISTING PRODUCT
    // ----------------------------------------------

    if (matches.length === 1) {
      matched.push({
        excel: row,
        db: matches[0],
      });

      continue;
    }

    // ----------------------------------------------
    // MULTIPLE EXISTING PRODUCTS
    // ----------------------------------------------

    if (matches.length > 1) {
      const sortedMatches = [...matches].sort(
        (a, b) => {
          const aHasImage =
            Number(a.is_image) === 1 &&
            a.image
              ? 1
              : 0;

          const bHasImage =
            Number(b.is_image) === 1 &&
            b.image
              ? 1
              : 0;

          if (aHasImage !== bHasImage) {
            return bHasImage - aHasImage;
          }

          const aIsSW =
            /^SW-/i.test(
              String(a.product_code || "")
            )
              ? 1
              : 0;

          const bIsSW =
            /^SW-/i.test(
              String(b.product_code || "")
            )
              ? 1
              : 0;

          if (aIsSW !== bIsSW) {
            return bIsSW - aIsSW;
          }

          return Number(a.id) - Number(b.id);
        }
      );

      const keep = sortedMatches[0];
      const remove = sortedMatches.slice(1);

      matched.push({
        excel: row,
        db: keep,
      });

      for (const duplicate of remove) {
        duplicateDeletes.push({
          id: duplicate.id,
          product_code: duplicate.product_code,
          name: duplicate.name,
          image: duplicate.image,
          identity: row.identity,
          keep_id: keep.id,
          keep_product_code: keep.product_code,
        });
      }

      continue;
    }

    // ----------------------------------------------
    // GENUINELY NEW PRODUCT
    // ----------------------------------------------

    const proposedCode =
      `SP${String(nextSP).padStart(6, "0")}`;

    nextSP++;

    newProducts.push({
      ...row,
      proposed_product_code: proposedCode,
    });
  }

  // ------------------------------------------------
  // DB-ONLY PRODUCTS
  // ------------------------------------------------

  const deleteCandidates = products.filter((p) => {
    const key = productKey(
      p.name,
      p.selling_price
    );

    return !excelKeys.has(key);
  });

  // ------------------------------------------------
  // IMPORTANT SAFETY CHECK
  // ------------------------------------------------

  const expectedExcelProducts =
    matched.length + newProducts.length;

  if (
    expectedExcelProducts !==
    finalExcel.length
  ) {
    throw new Error(
      `Product reconciliation failed: ${matched.length} UPDATE + ${newProducts.length} INSERT = ${expectedExcelProducts}, expected ${finalExcel.length}`
    );
  }

  // ------------------------------------------------
  // BRAND PREPARATION
  // ------------------------------------------------

  const excelBrands = new Map();

  for (const row of finalExcel) {
    if (!row.company) continue;

    const key = normalizeBrand(row.company);

    if (!excelBrands.has(key)) {
      excelBrands.set(key, row.company);
    }
  }

  const brandIdMap = new Map();

  // Existing brands
  for (const [key, brand] of brandMap) {
    brandIdMap.set(key, brand.id);
  }

  // ------------------------------------------------
  // TRANSACTION START
  // ------------------------------------------------


  // ------------------------------------------------
// FINAL SYNC PLAN CHECK
// ------------------------------------------------

const expectedFinalCount =
products.length -
duplicateDeletes.length -
deleteCandidates.length +
newProducts.length;

console.log("\n================================");
console.log("SYNC PLAN");
console.log("================================");
console.log(
"Excel products       :",
finalExcel.length
);
console.log(
"Existing updates     :",
matched.length
);
console.log(
"New inserts          :",
newProducts.length
);
console.log(
"Duplicate DB deletes :",
duplicateDeletes.length
);
console.log(
"DB-only deletes      :",
deleteCandidates.length
);
console.log(
"Total DB deletes     :",
duplicateDeletes.length +
  deleteCandidates.length
);
console.log(
"Expected final count :",
expectedFinalCount
);
console.log("================================");

if (expectedFinalCount !== finalExcel.length) {
throw new Error(
  `Final count mismatch. Expected ${finalExcel.length}, calculated ${expectedFinalCount}`
);
}


  console.log("\nStarting transaction...");

  await db.beginTransaction();

  // ------------------------------------------------
  // BRANDS
  // ------------------------------------------------

  let insertedBrands = 0;

  for (const [key, brandName] of excelBrands) {
    if (brandIdMap.has(key)) {
      continue;
    }

    const slug = getUniqueSlug(
        brandName,
        `brand-${key.toLowerCase()}`,
        existingBrandSlugs
      );

    const [result] = await db.execute(
      `
      INSERT INTO brands
      (
        name,
        slug,
        status
      )
      VALUES (?, ?, 1)
      `,
      [
        brandName,
        slug,
      ]
    );

    brandIdMap.set(
      key,
      result.insertId
    );

    insertedBrands++;
  }

  // ------------------------------------------------
  // UPDATE EXISTING PRODUCTS
  // ------------------------------------------------

  let updatedProducts = 0;

  for (const item of matched) {
    const row = item.excel;
    const product = item.db;

    const brandId = row.company
      ? brandIdMap.get(
          normalizeBrand(row.company)
        ) || product.brand_id
      : product.brand_id;

    await db.execute(
      `
      UPDATE products
      SET
        name = ?,
        slug = ?,
        category_id = 1,
        brand_id = ?,
        barcode = ?,
        original_price = ?,
        selling_price = ?,
        unit = ?,
        stock = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        row.name,
        product.slug ||
        getUniqueSlug(
            row.name,
            product.product_code,
            existingProductSlugs
        ),
        brandId || null,
        row.barcode || "",
        row.mrp ?? 0,
        row.sales_price,
        row.unit || null,
        row.stock,
        product.id,
      ]
    );

    updatedProducts++;
  }

  // ------------------------------------------------
  // INSERT NEW PRODUCTS
  // ------------------------------------------------

  let insertedProducts = 0;

  for (const row of newProducts) {
    const brandId = row.company
      ? brandIdMap.get(
          normalizeBrand(row.company)
        ) || null
      : null;

    await db.execute(
      `
      INSERT INTO products
      (
        product_code,
        barcode,
        name,
        slug,
        category_id,
        brand_id,
        original_price,
        selling_price,
        unit,
        stock,
        status,
        featured,
        sort_order,
        is_image
      )
      VALUES
      (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 1, 0, 0, 0)
      `,
      [
        row.proposed_product_code,
        row.barcode || "",
        row.name,
        getUniqueSlug(
            row.name,
            row.proposed_product_code,
            existingProductSlugs
          ),
        brandId,
        row.mrp ?? 0,
        row.sales_price,
        row.unit || null,
        row.stock,
      ]
    );

    insertedProducts++;
  }

  // ------------------------------------------------
  // DELETE DUPLICATE DB RECORDS
  // ------------------------------------------------

  let deletedDuplicates = 0;

  for (const duplicate of duplicateDeletes) {
    await db.execute(
      `
      DELETE FROM products
      WHERE id = ?
      `,
      [duplicate.id]
    );

    deletedDuplicates++;
  }

  // ------------------------------------------------
  // DELETE DB-ONLY PRODUCTS
  // ------------------------------------------------

  let deletedDbOnly = 0;

  for (const product of deleteCandidates) {
    // Do not delete a product that was already
    // deleted as an intentional duplicate.
    const wasDuplicate = duplicateDeletes.some(
      (d) => Number(d.id) === Number(product.id)
    );

    if (wasDuplicate) {
      continue;
    }

    await db.execute(
      `
      DELETE FROM products
      WHERE id = ?
      `,
      [product.id]
    );

    deletedDbOnly++;
  }

  // ------------------------------------------------
  // COMMIT
  // ------------------------------------------------

  await db.commit();

  // ------------------------------------------------
  // REPORT
  // ------------------------------------------------

  const finalCount =
    products.length -
    deletedDuplicates -
    deletedDbOnly +
    insertedProducts;

  const report = {
    excel_rows: rows.length,
    valid_rows: valid.length,
    excel_duplicates_removed:
      duplicateExcelRows.length,
    final_excel_products:
      finalExcel.length,

    before_products:
      products.length,

    updated_products:
      updatedProducts,

    inserted_products:
      insertedProducts,

    duplicate_products_deleted:
      deletedDuplicates,

    db_only_products_deleted:
      deletedDbOnly,

    after_products:
      finalCount,

    brands_inserted:
      insertedBrands,

    highest_old_sp:
      `SP${String(highestSP).padStart(6, "0")}`,

    first_new_sp:
      newProducts[0]?.proposed_product_code ||
      null,

    backup_table:
      backupTable,

    r2_files_changed:
      false,

    database_changed:
      true,
  };

  fs.mkdirSync(
    "./product-sync-report",
    { recursive: true }
  );

  fs.writeFileSync(
    "./product-sync-report/final-sync-report.json",
    JSON.stringify(
      report,
      null,
      2
    )
  );

  fs.writeFileSync(
    "./product-sync-report/duplicate-deletes.json",
    JSON.stringify(
      duplicateDeletes,
      null,
      2
    )
  );

  fs.writeFileSync(
    "./product-sync-report/db-only-deletes.json",
    JSON.stringify(
      deleteCandidates.filter(
        (p) =>
          !duplicateDeletes.some(
            (d) =>
              Number(d.id) ===
              Number(p.id)
          )
      ),
      null,
      2
    )
  );

  console.log("\n================================");
  console.log("SYNC COMPLETED");
  console.log("================================");
  console.log(
    "Excel products       :",
    finalExcel.length
  );
  console.log(
    "Updated products     :",
    updatedProducts
  );
  console.log(
    "Inserted products    :",
    insertedProducts
  );
  console.log(
    "Duplicate deleted    :",
    deletedDuplicates
  );
  console.log(
    "DB-only deleted      :",
    deletedDbOnly
  );
  console.log(
    "Brands inserted      :",
    insertedBrands
  );
  console.log(
    "Final product count  :",
    finalCount
  );
  console.log(
    "Backup table         :",
    backupTable
  );
  console.log(
    "R2 files changed     : NO"
  );
  console.log("================================\n");
} catch (error) {
  try {
    await db.rollback();
  } catch {}

  console.error("\n!!! SYNC FAILED !!!");
  console.error(error);

  console.error(
    "\nDatabase transaction was rolled back."
  );

  process.exitCode = 1;
} finally {
  await db.end();
}