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


async function checkCurrentUserDELETE() {
  const token = localStorage.getItem('freshmart_token');

  if (!token) {
    setLoading(false);
    return;
  }

  try {
    const res = await client.get('/auth/me');

    if (res.success && res.data) {

      const apiUser = res.data.user;

      if (apiUser) {
        

        setUser(apiUser);
      } else {
        console.error('User object missing from /auth/me response');
      }

      setRoles(res.data.roles || []);
      setPermissions(res.data.permissions || []);
      setDestination(res.data.destination || '/account');
      setStats(res.data.stats || null);
    }
} catch (err) {
  console.warn('Failed to restore session:', err.message);

  // Only clear the session if the server explicitly rejects
  // the authentication token.
  if (err.status === 401 || err.status === 403) {
    logout();
  }
} finally {
  setLoading(false);
}
}



async function checkCurrentUser() {
  const token = localStorage.getItem('freshmart_token');

  if (!token) {
    setLoading(false);
    return;
  }

  try {
    const res = await client.get('/auth/me');

    if (res.success && res.data) {
      const apiUser = res.data.user;

      if (!apiUser || apiUser.status === 'DELETED') {
        logout();
        return;
      }

      setUser(apiUser);
      setRoles(res.data.roles || []);
      setPermissions(res.data.permissions || []);
      setDestination(res.data.destination || '/account');
      setStats(res.data.stats || null);
    } else {
      logout();
    }
  } catch (err) {
    console.warn('Failed to restore session:', err.message);

    const status = err.status || err.response?.status;

    if (status === 401 || status === 403) {
      logout();
    }
  } finally {
    setLoading(false);
  }
}


  // Password Login
async function loginWithPassword(mobile, password) {
  const res = await client.post('/auth/login', { mobile, password });

  if (res.success && res.data) {
    await saveSession(res.data);
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
    await saveSession(res.data);
    return res.data;
  }

  throw new Error(res.message || 'OTP verification failed');
}

  // Register
async function register(userData) {
  const res = await client.post('/auth/register', userData);

  if (res.success && res.data) {
    await saveSession(res.data);
    return res.data;
  }

  throw new Error(res.message || 'Registration failed');
}



async function saveSessionDELETE(data) {
  // Save authentication before making authenticated requests.
  localStorage.setItem('freshmart_token', data.token);

  setUser(data.user);
  setRoles(data.meta?.roles || []);
  setPermissions(data.meta?.permissions || []);
  setDestination(data.meta?.destination || '/account');

  const guestToken = localStorage.getItem('freshmart_guest_token');

  if (guestToken) {
    try {
      const mergeRes = await client.post('/cart/merge', { guestToken });

      if (!mergeRes.success) {
        console.error('Guest cart merge failed:', mergeRes.message);
      }
    } catch (err) {
      console.error('Guest cart merge request failed:', err);
    }
  }

  return data;
}



async function saveSession(data) {
  // Save authentication first so /cart/merge is authenticated.
  localStorage.setItem('freshmart_token', data.token);

  const guestToken = localStorage.getItem('freshmart_guest_token');

  if (guestToken) {
    try {
      const mergeRes = await client.post('/cart/merge', { guestToken });

      if (!mergeRes?.success) {
        throw new Error(mergeRes?.message || 'Guest cart merge failed');
      }

      // Remove the guest token only after a confirmed merge.
      localStorage.removeItem('freshmart_guest_token');
    } catch (err) {
      console.error('Guest cart merge failed:', err);

      // Keep the guest token so the merge can be retried.
      // Do not silently discard guest cart items.
    }
  }

  // Update user state after the merge request finishes.
  setUser(data.user);
  setRoles(data.meta?.roles || []);
  setPermissions(data.meta?.permissions || []);
  setDestination(data.meta?.destination || '/account');

  return data;
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
    const updatedUser = res.data.user || res.data;

    setUser((previousUser) => ({
      ...previousUser,
      ...updatedUser,
    }));

    return updatedUser;
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
