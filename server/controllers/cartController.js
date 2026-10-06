import cartService from '../services/cartService.js';

export async function getCart(req, res) {
  try {
    const userId = req.user?.id || null;
    const guestToken = req.headers['x-guest-token'] || req.query.guestToken || null;
    const cart = await cartService.getCartItems({ userId, guestToken });
    return res.json({ success: true, data: cart });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function addToCart(req, res) {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user?.id || null;
    const guestToken = req.headers['x-guest-token'] || req.body.guestToken || null;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const updatedCart = await cartService.addToCart({
      userId,
      guestToken,
      productId: Number(productId),
      quantity: Number(quantity),
    });

    return res.json({ success: true, message: 'Cart updated', data: updatedCart });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateQuantity(req, res) {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user?.id || null;
    const guestToken = req.headers['x-guest-token'] || req.body.guestToken || null;

    if (!productId || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Product ID and quantity are required' });
    }

    const updatedCart = await cartService.updateQuantity({
      userId,
      guestToken,
      productId: Number(productId),
      quantity: Number(quantity),
    });

    return res.json({ success: true, message: 'Cart item updated', data: updatedCart });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function mergeCart(req, res) {
  try {
    const { guestToken } = req.body;
    if (!req.user?.id || !guestToken) {
      return res.status(400).json({ success: false, message: 'User ID and Guest Token are required' });
    }

    await cartService.mergeGuestCart(req.user.id, guestToken);
    const mergedCart = await cartService.getCartItems({ userId: req.user.id });

    return res.json({ success: true, message: 'Cart merged successfully', data: mergedCart });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export default {
  getCart,
  addToCart,
  updateQuantity,
  mergeCart,
};
