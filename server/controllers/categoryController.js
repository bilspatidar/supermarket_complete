import db from '../../database/connection.js';

export async function getCategories(req, res) {
  try {
    const categories = await db.query(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id AND p.status = 'ACTIVE'
       WHERE c.status = 'ACTIVE'
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC`
    );
    return res.json({ success: true, data: categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCategory(req, res) {
  try {
    const { name, description, image, sort_order = 0 } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const result = await db.run(
      'INSERT INTO categories (name, slug, description, image, sort_order) VALUES (?, ?, ?, ?, ?)',
      [name, slug, description || '', image || '', sort_order]
    );

    const created = await db.get('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description, image, sort_order } = req.body;
    await db.run(
      'UPDATE categories SET name = ?, description = ?, image = ?, sort_order = ? WHERE id = ?',
      [name, description, image, sort_order, id]
    );
    const updated = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getBrands(req, res) {
  try {
    const brands = await db.query(
      `SELECT b.*, COUNT(p.id) as product_count
       FROM brands b
       LEFT JOIN products p ON b.id = p.brand_id AND p.status = 'ACTIVE'
       WHERE b.status = 'ACTIVE'
       GROUP BY b.id
       ORDER BY b.name ASC`
    );
    return res.json({ success: true, data: brands });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createBrand(req, res) {
  try {
    const { name, description, logo } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Brand name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const result = await db.run(
      'INSERT INTO brands (name, slug, description, logo) VALUES (?, ?, ?, ?)',
      [name, slug, description || '', logo || '']
    );

    const created = await db.get('SELECT * FROM brands WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  getCategories,
  createCategory,
  updateCategory,
  getBrands,
  createBrand,
};
