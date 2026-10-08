import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../../database/connection.js';
import storageService from '../integrations/storage/StorageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getProducts(req, res) {
  try {
    const {
      search = '',
      category = '',
      brand = '',
      status = 'ACTIVE',
      featured = '',
      sort = 'featured',
      image = '',
      stockSort = '',
      page = 1,
      limit = 20,
    } = req.query;

    // ---------------------------------------
    // Pagination
    // ---------------------------------------
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Number(limit) || 20);
    const offset = (pageNumber - 1) * limitNumber;

    // ---------------------------------------
    // Conditions
    // ---------------------------------------
    const conditions = [];
    const args = [];

    // Status
    if (status && status !== 'ALL') {
      conditions.push('p.status = ?');
      args.push(status);
    }

    // Featured
    if (featured === '1' || featured === 'true') {
      conditions.push('p.featured = 1');
    }

    // Category
    if (category) {
      conditions.push('(c.slug = ? OR c.id = ?)');
      args.push(category, category);
    }

    // Brand
    if (brand) {
      conditions.push('(b.slug = ? OR b.id = ?)');
      args.push(brand, brand);
    }

    // Search
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;

      conditions.push(`
        (
          p.name LIKE ?
          OR p.product_code LIKE ?
          OR p.description LIKE ?
          OR c.name LIKE ?
          OR b.name LIKE ?
        )
      `);

      args.push(q, q, q, q, q);
    }

    // ---------------------------------------
    // Image Filter
    // ---------------------------------------
    if (image === 'with') {
      conditions.push('p.is_image = 1');
    }

    if (image === 'without') {
      conditions.push('(p.is_image = 0 OR p.is_image IS NULL)');
    }

    // ---------------------------------------
    // WHERE Clause
    // ---------------------------------------
    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    // ---------------------------------------
    // Sorting
    // ---------------------------------------
    let orderClause = 'p.sort_order ASC, p.id DESC';

    // Stock sorting has priority
    if (stockSort === 'asc') {
      orderClause = 'p.stock ASC, p.id DESC';
    } else if (stockSort === 'desc') {
      orderClause = 'p.stock DESC, p.id DESC';
    }

    // Price sorting
    else if (sort === 'price_asc') {
      orderClause = 'p.selling_price ASC, p.id DESC';
    } else if (sort === 'price_desc') {
      orderClause = 'p.selling_price DESC, p.id DESC';
    }

    // ---------------------------------------
    // Total Count
    // ---------------------------------------
    const countRow = await db.get(
      `
      SELECT COUNT(p.id) AS total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
      `,
      args
    );

    const total = Number(countRow?.total || 0);

    // ---------------------------------------
    // Products
    // ---------------------------------------
    const products = await db.query(
      `
      SELECT
        p.*,
        c.name AS category_name,
        c.slug AS category_slug,
        b.name AS brand_name,
        b.slug AS brand_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
      `,
      [...args, limitNumber, offset]
    );

    // ---------------------------------------
    // Response
    // ---------------------------------------
    return res.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (err) {
    console.error('getProducts error:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
export async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await db.get(
      `SELECT p.*, c.name as category_name, c.slug as category_slug,
              b.name as brand_name, b.slug as brand_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN brands b ON p.brand_id = b.id
       WHERE p.id = ? OR p.slug = ? OR p.product_code = ?`,
      [id, id, id]
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.json({ success: true, data: product });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}


export async function createProduct(req, res) {
  try {
    const {
      name,
      category_id,
      brand_id,
      original_price,
      selling_price,
      tax_percent = 5,
      unit = '1 kg',
      stock = 0,
      minimum_stock = 5,
      description = '',
      status = 'ACTIVE',
      featured = 0,
    } = req.body;

    // ---------------------------------------
    // Validate required fields
    // ---------------------------------------
    if (
      !name ||
      !category_id ||
      original_price === undefined ||
      selling_price === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, Category, and Prices are required',
      });
    }

    // ---------------------------------------
    // Generate / Validate Unique Product Code
    // ---------------------------------------
    let productCode = req.body.product_code?.trim();

    // Check supplied product code
    if (productCode) {
      const existing = await db.get(
        `
        SELECT id
        FROM products
        WHERE product_code = ?
        LIMIT 1
        `,
        [productCode]
      );

      // Supplied code already exists
      // Generate a new unique SP code instead
      if (existing) {
        productCode = null;
      }
    }

    // Generate code if not supplied OR supplied code already exists
    if (!productCode) {
      const maxRow = await db.get(
        `
        SELECT MAX(
          CASE
            WHEN product_code REGEXP '^SP[0-9]{6}$'
            THEN CAST(SUBSTRING(product_code, 3) AS UNSIGNED)
            ELSE 0
          END
        ) AS max_sequence
        FROM products
        `
      );

      let sequence = Number(maxRow?.max_sequence || 0) + 1;

      while (true) {
        const candidate = `SP${String(sequence).padStart(6, '0')}`;

        const existing = await db.get(
          `
          SELECT id
          FROM products
          WHERE product_code = ?
          LIMIT 1
          `,
          [candidate]
        );

        if (!existing) {
          productCode = candidate;
          break;
        }

        sequence++;
      }
    }

    // ---------------------------------------
    // Get uploaded files
    // ---------------------------------------
    const primaryFile = req.files?.image?.[0] || null;
    //const secondaryFile = req.files?.image2?.[0] || null;

    // ---------------------------------------
    // Generate slug
    // ---------------------------------------
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      `-${Date.now().toString().slice(-4)}`;

    // Image flag
    const isImage = primaryFile ? 1 : 0;

    // ---------------------------------------
    // Create Product
    // ---------------------------------------
    const result = await db.transaction(async (tx) => {
      const resInsert = await tx.run(
        `INSERT INTO products (
          product_code,
          slug,
          name,
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
          is_image,
          status,
          featured
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productCode.trim(),
          slug,
          name.trim(),
          category_id,
          brand_id || null,
          Number(original_price),
          Number(selling_price),
          Number(tax_percent),
          unit,
          Number(stock),
          Number(minimum_stock),
          description,
          '',
          '',
          isImage,
          status,
          featured ? 1 : 0,
        ]
      );

      const newId = resInsert.lastInsertRowid;

      // ---------------------------------------
      // Record initial inventory transaction
      // ---------------------------------------
      if (Number(stock) > 0) {
        await tx.run(
          `INSERT INTO inventory_transactions (
            product_id,
            type,
            quantity,
            previous_stock,
            new_stock,
            reference_type,
            reference_id,
            user_id,
            note
          )
          VALUES (?, 'IN', ?, 0, ?, 'INITIAL_STOCK', ?, ?, ?)`,
          [
            newId,
            Number(stock),
            Number(stock),
            String(newId),
            req.user.id,
            'Product created with initial stock',
          ]
        );
      }

      return newId;
    });

    // ---------------------------------------
    // Upload Primary Image
    // ---------------------------------------
    // ---------------------------------------
// Upload Primary Image
// ---------------------------------------
    let imageFilename = '';
    let image2Filename = '';

    if (primaryFile) {
      imageFilename = await storageService.saveFile(
        primaryFile,
        productCode
      );
    }

    // image2 disabled for now
    image2Filename = '';

    // ---------------------------------------
    // Update image filenames
    // ---------------------------------------
    if (primaryFile) {
      await db.run(
        `
        UPDATE products
        SET
          image = ?,
          image2 = '',
          is_image = 1
        WHERE id = ?
        `,
        [
          imageFilename,
          result,
        ]
      );
    }

    // ---------------------------------------
    // Get final product
    // ---------------------------------------
    const created = await db.get(
      'SELECT * FROM products WHERE id = ?',
      [result]
    );

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: created,
    });

  } catch (err) {
    console.error('createProduct error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

export async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    // ---------------------------------------
    // Get existing product
    // ---------------------------------------
    const existing = await db.get(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // ---------------------------------------
    // Get form fields
    // ---------------------------------------
    const {
      name,
      category_id,
      brand_id,
      original_price,
      selling_price,
      tax_percent,
      unit,
      minimum_stock,
      description,
      status,
      featured,
    } = req.body;

    // ---------------------------------------
    // Get uploaded files
    // ---------------------------------------
    const primaryFile = req.files?.image?.[0] || null;
    const secondaryFile = req.files?.image2?.[0] || null;

    // ---------------------------------------
    // Start with existing images
    // ---------------------------------------
    let finalImage = existing.image || '';
    let finalImage2 = existing.image2 || '';

    // ---------------------------------------
    // Upload new Primary Image
    // ---------------------------------------
    if (primaryFile) {
      finalImage = await storageService.saveFile(
        primaryFile,
        existing.product_code
      );
    }

    // ---------------------------------------
    // Upload new Secondary Image
    // ---------------------------------------
    if (secondaryFile) {
      finalImage2 = await storageService.saveFile(
        secondaryFile,
        `${existing.product_code}_2`
      );
    }
    // ---------------------------------------
    // is_image depends on Primary Image
    // ---------------------------------------
    const isImage =
      finalImage && finalImage.trim() !== ''
        ? 1
        : 0;

    // ---------------------------------------
    // Update Product
    // ---------------------------------------
    await db.run(
      `UPDATE products SET
        name = ?,
        category_id = ?,
        brand_id = ?,
        original_price = ?,
        selling_price = ?,
        tax_percent = ?,
        unit = ?,
        minimum_stock = ?,
        description = ?,
        image = ?,
        image2 = ?,
        is_image = ?,
        status = ?,
        featured = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name !== undefined
          ? name.trim()
          : existing.name,

        category_id !== undefined
          ? category_id
          : existing.category_id,

        brand_id !== undefined
          ? (brand_id || null)
          : existing.brand_id,

        original_price !== undefined
          ? Number(original_price)
          : existing.original_price,

        selling_price !== undefined
          ? Number(selling_price)
          : existing.selling_price,

        tax_percent !== undefined
          ? Number(tax_percent)
          : existing.tax_percent,

        unit !== undefined
          ? unit
          : existing.unit,

        minimum_stock !== undefined
          ? Number(minimum_stock)
          : existing.minimum_stock,

        description !== undefined
          ? description
          : existing.description,

        // Primary image
        finalImage,

        // Secondary image
        finalImage2,

        // Image flag
        isImage,

        status !== undefined
          ? status
          : existing.status,

        featured !== undefined
          ? (featured ? 1 : 0)
          : existing.featured,

        id,
      ]
    );

    // ---------------------------------------
    // Get updated product
    // ---------------------------------------
    const updated = await db.get(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: 'Product updated successfully',
      data: updated,
    });

  } catch (err) {
    console.error('updateProduct error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT id, name FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Soft delete to protect order history integrity
    await db.run("UPDATE products SET status = 'INACTIVE' WHERE id = ?", [id]);
    return res.json({ success: true, message: `Product "${existing.name}" marked inactive successfully.` });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Universal Image Upload Handler
 * Supports custom filenames (e.g. SP000123, SP000123_2, logo, etc.)
 */
export async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const customName = req.body?.customFilename || req.query?.customFilename || null;
    const publicUrl = await storageService.saveFile(req.file, customName);
    return res.json({ success: true, url: publicUrl });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Bulk Product Import from CSV/XLSX
 * Validates product_code, name, category, brand, prices, tax, unit, stock.
 * Reports row-level errors. Ensures atomic safety.
 * Supports auto-mapping product images via product code: SP000123.webp
 */
export async function bulkImportProducts(req, res) {
  try {
    const { products = [] } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'No product rows provided for import.' });
    }

    // Preload all categories and brands for lookup
    const allCategories = await db.query('SELECT id, name, slug FROM categories');
    const allBrands = await db.query('SELECT id, name, slug FROM brands');

    const catMap = new Map();
    allCategories.forEach(c => {
      catMap.set(c.name.toLowerCase().trim(), c.id);
      catMap.set(c.slug.toLowerCase().trim(), c.id);
      catMap.set(String(c.id), c.id);
    });

    const brandMap = new Map();
    allBrands.forEach(b => {
      brandMap.set(b.name.toLowerCase().trim(), b.id);
      brandMap.set(b.slug.toLowerCase().trim(), b.id);
      brandMap.set(String(b.id), b.id);
    });

    // Check existing product codes in DB
    const existingCodes = new Set();
    const existingDbCodes = await db.query('SELECT product_code FROM products');
    existingDbCodes.forEach(p => existingCodes.add(p.product_code?.toUpperCase()));

    const rowErrors = [];
    const validRows = [];
    const seenInBatch = new Set();

    // Check uploads directory for existing SP*.webp images
    const uploadsDir = path.resolve(__dirname, '../../../public/uploads');

    for (let i = 0; i < products.length; i++) {
      const rowNum = i + 1;
      const row = products[i];
      const errors = [];

      // 1. Product Code
      const code = String(row.product_code || '').trim().toUpperCase();
      if (!code) {
        errors.push('Product code is required');
      } else if (seenInBatch.has(code)) {
        errors.push(`Duplicate product code "${code}" within the uploaded batch`);
      } else if (existingCodes.has(code)) {
        errors.push(`Product code "${code}" already exists in the catalog`);
      } else {
        seenInBatch.add(code);
      }

      // 2. Name
      const name = String(row.name || '').trim();
      if (!name) {
        errors.push('Product name is required');
      }

      // 3. Category
      let categoryId = null;
      if (row.category_id) {
        categoryId = catMap.get(String(row.category_id));
      } else if (row.category) {
        const catKey = String(row.category).toLowerCase().trim();
        categoryId = catMap.get(catKey);
      }
      if (!categoryId) {
        // Fallback to first category if present
        categoryId = allCategories[0]?.id || 1;
      }

      // 4. Brand
      let brandId = null;
      if (row.brand_id) {
        brandId = brandMap.get(String(row.brand_id)) || null;
      } else if (row.brand) {
        const brandKey = String(row.brand).toLowerCase().trim();
        brandId = brandMap.get(brandKey) || null;
      }

      // 5. Prices
      const originalPrice = parseFloat(row.original_price);
      const sellingPrice = parseFloat(row.selling_price);

      if (isNaN(originalPrice) || originalPrice < 0) {
        errors.push('Original price must be a valid positive number');
      }
      if (isNaN(sellingPrice) || sellingPrice < 0) {
        errors.push('Selling price must be a valid positive number');
      }
      if (!isNaN(originalPrice) && !isNaN(sellingPrice) && sellingPrice > originalPrice) {
        errors.push('Selling price cannot exceed original price');
      }

      // 6. Tax, Unit, Stock
      const taxPercent = !isNaN(parseFloat(row.tax_percent)) ? parseFloat(row.tax_percent) : 5;
      const unit = String(row.unit || '1 kg').trim();
      const stock = !isNaN(parseInt(row.stock, 10)) ? parseInt(row.stock, 10) : 0;
      const minStock = !isNaN(parseInt(row.minimum_stock, 10)) ? parseInt(row.minimum_stock, 10) : 5;

      // 7. Auto Image Mapping with product code: SP000123.webp
      let image = String(row.image || '').trim();
      if (!image && code) {
        // Check if file exists in /uploads/
        const webpName = `${code}.webp`;
        const jpgName = `${code}.jpg`;
        if (fs.existsSync(path.join(uploadsDir, webpName))) {
          image = `/uploads/${webpName}`;
        } else if (fs.existsSync(path.join(uploadsDir, jpgName))) {
          image = `/uploads/${jpgName}`;
        } else {
          image = `/uploads/${code}.webp`; // standard anticipated path
        }
      }

      let image2 = String(row.image2 || '').trim();
      if (!image2 && code && fs.existsSync(path.join(uploadsDir, `${code}_2.webp`))) {
        image2 = `/uploads/${code}_2.webp`;
      }

      if (errors.length > 0) {
        rowErrors.push({
          row: rowNum,
          product_code: code || 'N/A',
          name: name || 'N/A',
          errors,
        });
      } else {
        validRows.push({
          product_code: code,
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${code.toLowerCase()}`,
          category_id: categoryId,
          brand_id: brandId,
          original_price: originalPrice,
          selling_price: sellingPrice,
          tax_percent: taxPercent,
          unit,
          stock,
          minimum_stock: minStock,
          description: row.description || '',
          image,
          image2,
          status: row.status || 'ACTIVE',
        });
      }
    }

    // If there are row-level errors, stop and report them clearly
    if (rowErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation failed: Found ${rowErrors.length} errors in the uploaded file. No records were imported.`,
        errors: rowErrors,
        totalSubmitted: products.length,
        validCount: validRows.length,
        errorCount: rowErrors.length,
      });
    }

    // Execute atomic batch insert
    const importedCount = await db.transaction(async (tx) => {
      let count = 0;
      for (const item of validRows) {
        const res = await tx.run(
          `INSERT INTO products (
            product_code, slug, name, category_id, brand_id, original_price, selling_price,
            tax_percent, unit, stock, minimum_stock, description, image, image2, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.product_code,
            item.slug,
            item.name,
            item.category_id,
            item.brand_id,
            item.original_price,
            item.selling_price,
            item.tax_percent,
            item.unit,
            item.stock,
            item.minimum_stock,
            item.description,
            item.image,
            item.image2,
            item.status,
          ]
        );

        const newId = res.lastInsertRowid;
        if (item.stock > 0) {
          await tx.run(
            `INSERT INTO inventory_transactions (
              product_id, type, quantity, previous_stock, new_stock, reference_type, reference_id, user_id, note
            ) VALUES (?, 'IN', ?, 0, ?, 'BULK_IMPORT', ?, ?, 'Batch bulk imported product')`,
            [newId, item.stock, item.stock, String(newId), req.user.id]
          );
        }
        count++;
      }
      return count;
    });

    return res.json({
      success: true,
      message: `Successfully imported ${importedCount} products into the catalog!`,
      importedCount,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export default {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
  bulkImportProducts,
};
