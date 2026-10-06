import db from '../../database/connection.js';

export async function getTransactions(req, res) {
  try {
    const { productId, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereSql = '';
    const args = [];
    if (productId) {
      whereSql = 'WHERE it.product_id = ?';
      args.push(productId);
    }

    const countRow = await db.get(
      `SELECT COUNT(it.id) as total FROM inventory_transactions it ${whereSql}`,
      args
    );

    const transactions = await db.query(
      `SELECT it.*, p.name as product_name, p.product_code, p.unit, u.name as user_name
       FROM inventory_transactions it
       JOIN products p ON it.product_id = p.id
       LEFT JOIN users u ON it.user_id = u.id
       ${whereSql}
       ORDER BY it.id DESC
       LIMIT ? OFFSET ?`,
      [...args, Number(limit), offset]
    );

    return res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total: Number(countRow?.total || 0),
          page: Number(page),
          limit: Number(limit),
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function adjustInventory(req, res) {
  try {
    const { productId, type = 'ADJUSTMENT', quantity, note = 'Manual stock adjustment' } = req.body;
    if (!productId || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Product ID and quantity are required' });
    }

    const qty = Number(quantity);
    const prod = await db.get('SELECT id, name, stock FROM products WHERE id = ?', [productId]);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const previousStock = prod.stock;
    const newStock = previousStock + qty;
    if (newStock < 0) {
      return res.status(400).json({ success: false, message: 'Resulting stock cannot be negative' });
    }

    await db.transaction(async (tx) => {
      await tx.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, productId]);
      await tx.run(
        `INSERT INTO inventory_transactions (
          product_id, type, quantity, previous_stock, new_stock, reference_type, reference_id, user_id, note
        ) VALUES (?, ?, ?, ?, ?, 'MANUAL_ADJUSTMENT', ?, ?, ?)`,
        [productId, type, Math.abs(qty), previousStock, newStock, `MANUAL-${Date.now()}`, req.user.id, note]
      );
    });

    const updated = await db.get('SELECT id, name, stock FROM products WHERE id = ?', [productId]);
    return res.json({
      success: true,
      message: `Stock updated for ${prod.name} from ${previousStock} to ${newStock}`,
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export default {
  getTransactions,
  adjustInventory,
};
