import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [count, setCount] = useState(0);
  const [cartId, setCartId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [user]);

  async function fetchCart() {
    setLoading(true);
    try {
      const res = await client.get('/cart');
      if (res.success && res.data) {
        setCartId(res.data.cartId);
        setItems(res.data.items || []);
        setSubtotal(res.data.subtotal || 0);
        setCount(res.data.count || 0);
      }
    } catch (err) {
      console.warn('Failed to load cart:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addToCart(productId, quantity = 1) {
    try {
      const res = await client.post('/cart/add', { productId, quantity });
      if (res.success && res.data) {
        setItems(res.data.items || []);
        setSubtotal(res.data.subtotal || 0);
        setCount(res.data.count || 0);
        setIsDrawerOpen(true);
        return res.data;
      }
    } catch (err) {
      alert(err.message);
      throw err;
    }
  }

  async function updateQuantity(productId, quantity) {
    try {
      const res = await client.put('/cart/update', { productId, quantity });
      if (res.success && res.data) {
        setItems(res.data.items || []);
        setSubtotal(res.data.subtotal || 0);
        setCount(res.data.count || 0);
        return res.data;
      }
    } catch (err) {
      alert(err.message);
      throw err;
    }
  }

  function clearCart() {
    setItems([]);
    setSubtotal(0);
    setCount(0);
  }

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        count,
        cartId,
        loading,
        isDrawerOpen,
        setIsDrawerOpen,
        addToCart,
        updateQuantity,
        clearCart,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

export default CartContext;
