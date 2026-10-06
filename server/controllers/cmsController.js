import db from '../../database/connection.js';

export async function getSliders(req, res) {
  try {
    const sliders = await db.query("SELECT * FROM home_sliders WHERE status = 'ACTIVE' ORDER BY sort_order ASC");
    return res.json({ success: true, data: sliders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createSlider(req, res) {
  try {
    const { title, subtitle, image, mobile_image, button_text, link_url, sort_order = 0 } = req.body;
    const result = await db.run(
      `INSERT INTO home_sliders (title, subtitle, image, mobile_image, button_text, link_url, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, subtitle, image, mobile_image || image, button_text || 'Shop Now', link_url || '/shop', sort_order]
    );
    const created = await db.get('SELECT * FROM home_sliders WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getPages(req, res) {
  try {
    const pages = await db.query("SELECT id, title, slug, description, status FROM pages WHERE status = 'ACTIVE'");
    return res.json({ success: true, data: pages });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getPageBySlug(req, res) {
  try {
    const { slug } = req.params;
    const page = await db.get("SELECT * FROM pages WHERE slug = ? AND status = 'ACTIVE'", [slug]);
    if (!page) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }
    return res.json({ success: true, data: page });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updatePage(req, res) {
  try {
    const { id } = req.params;
    const { title, content, description, meta_title, meta_description } = req.body;
    await db.run(
      `UPDATE pages SET 
        title = ?, content = ?, description = ?, meta_title = ?, meta_description = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, content, description, meta_title, meta_description, id]
    );
    const updated = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  getSliders,
  createSlider,
  getPages,
  getPageBySlug,
  updatePage,
};
