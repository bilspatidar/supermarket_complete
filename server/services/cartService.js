import db from '../../database/connection.js';

class CartService {
  /**
   * Get or create Cart by user_id or guest_token
   */
  async getOrCreateCart({ userId = null, guestToken = null }) {
    let cart = null;

    if (userId) {
      cart = await db.get('SELECT * FROM carts WHERE user_id = ?', [userId]);
      if (!cart) {
        const res = await db.run('INSERT INTO carts (user_id) VALUES (?)', [userId]);
        cart = await db.get('SELECT * FROM carts WHERE id = ?', [res.lastInsertRowid]);
      }
    } else if (guestToken) {
      cart = await db.get('SELECT * FROM carts WHERE guest_token = ?', [guestToken]);
      if (!cart) {
        const res = await db.run('INSERT INTO carts (guest_token) VALUES (?)', [guestToken]);
        cart = await db.get('SELECT * FROM carts WHERE id = ?', [res.lastInsertRowid]);
      }
    }

    return cart;
  }

  /**
   * Get Cart with populated product details and current prices
   */
  async getCartItems({ userId = null, guestToken = null }) {
    const cart = await this.getOrCreateCart({ userId, guestToken });
    if (!cart) return { cartId: null, items: [], subtotal: 0, count: 0 };

    const items = await db.query(
      `SELECT ci.id as cart_item_id, ci.product_id, ci.quantity,
              p.product_code, p.name, p.slug, p.selling_price, p.original_price,
              p.tax_percent, p.unit, p.stock, p.image, p.status
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cart.id]
    );

    let subtotal = 0;
    let count = 0;

    const formatted = items.map(item => {
      const price = Number(item.selling_price);
      const qty = Number(item.quantity);
      subtotal += price * qty;
      count += qty;
      return {
        ...item,
        line_total: Math.round(price * qty * 100) / 100,
        in_stock: item.stock >= item.quantity,
      };
    });

    return {
      cartId: cart.id,
      items: formatted,
      subtotal: Math.round(subtotal * 100) / 100,
      count,
    };
  }

  /**
   * Add or update quantity of product in Cart
   */
  async addToCart({ userId = null, guestToken = null, productId, quantity = 1 }) {
    const product = await db.get("SELECT * FROM products WHERE id = ? AND status = 'ACTIVE'", [productId]);
    if (!product) {
      throw new Error('Product not found or unavailable');
    }

    const cart = await this.getOrCreateCart({ userId, guestToken });

    const existing = await db.get(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cart.id, productId]
    );

    const newQty = existing ? existing.quantity + quantity : quantity;
    if (newQty <= 0) {
      if (existing) {
        await db.run('DELETE FROM cart_items WHERE id = ?', [existing.id]);
      }
    } else {
      if (newQty > product.stock) {
        throw new Error(`Only ${product.stock} units available in stock`);
      }

      if (existing) {
        await db.run('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQty, existing.id]);
      } else {
        await db.run('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [cart.id, productId, newQty]);
      }
    }

    return await this.getCartItems({ userId, guestToken });
  }

  /**
   * Set exact quantity
   */
  async updateQuantity({ userId = null, guestToken = null, productId, quantity }) {
    const cart = await this.getOrCreateCart({ userId, guestToken });
    const product = await db.get('SELECT stock FROM products WHERE id = ?', [productId]);

    if (!product) throw new Error('Product not found');

    if (quantity <= 0) {
      await db.run('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, productId]);
    } else {
      if (quantity > product.stock) {
        throw new Error(`Only ${product.stock} units available in stock`);
      }
      await db.run(
        `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
         ON CONFLICT(cart_id, product_id) DO UPDATE SET quantity = ?, updated_at = CURRENT_TIMESTAMP`,
        [cart.id, productId, quantity, quantity]
      );
    }

    return await this.getCartItems({ userId, guestToken });
  }

  /**
   * Merge Guest Cart into Customer Cart upon login
   */
  async mergeGuestCart(userId, guestToken) {
    if (!guestToken) return;

    const guestCart = await db.get('SELECT id FROM carts WHERE guest_token = ?', [guestToken]);
    if (!guestCart) return;

    const guestItems = await db.query('SELECT product_id, quantity FROM cart_items WHERE cart_id = ?', [guestCart.id]);
    if (guestItems.length === 0) {
      await db.run('DELETE FROM carts WHERE id = ?', [guestCart.id]);
      return;
    }

    const userCart = await this.getOrCreateCart({ userId });

    await db.transaction(async (tx) => {
      for (const item of guestItems) {
        const prod = await tx.get('SELECT stock FROM products WHERE id = ?', [item.product_id]);
        if (!prod || prod.stock <= 0) continue;

        const existing = await tx.get(
          'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
          [userCart.id, item.product_id]
        );

        if (existing) {
          const combinedQty = Math.min(existing.quantity + item.quantity, prod.stock);
          await tx.run('UPDATE cart_items SET quantity = ? WHERE id = ?', [combinedQty, existing.id]);
        } else {
          const addQty = Math.min(item.quantity, prod.stock);
          await tx.run('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [userCart.id, item.product_id, addQty]);
        }
      }

      // Cleanup guest cart
      await tx.run('DELETE FROM cart_items WHERE cart_id = ?', [guestCart.id]);
      await tx.run('DELETE FROM carts WHERE id = ?', [guestCart.id]);
    });
  }
}

export default new CartService();
