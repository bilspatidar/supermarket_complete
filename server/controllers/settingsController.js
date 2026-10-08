import db from '../../database/connection.js';

export async function getPublicSettings(req, res) {
  try {
    const rows = await db.query(
      `SELECT setting_key as key, value, type, group_name FROM store_settings 
       WHERE setting_key NOT LIKE '%secret%' AND setting_key NOT LIKE '%token%'`
    );
    const settings = {};
    rows.forEach(r => {
      let val = r.value;
      if (r.type === 'boolean') val = val === 'true';
      if (r.type === 'number') val = Number(val);
      settings[r.key] = val;
    });

    return res.json({ success: true, data: settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAllSettings(req, res) {
  try {
    const rows = await db.query('SELECT setting_key as key, value, type, group_name FROM store_settings');
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateSettings(req, res) {
  try {
    const { settings = {} } = req.body;

    for (const [key, val] of Object.entries(settings)) {
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      await db.run(
        `INSERT INTO store_settings (setting_key, value, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(setting_key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
        [key, strVal, strVal]
      );
    }

    return res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  getPublicSettings,
  getAllSettings,
  updateSettings,
};
