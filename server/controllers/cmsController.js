import db from '../../database/connection.js';

/**
 * Public: Get active sliders within valid date range
 */
export async function getSliders(req, res) {
  try {
    const sliders = await db.query(`
      SELECT * FROM home_sliders 
      WHERE status = 'ACTIVE'
        AND (start_date IS NULL OR start_date = '' OR DATE(start_date) <= DATE('now'))
        AND (end_date IS NULL OR end_date = '' OR DATE(end_date) >= DATE('now'))
      ORDER BY sort_order ASC, id ASC
    `);
    return res.json({ success: true, data: sliders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Admin: Get all sliders
 */
export async function getAdminSliders(req, res) {
  try {
    const sliders = await db.query('SELECT * FROM home_sliders ORDER BY sort_order ASC, id ASC');
    return res.json({ success: true, data: sliders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Admin: Create slider
 */
export async function createSlider(req, res) {
  try {
    const {
      title,
      subtitle,
      image,
      mobile_image,
      button_text,
      button_url,
      link_url,
      start_date,
      end_date,
      sort_order = 0,
      status = 'ACTIVE',
    } = req.body;

    if (!title || !image) {
      return res.status(400).json({ success: false, message: 'Title and Desktop Image are required' });
    }

    const finalUrl = button_url || link_url || '/shop';

    const result = await db.run(
      `INSERT INTO home_sliders (
        title, subtitle, image, mobile_image, button_text, link_url,
        start_date, end_date, sort_order, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        subtitle ? subtitle.trim() : null,
        image,
        mobile_image || null,
        button_text ? button_text.trim() : 'Shop Now',
        finalUrl,
        start_date || null,
        end_date || null,
        Number(sort_order) || 0,
        status || 'ACTIVE',
      ]
    );

    const created = await db.get('SELECT * FROM home_sliders WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ success: true, data: created, message: 'Slider banner created successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Admin: Update slider
 */
export async function updateSlider(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      image,
      mobile_image,
      button_text,
      button_url,
      link_url,
      start_date,
      end_date,
      sort_order,
      status,
    } = req.body;

    const existing = await db.get('SELECT * FROM home_sliders WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Slider not found' });
    }

    const finalUrl = button_url !== undefined ? button_url : (link_url !== undefined ? link_url : existing.link_url);

    await db.run(
      `UPDATE home_sliders SET
        title = ?, subtitle = ?, image = ?, mobile_image = ?, button_text = ?, link_url = ?,
        start_date = ?, end_date = ?, sort_order = ?, status = ?
       WHERE id = ?`,
      [
        title !== undefined ? title.trim() : existing.title,
        subtitle !== undefined ? (subtitle ? subtitle.trim() : null) : existing.subtitle,
        image !== undefined ? image : existing.image,
        mobile_image !== undefined ? mobile_image : existing.mobile_image,
        button_text !== undefined ? button_text : existing.button_text,
        finalUrl,
        start_date !== undefined ? (start_date || null) : existing.start_date,
        end_date !== undefined ? (end_date || null) : existing.end_date,
        sort_order !== undefined ? Number(sort_order) : existing.sort_order,
        status !== undefined ? status : existing.status,
        id,
      ]
    );

    const updated = await db.get('SELECT * FROM home_sliders WHERE id = ?', [id]);
    return res.json({ success: true, data: updated, message: 'Slider banner updated successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Admin: Delete slider
 */
export async function deleteSlider(req, res) {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM home_sliders WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Slider banner deleted successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Public: Get active pages list for navigation / footer
 */
export async function getPages(req, res) {
  try {
    const pages = await db.query("SELECT id, title, slug, description, image, status FROM pages WHERE status = 'ACTIVE' ORDER BY id ASC");
    return res.json({ success: true, data: pages });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Admin: Get all pages (including drafts/inactive)
 */
export async function getAdminPages(req, res) {
  try {
    const pages = await db.query('SELECT * FROM pages ORDER BY id ASC');
    return res.json({ success: true, data: pages });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Public: Get single page content dynamically by slug
 */
export async function getPageBySlug(req, res) {
  try {
    const { slug } = req.params;
    const page = await db.get(
      "SELECT * FROM pages WHERE (slug = ? OR slug = ?) AND status = 'ACTIVE'",
      [slug, slug.toLowerCase()]
    );
    if (!page) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }
    return res.json({ success: true, data: page });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Admin: Create CMS page
 */
export async function createPage(req, res) {
  try {
    const { title, slug, content, image, description, meta_title, meta_description, status = 'ACTIVE' } = req.body;
    if (!title || !slug || !content) {
      return res.status(400).json({ success: false, message: 'Title, slug, and content are required' });
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const existing = await db.get('SELECT id FROM pages WHERE slug = ?', [cleanSlug]);
    if (existing) {
      return res.status(400).json({ success: false, message: `Page with slug "${cleanSlug}" already exists` });
    }

    const result = await db.run(
      `INSERT INTO pages (title, slug, content, image, description, meta_title, meta_description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        cleanSlug,
        content,
        image || null,
        description || null,
        meta_title || null,
        meta_description || null,
        status || 'ACTIVE',
      ]
    );

    const created = await db.get('SELECT * FROM pages WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ success: true, data: created, message: 'CMS page created successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Admin: Update CMS page
 */
export async function updatePage(req, res) {
  try {
    const { id } = req.params;
    const { title, slug, content, image, description, meta_title, meta_description, status } = req.body;

    const existing = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }

    let cleanSlug = existing.slug;
    if (slug && slug.trim() !== existing.slug) {
      cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      const clash = await db.get('SELECT id FROM pages WHERE slug = ? AND id != ?', [cleanSlug, id]);
      if (clash) {
        return res.status(400).json({ success: false, message: `Slug "${cleanSlug}" already in use by another page` });
      }
    }

    await db.run(
      `UPDATE pages SET 
        title = ?, slug = ?, content = ?, image = ?, description = ?, meta_title = ?, meta_description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title !== undefined ? title.trim() : existing.title,
        cleanSlug,
        content !== undefined ? content : existing.content,
        image !== undefined ? image : existing.image,
        description !== undefined ? description : existing.description,
        meta_title !== undefined ? meta_title : existing.meta_title,
        meta_description !== undefined ? meta_description : existing.meta_description,
        status !== undefined ? status : existing.status,
        id,
      ]
    );

    const updated = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
    return res.json({ success: true, data: updated, message: 'Page updated successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Admin: Delete CMS page
 */
export async function deletePage(req, res) {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT * FROM pages WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }

    // Protect core pages from accidental hard delete
    const coreSlugs = ['about', 'delivery-policy', 'refund-cancellation', 'terms', 'privacy-policy', 'contact'];
    if (coreSlugs.includes(existing.slug)) {
      return res.status(400).json({ success: false, message: `Core policy page "${existing.title}" cannot be deleted. You can set status to INACTIVE instead.` });
    }

    await db.run('DELETE FROM pages WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Page deleted successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  getSliders,
  getAdminSliders,
  createSlider,
  updateSlider,
  deleteSlider,
  getPages,
  getAdminPages,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
};
