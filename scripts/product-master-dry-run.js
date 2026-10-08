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
  clean(v).toUpperCase().replace(/\s+/g, " ");

const number = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/₹/g, "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

const productKey = (name, price) =>
  `${normalizeName(name)}|${Number(price).toFixed(2)}`;

console.log("\n=== PRODUCT MASTER DRY RUN ===\n");

if (!fs.existsSync(excelFile)) {
  throw new Error(`Excel not found: ${excelFile}`);
}

const workbook = xlsx.readFile(excelFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

const raw = xlsx.utils.sheet_to_json(sheet, {
    range: 2,
    defval: ''
  });

console.log("Excel rows:", raw.length);

const rows = raw.map((r, i) => {
  const h = {};

  for (const k of Object.keys(r)) {
    h[k.toLowerCase().replace(/[.\s_-]+/g, "")] = r[k];
  }

  return {
    excel_row: i + 2,
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

const valid = rows.filter(
  (r) => r.name && r.sales_price !== null
);

// Excel duplicate cleanup
const groups = new Map();

for (const row of valid) {
  const key = productKey(row.name, row.sales_price);

  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}

const finalExcel = [];
const duplicates = [];

for (const [key, list] of groups) {
  // Prefer the properly spaced/readable name
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

  // IMPORTANT:
  // Same Name + Sales Price can appear on multiple
  // stock rows. Combine their stock.
  const totalStock = list.reduce(
    (sum, row) => sum + (Number(row.stock) || 0),
    0
  );

  finalExcel.push({
    ...keep,
    stock: totalStock,
    identity: key,
  });

  // Keep duplicate information for report only
  for (const row of list) {
    if (row !== keep) {
      duplicates.push({
        identity: key,
        name: row.name,
        sales_price: row.sales_price,
        stock: row.stock,
        excel_row: row.excel_row,
      });
    }
  }
}

const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "supermarket_db",
});

const [products] = await db.execute(`
  SELECT id, product_code, name, selling_price,
         brand_id, image, image2, is_image
  FROM products
`);

const [brands] = await db.execute(`
  SELECT id, name FROM brands
`);

const dbMap = new Map();

for (const p of products) {
  const key = productKey(p.name, p.selling_price);

  if (!dbMap.has(key)) dbMap.set(key, []);
  dbMap.get(key).push(p);
}

let highestSP = 0;

for (const p of products) {
  const m = /^SP(\d+)$/i.exec(clean(p.product_code));

  if (m) {
    highestSP = Math.max(highestSP, Number(m[1]));
  }
}

let nextSP = highestSP + 1;

const matched = [];
const ambiguous = [];
const newProducts = [];
const excelKeys = new Set();

for (const row of finalExcel) {
    excelKeys.add(row.identity);
  
    const matches = dbMap.get(row.identity) || [];
  
    if (matches.length === 1) {
      matched.push({
        excel: row,
        db: matches[0],
      });
  
      continue;
    }
  
    if (matches.length > 1) {
      // Same product exists multiple times in DB.
      // Prefer the record that already has an image.
      // If both/neither have image, prefer the older SW code.
      const sortedMatches = [...matches].sort((a, b) => {
        const aHasImage =
          Number(a.is_image) === 1 && a.image ? 1 : 0;
  
        const bHasImage =
          Number(b.is_image) === 1 && b.image ? 1 : 0;
  
        if (aHasImage !== bHasImage) {
          return bHasImage - aHasImage;
        }
  
        const aIsSW = /^SW-/i.test(String(a.product_code || "")) ? 1 : 0;
        const bIsSW = /^SW-/i.test(String(b.product_code || "")) ? 1 : 0;
  
        if (aIsSW !== bIsSW) {
          return bIsSW - aIsSW;
        }
  
        return Number(a.id) - Number(b.id);
      });
  
      const keep = sortedMatches[0];
      const remove = sortedMatches.slice(1);
  
      matched.push({
        excel: row,
        db: keep,
        duplicate_db_records: remove,
      });
  
      continue;
    }
  
    // No existing product -> genuinely new product
    newProducts.push({
      ...row,
      proposed_product_code:
        `SP${String(nextSP++).padStart(6, "0")}`,
    });
  }
const deleteCandidates = products.filter((p) => {
  const key = productKey(p.name, p.selling_price);
  return !excelKeys.has(key);
});

// Brands
const dbBrandMap = new Map();

for (const b of brands) {
  dbBrandMap.set(normalizeBrand(b.name), b);
}

const excelBrandMap = new Map();

for (const row of finalExcel) {
  if (!row.company) continue;

  const key = normalizeBrand(row.company);

  if (!excelBrandMap.has(key)) {
    excelBrandMap.set(key, row.company);
  }
}

const newBrands = [];

for (const [key, name] of excelBrandMap) {
  if (!dbBrandMap.has(key)) {
    newBrands.push(name);
  }
}

const report = {
  excel_rows: rows.length,
  valid_rows: valid.length,
  invalid_rows: invalid.length,
  duplicates_removed: duplicates.length,
  final_excel_products: finalExcel.length,

  database_products: products.length,
  matched_update: matched.length,
  new_insert: newProducts.length,
  delete_candidates: deleteCandidates.length,

  database_brands: brands.length,
  excel_unique_brands: excelBrandMap.size,
  new_brands: newBrands.length,
  ambiguous_matches: ambiguous.length,

  highest_existing_sp:
    `SP${String(highestSP).padStart(6, "0")}`,

  first_new_sp:
    newProducts[0]?.proposed_product_code || null,

  database_changed: false,
};

fs.mkdirSync("./product-sync-report", { recursive: true });

fs.writeFileSync(
  "./product-sync-report/summary.json",
  JSON.stringify(report, null, 2)
);

fs.writeFileSync(
  "./product-sync-report/new-products.json",
  JSON.stringify(newProducts, null, 2)
);

fs.writeFileSync(
  "./product-sync-report/delete-candidates.json",
  JSON.stringify(deleteCandidates, null, 2)
);

fs.writeFileSync(
  "./product-sync-report/duplicates.json",
  JSON.stringify(duplicates, null, 2)
);

fs.writeFileSync(
  "./product-sync-report/new-brands.json",
  JSON.stringify(newBrands, null, 2)
);

fs.writeFileSync(
    "./product-sync-report/ambiguous-matches.json",
    JSON.stringify(ambiguous, null, 2)
  );

await db.end();

console.log("\n================================");
console.log("DRY RUN RESULT");
console.log("================================");

console.log("Excel rows           :", report.excel_rows);
console.log("Valid rows           :", report.valid_rows);
console.log("Invalid rows         :", report.invalid_rows);
console.log("Duplicates removed   :", report.duplicates_removed);
console.log("Final Excel products :", report.final_excel_products);

console.log("\nDB products          :", report.database_products);
console.log("Matched / UPDATE     :", report.matched_update);
console.log("New / INSERT         :", report.new_insert);
console.log("DB-only / DELETE     :", report.delete_candidates);

console.log("\nDB brands            :", report.database_brands);
console.log("Excel unique brands  :", report.excel_unique_brands);
console.log("New brands           :", report.new_brands);

console.log("\nHighest SP code      :", report.highest_existing_sp);
console.log("First new SP code    :", report.first_new_sp);

console.log("\nDATABASE CHANGED     : NO");
console.log("================================\n");