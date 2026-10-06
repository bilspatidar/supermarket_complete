import db from '../../database/connection.js';
import storageService from '../integrations/storage/StorageService.js';

export async function getProducts(req, res) {
  try {
    const {
      search = '',
      category = '',
      brand = '',
      status = 'ACTIVE',
      featured = '',
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    const args = [];

    if (status && status !== 'ALL') {
      conditions.push('p.status = ?');
      args.push(status);
    }

    if (featured === '1' || featured === 'true') {
      conditions.push('p.featured = 1');
    }

    if (category) {
      conditions.push('(c.slug = ? OR c.id = ?)');
      args.push(category, category);
    }

    if (brand) {
      conditions.push('(b.slug = ? OR b.id = ?)');
      args.push(brand, brand);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push('(p.name LIKE ? OR p.product_code LIKE ? OR p.description LIKE ? OR c.name LIKE ? OR b.name LIKE ?)');
      args.push(q, q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await db.get(
      `SELECT COUNT(p.id) as total
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN brands b ON p.brand_id = b.id
       ${whereClause}`,
      args
    );

    const total = Number(countRow?.total || 0);

    const products = await db.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug,
              b.name as brand_name, b.slug as brand_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN brands b ON p.brand_id = b.id
       ${whereClause}
       ORDER BY p.sort_order ASC, p.id DESC
       LIMIT ? OFFSET ?`,
      [...args, Number(limit), offset]
    );

    return res.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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
      image = '',
      image2 = '',
      status = 'ACTIVE',
      featured = 0,
    } = req.body;

    if (!name || !category_id || original_price === undefined || selling_price === undefined) {
      return res.status(400).json({ success: false, message: 'Name, Category, and Prices are required' });
    }

    // Generate unique product_code if not supplied
    const countRow = await db.get('SELECT COUNT(id) as count FROM products');
    const seq = (Number(countRow?.count || 0) + 1).toString().padStart(6, '0');
    const productCode = req.body.product_code || `SP${seq}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Date.now().toString().slice(-4)}`;

    const result = await db.transaction(async (tx) => {
      const resInsert = await tx.run(
        `INSERT INTO products (
          product_code, name, slug, category_id, brand_id, original_price,
          selling_price, tax_percent, unit, stock, minimum_stock, description,
          image, image2, status, featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productCode,
          name,
          slug,
          category_id,
          brand_id || null,
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
          featured ? 1 : 0,
        ]
      );

      const newId = resInsert.lastInsertRowid;

      // Add inventory transaction
      if (Number(stock) > 0) {
        await tx.run(
          `INSERT INTO inventory_transactions (
            product_id, type, quantity, previous_stock, new_stock, reference_type, reference_id, user_id, note
          ) VALUES (?, 'PURCHASE', ?, 0, ?, 'INITIAL_BATCH', 'NEW_PRODUCT', ?, 'Initial opening stock')`,
          [newId, stock, stock, req.user?.id || 1]
        );
      }

      return newId;
    });

    const created = await db.get('SELECT * FROM products WHERE id = ?', [result]);
    return res.status(201).json({ success: true, message: 'Product created successfully', data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

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
      image,
      image2,
      status,
      featured,
    } = req.body;

    await db.run(
      `UPDATE products SET
        name = ?, category_id = ?, brand_id = ?, original_price = ?,
        selling_price = ?, tax_percent = ?, unit = ?, minimum_stock = ?,
        description = ?, image = ?, image2 = ?, status = ?, featured = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || existing.name,
        category_id || existing.category_id,
        brand_id !== undefined ? brand_id : existing.brand_id,
        original_price !== undefined ? original_price : existing.original_price,
        selling_price !== undefined ? selling_price : existing.selling_price,
        tax_percent !== undefined ? tax_percent : existing.tax_percent,
        unit || existing.unit,
        minimum_stock !== undefined ? minimum_stock : existing.minimum_stock,
        description !== undefined ? description : existing.description,
        image || existing.image,
        image2 || existing.image2,
        status || existing.status,
        featured !== undefined ? (featured ? 1 : 0) : existing.featured,
        id,
      ]
    );

    const updated = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    await db.run("UPDATE products SET status = 'INACTIVE' WHERE id = ?", [id]);
    return res.json({ success: true, message: 'Product marked inactive successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const publicUrl = await storageService.saveFile(req.file);
    return res.json({ success: true, url: publicUrl });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
};
