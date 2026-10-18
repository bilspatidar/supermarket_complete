import db from '../../database/connection.js';


// ============================================================
// GET DELIVERY ZONES
// ============================================================

export async function getDeliveryZones(req, res) {
  try {
    const areas = await db.query(`
      SELECT *
      FROM delivery_areas
      WHERE status = 'ACTIVE'
      ORDER BY sort_order ASC, name ASC
    `);

    const subAreas = await db.query(`
      SELECT *
      FROM delivery_sub_areas
      WHERE status = 'ACTIVE'
      ORDER BY sort_order ASC, name ASC
    `);

    const slots = await db.query(`
      SELECT *
      FROM delivery_slots
      WHERE status = 'ACTIVE'
      ORDER BY sort_order ASC
    `);

    const zones = areas.map((area) => {
      const children = subAreas
        .filter((sub) => sub.area_id === area.id)
        .map((sub) => ({
          ...sub,

          effective_delivery_charge:
            sub.delivery_charge !== null
              ? sub.delivery_charge
              : area.delivery_charge,

          effective_free_minimum:
            sub.free_delivery_minimum !== null
              ? sub.free_delivery_minimum
              : area.free_delivery_minimum,

          effective_minimum_order:
            sub.minimum_order !== null
              ? sub.minimum_order
              : area.minimum_order,

          effective_start_time:
            sub.start_time || area.start_time,

          effective_end_time:
            sub.end_time || area.end_time,
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
    console.error('getDeliveryZones error:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}


// ============================================================
// VALIDATE DELIVERY ELIGIBILITY
// ============================================================

export async function validateEligibility(req, res) {
  try {
    const {
      areaId,
      subAreaId,
      subtotal = 0,
    } = req.body;

    if (!areaId || !subAreaId) {
      return res.status(400).json({
        success: false,
        message: 'Area and Sub-Area IDs are required',
      });
    }

    const area = await db.get(
      `
        SELECT *
        FROM delivery_areas
        WHERE id = ?
          AND status = 'ACTIVE'
      `,
      [areaId]
    );

    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Delivery area not found or inactive',
      });
    }

    const subArea = await db.get(
      `
        SELECT *
        FROM delivery_sub_areas
        WHERE id = ?
          AND area_id = ?
          AND status = 'ACTIVE'
      `,
      [subAreaId, areaId]
    );

    if (!subArea) {
      return res.status(400).json({
        success: false,
        message: 'Delivery sub-area not found or inactive',
      });
    }

    const startTime =
      subArea.start_time ||
      area.start_time ||
      '00:00';

    const endTime =
      subArea.end_time ||
      area.end_time ||
      '23:59';

    const now = new Date();

    const curTime =
      `${String(now.getHours()).padStart(2, '0')}:` +
      `${String(now.getMinutes()).padStart(2, '0')}`;

    const isWithinHours =
      curTime >= startTime &&
      curTime <= endTime;

    const charge =
      subArea.delivery_charge !== null
        ? subArea.delivery_charge
        : area.delivery_charge;

    const freeMin =
      subArea.free_delivery_minimum !== null
        ? subArea.free_delivery_minimum
        : area.free_delivery_minimum;

    const minOrder =
      subArea.minimum_order !== null
        ? subArea.minimum_order
        : area.minimum_order;

    const meetsMinOrder =
      Number(subtotal) >= Number(minOrder);

    const isFreeDelivery =
      Number(subtotal) >= Number(freeMin);

    const effectiveFee =
      isFreeDelivery
        ? 0
        : Number(charge);

    return res.json({
      success: true,
      data: {
        eligible:
          isWithinHours &&
          meetsMinOrder,

        isWithinHours,

        meetsMinOrder,

        minOrder,

        charge: effectiveFee,

        standardCharge: Number(charge),

        freeDeliveryMinimum:
          Number(freeMin),

        isFreeDelivery,

        hours: {
          start: startTime,
          end: endTime,
          currentTime: curTime,
        },
      },
    });
  } catch (err) {
    console.error('validateEligibility error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}


// ============================================================
// CREATE AREA
// ============================================================

export async function createArea(req, res) {
  try {
    const {
      name,
      delivery_charge,
      free_delivery_minimum,
      minimum_order,
      start_time,
      end_time,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Area name is required',
      });
    }

    const result = await db.run(
      `
        INSERT INTO delivery_areas (
          name,
          delivery_charge,
          free_delivery_minimum,
          minimum_order,
          start_time,
          end_time
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        String(name).trim(),
        Number(delivery_charge),
        Number(free_delivery_minimum),
        Number(minimum_order),
        start_time,
        end_time,
      ]
    );

    const created = await db.get(
      `
        SELECT *
        FROM delivery_areas
        WHERE id = ?
      `,
      [result.lastInsertRowid]
    );

    return res.status(201).json({
      success: true,
      data: created,
      message: 'Delivery area created successfully',
    });
  } catch (err) {
    console.error('createArea error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}


// ============================================================
// UPDATE AREA
// ============================================================

export async function updateArea(req, res) {
  try {
    const { id } = req.params;

    const {
      name,
      delivery_charge,
      free_delivery_minimum,
      minimum_order,
      start_time,
      end_time,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Area ID is required',
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Area name is required',
      });
    }

    const existing = await db.get(
      `
        SELECT *
        FROM delivery_areas
        WHERE id = ?
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Delivery area not found',
      });
    }

    await db.run(
      `
        UPDATE delivery_areas
        SET
          name = ?,
          delivery_charge = ?,
          free_delivery_minimum = ?,
          minimum_order = ?,
          start_time = ?,
          end_time = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        String(name).trim(),
        Number(delivery_charge),
        Number(free_delivery_minimum),
        Number(minimum_order),
        start_time,
        end_time,
        id,
      ]
    );

    const updated = await db.get(
      `
        SELECT *
        FROM delivery_areas
        WHERE id = ?
      `,
      [id]
    );

    return res.json({
      success: true,
      data: updated,
      message: 'Delivery area updated successfully',
    });
  } catch (err) {
    console.error('updateArea error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}


// ============================================================
// DELETE AREA
// ============================================================

export async function deleteArea(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Area ID is required',
      });
    }

    const area = await db.get(
      `
        SELECT *
        FROM delivery_areas
        WHERE id = ?
      `,
      [id]
    );

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Delivery area not found',
      });
    }

    // Do NOT silently delete the area's children.
    const subArea = await db.get(
      `
        SELECT id
        FROM delivery_sub_areas
        WHERE area_id = ?
          AND status = 'ACTIVE'
        LIMIT 1
      `,
      [id]
    );

    if (subArea) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot delete this area because it has active sub-areas. Delete the sub-areas first.',
      });
    }

    // Soft delete
    await db.run(
      `
        UPDATE delivery_areas
        SET
          status = 'INACTIVE',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [id]
    );

    return res.json({
      success: true,
      message: 'Delivery area deleted successfully',
    });
  } catch (err) {
    console.error('deleteArea error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}


// ============================================================
// CREATE SUB-AREA
// ============================================================

export async function createSubArea(req, res) {
  try {
    const {
      area_id,
      name,
      delivery_charge = null,
      free_delivery_minimum = null,
      minimum_order = null,
      start_time = null,
      end_time = null,
    } = req.body;

    if (!area_id) {
      return res.status(400).json({
        success: false,
        message: 'Parent area is required',
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Sub-area name is required',
      });
    }

    const area = await db.get(
      `
        SELECT *
        FROM delivery_areas
        WHERE id = ?
          AND status = 'ACTIVE'
      `,
      [area_id]
    );

    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Parent delivery area not found or inactive',
      });
    }

    const result = await db.run(
      `
        INSERT INTO delivery_sub_areas (
          area_id,
          name,
          delivery_charge,
          free_delivery_minimum,
          minimum_order,
          start_time,
          end_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(area_id),
        String(name).trim(),
        delivery_charge !== null && delivery_charge !== ''
          ? Number(delivery_charge)
          : null,
        free_delivery_minimum !== null &&
        free_delivery_minimum !== ''
          ? Number(free_delivery_minimum)
          : null,
        minimum_order !== null && minimum_order !== ''
          ? Number(minimum_order)
          : null,
        start_time || null,
        end_time || null,
      ]
    );

    const created = await db.get(
      `
        SELECT *
        FROM delivery_sub_areas
        WHERE id = ?
      `,
      [result.lastInsertRowid]
    );

    return res.status(201).json({
      success: true,
      data: created,
      message: 'Delivery sub-area created successfully',
    });
  } catch (err) {
    console.error('createSubArea error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}


// ============================================================
// UPDATE SUB-AREA
// ============================================================

export async function updateSubArea(req, res) {
  try {
    const { id } = req.params;

    const {
      area_id,
      name,
      delivery_charge = null,
      free_delivery_minimum = null,
      minimum_order = null,
      start_time = null,
      end_time = null,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Sub-area ID is required',
      });
    }

    if (!area_id) {
      return res.status(400).json({
        success: false,
        message: 'Parent area is required',
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Sub-area name is required',
      });
    }

    const existing = await db.get(
      `
        SELECT *
        FROM delivery_sub_areas
        WHERE id = ?
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Delivery sub-area not found',
      });
    }

    const area = await db.get(
      `
        SELECT *
        FROM delivery_areas
        WHERE id = ?
          AND status = 'ACTIVE'
      `,
      [area_id]
    );

    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Parent delivery area not found or inactive',
      });
    }

    await db.run(
      `
        UPDATE delivery_sub_areas
        SET
          area_id = ?,
          name = ?,
          delivery_charge = ?,
          free_delivery_minimum = ?,
          minimum_order = ?,
          start_time = ?,
          end_time = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        Number(area_id),
        String(name).trim(),

        delivery_charge !== null &&
        delivery_charge !== ''
          ? Number(delivery_charge)
          : null,

        free_delivery_minimum !== null &&
        free_delivery_minimum !== ''
          ? Number(free_delivery_minimum)
          : null,

        minimum_order !== null &&
        minimum_order !== ''
          ? Number(minimum_order)
          : null,

        start_time || null,
        end_time || null,

        id,
      ]
    );

    const updated = await db.get(
      `
        SELECT *
        FROM delivery_sub_areas
        WHERE id = ?
      `,
      [id]
    );

    return res.json({
      success: true,
      data: updated,
      message: 'Delivery sub-area updated successfully',
    });
  } catch (err) {
    console.error('updateSubArea error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}


// ============================================================
// DELETE SUB-AREA
// ============================================================

export async function deleteSubArea(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Sub-area ID is required',
      });
    }

    const subArea = await db.get(
      `
        SELECT *
        FROM delivery_sub_areas
        WHERE id = ?
      `,
      [id]
    );

    if (!subArea) {
      return res.status(404).json({
        success: false,
        message: 'Delivery sub-area not found',
      });
    }

    // Soft delete so historical/order references are not broken.
    await db.run(
      `
        UPDATE delivery_sub_areas
        SET
          status = 'INACTIVE',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [id]
    );

    return res.json({
      success: true,
      message: 'Delivery sub-area deleted successfully',
    });
  } catch (err) {
    console.error('deleteSubArea error:', err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}


// ============================================================
// EXPORT
// ============================================================

export default {
  getDeliveryZones,
  validateEligibility,

  createArea,
  updateArea,
  deleteArea,

  createSubArea,
  updateSubArea,
  deleteSubArea,
};