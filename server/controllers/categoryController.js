import db from '../../database/connection.js';
import storageService from '../integrations/storage/StorageService.js';

/**
 * -------------------------------------------------------------
 * CATEGORIES CRUD
 * -------------------------------------------------------------
 */

export async function getCategories(req, res) {
  try {
    const { includeInactive } = req.query;
    const filterSql = includeInactive === 'true' ? '' : "WHERE c.status = 'ACTIVE'";

    const categories = await db.query(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id AND p.status = 'ACTIVE'
       ${filterSql}
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
    const { name, description, image, sort_order = 0, status = 'ACTIVE' } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingSlug = await db.get('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const result = await db.run(
      'INSERT INTO categories (name, slug, description, image, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), slug, description || '', image || '', status, Number(sort_order)]
    );

    const created = await db.get('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ success: true, message: 'Category created successfully', data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description, image, sort_order, status } = req.body;

    const existing = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await db.run(
      `UPDATE categories 
       SET name = ?, description = ?, image = ?, sort_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        name !== undefined ? name.trim() : existing.name,
        description !== undefined ? description : existing.description,
        image !== undefined ? image : existing.image,
        sort_order !== undefined ? Number(sort_order) : existing.sort_order,
        status !== undefined ? status : existing.status,
        id,
      ]
    );

    const updated = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Category updated successfully', data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function toggleCategoryStatus(req, res) {
  try {
    const { id } = req.params;
    const cat = await db.get('SELECT id, status FROM categories WHERE id = ?', [id]);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

    const newStatus = cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await db.run('UPDATE categories SET status = ? WHERE id = ?', [newStatus, id]);

    return res.json({ success: true, message: `Category status updated to ${newStatus}`, status: newStatus });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    // Check if category has active products
    const prodCount = await db.get(
      "SELECT COUNT(id) as count FROM products WHERE category_id = ? AND status = 'ACTIVE'",
      [id]
    );

    if (prodCount?.count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It currently has ${prodCount.count} active products. Reassign or disable products first.`,
      });
    }

    await db.run('DELETE FROM categories WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * -------------------------------------------------------------
 * BRANDS CRUD
 * -------------------------------------------------------------
 */

export async function getBrands(req, res) {
  try {
    const { includeInactive } = req.query;
    const filterSql = includeInactive === 'true' ? '' : "WHERE b.status = 'ACTIVE'";

    const brands = await db.query(
      `SELECT b.*, COUNT(p.id) as product_count
       FROM brands b
       LEFT JOIN products p ON b.id = p.brand_id AND p.status = 'ACTIVE'
       ${filterSql}
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
    const { name, description, logo, status = 'ACTIVE' } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Brand name is required' });

    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingSlug = await db.get('SELECT id FROM brands WHERE slug = ?', [slug]);
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const result = await db.run(
      'INSERT INTO brands (name, slug, description, logo, status) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), slug, description || '', logo || '', status]
    );

    const created = await db.get('SELECT * FROM brands WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ success: true, message: 'Brand created successfully', data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateBrand(req, res) {
  try {
    const { id } = req.params;
    const { name, description, logo, status } = req.body;

    const existing = await db.get('SELECT * FROM brands WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    await db.run(
      `UPDATE brands 
       SET name = ?, description = ?, logo = ?, status = ?
       WHERE id = ?`,
      [
        name !== undefined ? name.trim() : existing.name,
        description !== undefined ? description : existing.description,
        logo !== undefined ? logo : existing.logo,
        status !== undefined ? status : existing.status,
        id,
      ]
    );

    const updated = await db.get('SELECT * FROM brands WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Brand updated successfully', data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function toggleBrandStatus(req, res) {
  try {
    const { id } = req.params;
    const brand = await db.get('SELECT id, status FROM brands WHERE id = ?', [id]);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

    const newStatus = brand.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await db.run('UPDATE brands SET status = ? WHERE id = ?', [newStatus, id]);

    return res.json({ success: true, message: `Brand status updated to ${newStatus}`, status: newStatus });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteBrand(req, res) {
  try {
    const { id } = req.params;

    const prodCount = await db.get(
      "SELECT COUNT(id) as count FROM products WHERE brand_id = ? AND status = 'ACTIVE'",
      [id]
    );

    if (prodCount?.count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete brand. It currently has ${prodCount.count} active products. Reassign or disable products first.`,
      });
    }

    await db.run('DELETE FROM brands WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Brand deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export default {
  getCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
  getBrands,
  createBrand,
  updateBrand,
  toggleBrandStatus,
  deleteBrand,
};
