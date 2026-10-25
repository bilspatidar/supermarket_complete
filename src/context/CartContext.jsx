import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
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
  const fetchRequestId = useRef(0);

  useEffect(() => {
    fetchCart();
  }, [user]);

  async function fetchCartDELETE() {
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


async function fetchCart() {
  const requestId = ++fetchRequestId.current;
  setLoading(true);

  try {
    const res = await client.get('/cart');

    // Ignore responses from older requests.
    if (requestId !== fetchRequestId.current) return;

    if (res.success && res.data) {
      setCartId(res.data.cartId);
      setItems(res.data.items || []);
      setSubtotal(res.data.subtotal || 0);
      setCount(res.data.count || 0);
    }
  } catch (err) {
    if (requestId === fetchRequestId.current) {
      console.warn('Failed to load cart:', err.message);
    }
  } finally {
    if (requestId === fetchRequestId.current) {
      setLoading(false);
    }
  }
}


  async function addToCartOpenDrwaser(productId, quantity = 1) {
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
      toast.error(err.message, {
  duration: 2000,
});
      throw err;
    }
  }


async function addToCart(productId, quantity = 1) {
  try {
    const res = await client.post('/cart/add', {
      productId,
      quantity,
    });

    if (res.success && res.data) {
      setItems(res.data.items || []);
      setSubtotal(res.data.subtotal || 0);
      setCount(res.data.count || 0);

      // Do not open the drawer automatically.
      return res.data;
    }
  } catch (err) {
    toast.error(err.message, {
      duration: 2000,
    });
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
          toast.error(err.message, {
          duration: 2000,
        });
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
