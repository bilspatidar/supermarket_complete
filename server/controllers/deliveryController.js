import db from '../../database/connection.js';

export async function getDeliveryZones(req, res) {
  try {
    const areas = await db.query("SELECT * FROM delivery_areas WHERE status = 'ACTIVE' ORDER BY sort_order ASC, name ASC");
    const subAreas = await db.query("SELECT * FROM delivery_sub_areas WHERE status = 'ACTIVE' ORDER BY sort_order ASC, name ASC");
    const slots = await db.query("SELECT * FROM delivery_slots WHERE status = 'ACTIVE' ORDER BY sort_order ASC");

    const zones = areas.map(area => {
      const children = subAreas
        .filter(sub => sub.area_id === area.id)
        .map(sub => ({
          ...sub,
          effective_delivery_charge: sub.delivery_charge !== null ? sub.delivery_charge : area.delivery_charge,
          effective_free_minimum: sub.free_delivery_minimum !== null ? sub.free_delivery_minimum : area.free_delivery_minimum,
          effective_minimum_order: sub.minimum_order !== null ? sub.minimum_order : area.minimum_order,
          effective_start_time: sub.start_time || area.start_time,
          effective_end_time: sub.end_time || area.end_time,
        }));

      return {
        ...area,
        sub_areas: children,
      };
    });

    return res.json({
      success: true,
      data: {
        zones,
        slots,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function validateEligibility(req, res) {
  try {
    const { areaId, subAreaId, subtotal = 0 } = req.body;
    if (!areaId || !subAreaId) {
      return res.status(400).json({ success: false, message: 'Area and Sub-Area IDs are required' });
    }

    const area = await db.get("SELECT * FROM delivery_areas WHERE id = ? AND status = 'ACTIVE'", [areaId]);
    if (!area) {
      return res.status(400).json({ success: false, message: 'Delivery area not found or inactive' });
    }

    const subArea = await db.get(
      "SELECT * FROM delivery_sub_areas WHERE id = ? AND area_id = ? AND status = 'ACTIVE'",
      [subAreaId, areaId]
    );
    if (!subArea) {
      return res.status(400).json({ success: false, message: 'Delivery sub-area not found or inactive' });
    }

    const startTime = subArea.start_time || area.start_time || '00:00';
    const endTime = subArea.end_time || area.end_time || '23:59';

    const now = new Date();
    const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isWithinHours = curTime >= startTime && curTime <= endTime;

    const charge = subArea.delivery_charge !== null ? subArea.delivery_charge : area.delivery_charge;
    const freeMin = subArea.free_delivery_minimum !== null ? subArea.free_delivery_minimum : area.free_delivery_minimum;
    const minOrder = subArea.minimum_order !== null ? subArea.minimum_order : area.minimum_order;

    const meetsMinOrder = Number(subtotal) >= Number(minOrder);
    const isFreeDelivery = Number(subtotal) >= Number(freeMin);
    const effectiveFee = isFreeDelivery ? 0 : Number(charge);

    return res.json({
      success: true,
      data: {
        eligible: isWithinHours && meetsMinOrder,
        isWithinHours,
        meetsMinOrder,
        minOrder,
        charge: effectiveFee,
        standardCharge: Number(charge),
        freeDeliveryMinimum: Number(freeMin),
        isFreeDelivery,
        hours: {
          start: startTime,
          end: endTime,
          currentTime: curTime,
        },
      },
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function createArea(req, res) {
  try {
    const { name, delivery_charge = 40, free_delivery_minimum = 499, minimum_order = 199, start_time = '08:00', end_time = '22:00' } = req.body;
    const result = await db.run(
      `INSERT INTO delivery_areas (name, delivery_charge, free_delivery_minimum, minimum_order, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, delivery_charge, free_delivery_minimum, minimum_order, start_time, end_time]
    );
    const created = await db.get('SELECT * FROM delivery_areas WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function createSubArea(req, res) {
  try {
    const { area_id, name, delivery_charge = null, free_delivery_minimum = null, minimum_order = null, start_time = null, end_time = null } = req.body;
    const result = await db.run(
      `INSERT INTO delivery_sub_areas (area_id, name, delivery_charge, free_delivery_minimum, minimum_order, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [area_id, name, delivery_charge, free_delivery_minimum, minimum_order, start_time, end_time]
    );
    const created = await db.get('SELECT * FROM delivery_sub_areas WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  getDeliveryZones,
  validateEligibility,
  createArea,
  createSubArea,
};
