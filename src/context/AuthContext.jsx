import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [destination, setDestination] = useState('/account');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check current user
  useEffect(() => {
    checkCurrentUser();
  }, []);

  async function checkCurrentUser() {
    const token = localStorage.getItem('freshmart_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await client.get('/auth/me');
      if (res.success && res.data) {
        setUser(res.data.user);
        setRoles(res.data.roles || []);
        setPermissions(res.data.permissions || []);
        setDestination(res.data.destination || '/account');
        setStats(res.data.stats || null);
      }
    } catch (err) {
      console.warn('Session expired or invalid:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  }

  // Password Login
  async function loginWithPassword(mobile, password) {
    const res = await client.post('/auth/login', { mobile, password });
    if (res.success && res.data) {
      saveSession(res.data);
      return res.data;
    }
    throw new Error(res.message || 'Login failed');
  }

  // Request WhatsApp OTP
  async function requestOtp(mobile) {
    return await client.post('/auth/otp/request', { mobile });
  }

  // Verify OTP
  async function verifyOtp(mobile, otp, name) {
    const res = await client.post('/auth/otp/verify', { mobile, otp, name });
    if (res.success && res.data) {
      saveSession(res.data);
      return res.data;
    }
    throw new Error(res.message || 'OTP verification failed');
  }

  // Register
  async function register(userData) {
    const res = await client.post('/auth/register', userData);
    if (res.success && res.data) {
      saveSession(res.data);
      return res.data;
    }
    throw new Error(res.message || 'Registration failed');
  }

  function saveSession(data) {
    localStorage.setItem('freshmart_token', data.token);
    setUser(data.user);
    setRoles(data.meta?.roles || []);
    setPermissions(data.meta?.permissions || []);
    setDestination(data.meta?.destination || '/account');

    // Trigger cart merge after guest login
    const guestToken = localStorage.getItem('freshmart_guest_token');
    if (guestToken) {
      client.post('/cart/merge', { guestToken }).catch(() => {});
    }
  }

  function logout() {
    localStorage.removeItem('freshmart_token');
    setUser(null);
    setRoles([]);
    setPermissions([]);
    setDestination('/account');
    setStats(null);
  }

  async function updateProfile(profileData) {
    const res = await client.put('/auth/profile', profileData);
    if (res.success && res.data) {
      setUser(res.data);
      return res.data;
    }
    throw new Error(res.message || 'Profile update failed');
  }

  const isStaff = roles.includes('SUPER_ADMIN') || roles.includes('STORE_MANAGER') || roles.includes('CASHIER_POS') || roles.includes('DELIVERY_STAFF');
  const isAdmin = roles.includes('SUPER_ADMIN');

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        permissions,
        destination,
        stats,
        isAuthenticated: Boolean(user),
        isStaff,
        isAdmin,
        loading,
        loginWithPassword,
        requestOtp,
        verifyOtp,
        register,
        logout,
        updateProfile,
        refreshMe: checkCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
