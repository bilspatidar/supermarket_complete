import db from '../../database/connection.js';



export async function getPublicSettings(req, res) {
  try {
    const rows = await db.query(`
      SELECT
        setting_key AS \`key\`,
        value,
        type,
        group_name
      FROM store_settings
      WHERE setting_key NOT LIKE '%secret%'
        AND setting_key NOT LIKE '%token%'
    `);

    const settings = {};

    rows.forEach((row) => {
      let value = row.key !== undefined ? row.value : null;

      if (row.type === 'boolean') {
        value =
          value === true ||
          value === 1 ||
          value === '1' ||
          value === 'true';
      } else if (row.type === 'number') {
        value = Number(value);

        if (Number.isNaN(value)) {
          value = 0;
        }
      } else if (row.type === 'json') {
        try {
          value = value ? JSON.parse(value) : null;
        } catch {
          value = null;
        }
      }

      settings[row.key] = value;
    });

    return res.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    console.error('getPublicSettings error:', err);

    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load public settings',
    });
  }
}


export async function getAllSettings(req, res) {
  try {
    const rows = await db.query(`
      SELECT
        setting_key AS \`key\`,
        value,
        type,
        group_name
      FROM store_settings
      ORDER BY group_name ASC, setting_key ASC
    `);

    const settings = rows.map((row) => {
      let value = row.value;

      if (row.type === 'boolean') {
        value =
          value === true ||
          value === 1 ||
          value === '1' ||
          value === 'true';
      } else if (row.type === 'number') {
        value = Number(value);

        if (Number.isNaN(value)) {
          value = 0;
        }
      } else if (row.type === 'json') {
        try {
          value = value ? JSON.parse(value) : null;
        } catch {
          value = null;
        }
      }

      return {
        key: row.key,
        value,
        type: row.type,
        group_name: row.group_name,
      };
    });

    return res.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    console.error('getAllSettings error:', err);

    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load settings',
    });
  }
}



export async function updateSettings(req, res) {
  try {
    const { settings = {} } = req.body;

    for (const [key, val] of Object.entries(settings)) {
      const strVal =
        val !== null && typeof val === 'object'
          ? JSON.stringify(val)
          : String(val);

      await db.run(
        `INSERT INTO store_settings (
          setting_key,
          value,
          updated_at
        )
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          value = VALUES(value),
          updated_at = CURRENT_TIMESTAMP`,
        [key, strVal]
      );
    }

    return res.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (err) {
    console.error('updateSettings error:', err);

    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update settings',
    });
  }
}


export default {
  getPublicSettings,
  getAllSettings,
  updateSettings,
};
