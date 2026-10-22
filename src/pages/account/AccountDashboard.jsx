import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {X,Banknote, Printer, Eye, User,Key, Lock, Gift, Award, MapPin, Package, Clock, ShieldCheck, ChevronRight, Phone, Mail, Calendar, CheckCircle } from 'lucide-react';
import client from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStoreSettings } from '../../context/StoreSettingsContext';

export default function AccountDashboard({ onNavigate }) {
  const { user, stats, refreshMe, updateProfile } = useAuth();
  const { storeSettings } = useStoreSettings();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'profile', 'bonus', 'membership', 'addresses'
  const [orders, setOrders] = useState([]);
  const [bonusData, setBonusData] = useState({ availableBalance: 0, transactions: [] });
  const [membershipData, setMembershipData] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignDeliveryStaffId, setAssignDeliveryStaffId] = useState('');
  const [modalLoading, setModalLoading] = useState(false);


   const [showDeletionModal, setShowDeletionModal] = useState(false);
   const [deletionReason, setDeletionReason] = useState('');
   const [deletionLoading, setDeletionLoading] = useState(false);
   const [deletionMessage, setDeletionMessage] = useState('');
   const [deletionError, setDeletionError] = useState('');


   

async function handleDeletionRequest() {
  if (deletionLoading) return;

  setDeletionLoading(true);
  setDeletionError('');

  try {
    const response = await client.post('/auth/account-delete-request', {
      reason: deletionReason.trim() || null,
    });

    toast.success(
      response.data?.message ||
        'Your account deletion request has been submitted successfully.',
      { duration: 3000 }
    );

    setShowDeletionModal(false);
    setDeletionReason('');
  } catch (error) {
  const responseData = error?.response?.data;
  const status = error?.response?.status;
  const message = responseData?.message;

  if (
    status === 409 ||
    message === 'You already have an active account deletion request.'
  ) {
    toast.error(
      'You already have an active account deletion request. Our team will review it; you do not need to submit another one.',
      { duration: 4000 }
    );

    setShowDeletionModal(false);
    setDeletionReason('');
  } else {
    toast.error(
      message || 'You already have an active account deletion request.',
      { duration: 3000 }
    );
  }
} finally {
  setDeletionLoading(false);
}
}

  
  

  // Profile edit fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  const [dob, setDob] = useState(user?.dob || '');
  const [anniversaryDate, setAnniversaryDate] = useState(
    user?.anniversary_date || ''
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const dobLocked = Boolean(user?.dob);
  const anniversaryLocked = Boolean(user?.anniversary_date);

  if (user?.account_type === 'INTERNAL') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-md">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Internal Administrative Account</h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          You are signed in with an internal staff/admin profile (<strong>{user?.name}</strong>).
          Internal staff accounts manage supermarket operations through the Admin Console &amp; In-House POS.
          Backend access to customer store accounts and checkout is strictly forbidden for security.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => onNavigate('admin-dashboard')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
          >
            Go to Admin Console &rarr;
          </button>
          <button
            onClick={() => onNavigate('admin-pos')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
          >
            In-House POS &rarr;
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
  setDob(user?.dob ? String(user.dob).slice(0, 10) : '');
  setAnniversaryDate(
    user?.anniversary_date
      ? String(user.anniversary_date).slice(0, 10)
      : ''
  );
}, [user?.dob, user?.anniversary_date]);

useEffect(() => {
  

  setDob(user?.dob ? String(user.dob).slice(0, 10) : '');
  setAnniversaryDate(
    user?.anniversary_date
      ? String(user.anniversary_date).slice(0, 10)
      : ''
  );
}, [user?.dob, user?.anniversary_date]);

  useEffect(() => {
    loadAccountData();
  }, []);

  async function loadAccountData() {
    setLoading(true);
    try {
      const [orderRes, bonusRes, memberRes, addrRes] = await Promise.all([
        client.get('/customer/orders'),
        client.get('/bonus/ledger'),
        client.get('/membership/my-status'),
        client.get('/addresses'),
      ]);

      if (orderRes.success) setOrders(orderRes.data?.orders || []);
      if (bonusRes.success) setBonusData(bonusRes.data || { availableBalance: 0, transactions: [] });
      if (memberRes.success) setMembershipData(memberRes.data || null);
      if (addrRes.success) setAddresses(addrRes.data || []);
      
      setName(user?.name || '');
      setEmail(user?.email || '');
    } catch (err) {
      console.warn('Failed to load account data:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e) {
  e.preventDefault();
  setPasswordMsg('');
  setPasswordError('');

  if (newPassword.length < 8) {
    setPasswordError('Password must be at least 8 characters.');
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordError('New password and confirmation do not match.');
    return;
  }

  setPasswordLoading(true);

  try {
    // This endpoint must be implemented in your backend.
    const res = await client.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });

    if (!res.success) {
      throw new Error(res.message || 'Password change failed.');
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMsg('Password changed successfully.');
  } catch (err) {
    setPasswordError(err.message || 'Password change failed.');
  } finally {
    setPasswordLoading(false);
  }
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  setProfileMsg('');
  setProfileError('');

  const payload = {
    name,
    email: email || null,
  };

  if (!dobLocked && dob) {
    payload.dob = dob;
  }

  if (!anniversaryLocked && anniversaryDate) {
    payload.anniversaryDate = anniversaryDate;
  }

  try {
    await updateProfile(payload);
    await refreshMe();
    setProfileMsg('Profile updated successfully.');
  } catch (err) {
    setProfileError(err.message || 'Failed to update profile.');
  }
}

  function formatDate(dStr) {
    if (!dStr) return 'Not set';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dStr;
    }
  }

    async function viewOrderDetails(orderId) {
    setModalLoading(true);
    try {
      const res = await client.get(`/orders/${orderId}`);
      if (res.success && res.data) {
        setSelectedOrder(res.data);
        setAssignDeliveryStaffId(
          res.data.order.delivery_staff_id ? String(res.data.order.delivery_staff_id) : ''
        );
      }
    } catch (err) {
      toast.error(`Failed to load order details: ${err.message}`, {
      duration: 2000,
    });
      
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Account Hero Summary */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {user?.name}
                </h1>
                {membershipData && (
                  <span className="bg-amber-100 text-amber-900 font-bold text-[10px] px-2 py-0.5 rounded-full border border-amber-300">
                    VIP Member
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="font-mono text-slate-700 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {user?.mobile}
                </span>
                {user?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {user?.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Real Customer Metrics */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 text-center">
            <div>
              <div className="text-lg sm:text-2xl font-black text-slate-900">
                {stats?.totalOrders || orders.length}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Orders
              </div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-black text-emerald-700">
                ₹{stats?.totalSpent || 0}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Spent
              </div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-black text-amber-700">
                ₹{bonusData.availableBalance}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Bonus Credit
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs font-bold border-b border-slate-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'orders' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>My Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'profile' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile &amp; Locked DOB</span>
        </button>

          <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'password' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Key className="w-4 h-4" />
         <span>Manage Password</span>
        </button>


        <button
          onClick={() => setActiveTab('bonus')}
          className={`px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'bonus' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Welcome Bonus Ledger (₹{bonusData.availableBalance})</span>
        </button>

        <button
          onClick={() => setActiveTab('membership')}
          className={`px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'membership' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>VIP Membership</span>
        </button>

        <button
          onClick={() => setActiveTab('addresses')}
          className={`px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'addresses' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Saved Addresses ({addresses.length})</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No orders placed yet</h3>
              <p className="text-xs text-slate-500">
                Explore our catalog and get your groceries delivered to your door.
              </p>
              <button
                onClick={() => onNavigate('shop')}
                className="mt-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          #{ord.order_number}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {ord.source}
                        </span>
                        {ord.locked_at && (
                          <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )} 
                        
                        <button
                          type="button"
                          onClick={() => viewOrderDetails(ord.id)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                      </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Placed on {new Date(ord.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase ${
                        ord.order_status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.order_status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {ord.order_status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Delivery Location</span>
                      <strong className="text-slate-800">{ord.sub_area_name}, {ord.area_name}</strong>
                      <p className="text-[11px] text-slate-500 truncate">{ord.delivery_address}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Payment</span>
                      <strong className="text-slate-800">{ord.payment_method}</strong>
                      <p className="text-[11px] font-semibold text-emerald-700">Status: {ord.payment_status}</p>
                    </div>

                    <div className="sm:text-right">
                      <span className="text-slate-400 block text-[11px]">Grand Total</span>
                      <strong className="text-base font-black text-slate-950">₹{ord.grand_total}</strong>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. PROFILE & LOCKED DOB/ANNIVERSARY TAB */}
 
{activeTab === 'profile' && (
  <div className="w-full max-w-2xl mx-auto">
    <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm">

      {/* Profile Header */}
      <div className="border-b border-slate-100 p-4 sm:p-6 lg:p-8">
        <h2 className="text-lg sm:text-xl font-black text-slate-900">
          Personal Profile &amp; Locked Dates
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm leading-5 text-slate-500">
          DOB and anniversary are protected to help maintain accurate
          birthday and anniversary promotions.
        </p>
      </div>

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">

        {/* Profile Messages */}
        {profileMsg && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs sm:text-sm font-semibold text-emerald-800"
          >
            {profileMsg}
          </div>
        )}

        {profileError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs sm:text-sm font-semibold text-rose-800"
          >
            {profileError}
          </div>
        )}

        {/* Profile Form */}
        <form
          onSubmit={handleUpdateProfile}
          className="space-y-5"
        >
          {/* Full Name */}
          <div>
            <label className="mb-1.5 block text-xs sm:text-sm font-bold text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="mb-1.5 block text-xs sm:text-sm font-bold text-slate-700">
              Mobile Number
              <span className="ml-1 font-normal text-slate-400">
                (Primary identifier)
              </span>
            </label>
            <input
              type="text"
              value={user?.mobile || ''}
              disabled
              className="w-full min-w-0 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-3 text-sm font-mono text-slate-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs sm:text-sm font-bold text-slate-700">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email (optional)"
              autoComplete="email"
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* Protected Dates */}
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-800">
                Security-Protected Celebration Dates
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Dates can be saved once and cannot subsequently be changed here.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              {/* Date of Birth */}
              <div className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Calendar className="h-4 w-4 shrink-0 text-emerald-600" />
                  Date of Birth
                </label>

                {user?.dob ? (
                  <>
                    <p className="break-words text-base sm:text-lg font-black text-slate-900">
                      {formatDate(String(user.dob).slice(0, 10))}
                    </p>
                    <p className="flex items-start gap-1.5 text-[11px] leading-4 text-amber-700">
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Cannot be changed once saved.
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      type="date"
                      value={dob ? String(dob).slice(0, 10) : ''}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                    <p className="text-[11px] leading-4 text-slate-500">
                      You can set your date of birth only once.
                    </p>
                  </>
                )}
              </div>

              {/* Anniversary */}
              <div className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Calendar className="h-4 w-4 shrink-0 text-pink-600" />
                  Anniversary Date
                </label>

                {user?.anniversary_date ? (
                  <>
                    <p className="break-words text-base sm:text-lg font-black text-slate-900">
                      {formatDate(String(user.anniversary_date).slice(0, 10))}
                    </p>
                    <p className="flex items-start gap-1.5 text-[11px] leading-4 text-amber-700">
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Cannot be changed once saved.
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      type="date"
                      value={
                        anniversaryDate
                          ? String(anniversaryDate).slice(0, 10)
                          : ''
                      }
                      onChange={(e) => setAnniversaryDate(e.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                    <p className="text-[11px] leading-4 text-slate-500">
                      You can set your anniversary date only once.
                    </p>
                  </>
                )}
              </div>

            </div>
          </div>

          {/* Save Profile */}
          <div className="border-t border-slate-100 pt-5">
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:w-auto"
            >
              Save Profile Changes
            </button>
          </div>
        </form>

        {/* Account Deletion Section */}
        <section className="space-y-4 border-t border-rose-100 pt-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 6h18M9 6V4h6v2m-9 0 1 14h10l1-14M10 10v6m4-6v6"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Account Deletion
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-5 text-slate-500">
                Request deletion of your account and associated personal
                information. Our administration team will review your request.
              </p>
            </div>
          </div>

          {deletionMessage && (
            <div
              role="status"
              className="break-words rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs sm:text-sm font-semibold text-emerald-800"
            >
              {deletionMessage}
            </div>
          )}

          {deletionError && (
            <div
              role="alert"
              className="break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs sm:text-sm font-semibold text-rose-800"
            >
              {deletionError}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setDeletionError('');
              setShowDeletionModal(true);
            }}
            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 sm:w-auto"
          >
            Request Account Deletion
          </button>
        </section>
      </div>
    </div>

    {/* Deletion Confirmation Modal */}
    {showDeletionModal && (
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={(e) => {
          if (
            e.target === e.currentTarget &&
            !deletionLoading
          ) {
            setShowDeletionModal(false);
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deletion-modal-title"
          aria-describedby="deletion-modal-description"
          className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[85dvh] sm:rounded-2xl"
        >
          {/* Modal Header */}
          <div className="flex items-start gap-3 border-b border-slate-100 p-4 sm:p-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <h2
                id="deletion-modal-title"
                className="text-base sm:text-lg font-black text-slate-900"
              >
                Request Account Deletion
              </h2>
              <p className="mt-1 text-xs sm:text-sm leading-5 text-slate-500">
                Please review the information before confirming.
              </p>
            </div>

            <button
              type="button"
              aria-label="Close dialog"
              disabled={deletionLoading}
              onClick={() => setShowDeletionModal(false)}
              className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m18 6-12 12M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Scrollable Modal Content */}
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <div
              id="deletion-modal-description"
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
            >
              <p className="text-xs sm:text-sm font-bold text-amber-900">
                What happens next?
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-4 text-xs sm:text-sm leading-5 text-amber-900/80">
                <li>
                  Your request will be sent to our administration team.
                </li>
                <li>
                  Your account will not be deleted immediately.
                </li>
                
                <li>
                  Your account will be deleted within 24 hours of submitting your request.
                </li>

                <li>
                  The team will review your request and any applicable legal
                  or transaction-record retention requirements.
                </li>
                <li>
                  Once deletion is completed, you may lose access to account
                  history, rewards, and other account features.
                </li>
              </ul>
            </div>

            <div>
              <label
                htmlFor="deletion-reason"
                className="mb-2 block text-xs sm:text-sm font-bold text-slate-700"
              >
                Reason for deletion
                <span className="ml-1 font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <textarea
                id="deletion-reason"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Share your reason, if you wish..."
                disabled={deletionLoading}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-slate-50 disabled:opacity-60"
              />

              <p className="mt-1 text-right text-[11px] text-slate-400">
                {deletionReason.length}/1000
              </p>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Confirming submits a deletion request for review. It does not
              immediately delete your account.
            </p>

            {deletionError && (
              <div
                role="alert"
                className="break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs sm:text-sm font-semibold text-rose-800"
              >
                {deletionError}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deletionLoading}
                onClick={() => setShowDeletionModal(false)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deletionLoading}
                onClick={handleDeletionRequest}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {deletionLoading && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="opacity-25"
                    />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="opacity-90"
                    />
                  </svg>
                )}

                {deletionLoading
                  ? 'Submitting Request...'
                  : 'Confirm Deletion Request'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)}
 {activeTab === 'password' && (

<div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
  <h3 className="text-base font-black text-slate-900">
    Change Password
  </h3>

  {passwordMsg && (
    <p className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs">
      {passwordMsg}
    </p>
  )}

  {passwordError && (
    <p className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs">
      {passwordError}
    </p>
  )}

  <form onSubmit={handleChangePassword} className="space-y-3">
    <input
      type="password"
      autoComplete="current-password"
      placeholder="Current password"
      value={currentPassword}
      onChange={(e) => setCurrentPassword(e.target.value)}
      required
      className="w-full p-3 border border-slate-200 rounded-xl"
    />

    <input
      type="password"
      autoComplete="new-password"
      placeholder="New password (minimum 6 characters)"
      value={newPassword}
      onChange={(e) => setNewPassword(e.target.value)}
      minLength={6}
      required
      className="w-full p-3 border border-slate-200 rounded-xl"
    />

    <input
      type="password"
      autoComplete="new-password"
      placeholder="Confirm new password"
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      minLength={8}
      required
      className="w-full p-3 border border-slate-200 rounded-xl"
    />

    <button
      type="submit"
      disabled={passwordLoading}
      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
    >
      {passwordLoading ? 'Updating...' : 'Change Password'}
    </button>
  </form>
</div>
      )}

      {/* 3. WELCOME BONUS LEDGER TAB */}
      {activeTab === 'bonus' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-3xl p-6 sm:p-8 shadow-md flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider bg-black/20 px-2.5 py-1 rounded-full">
                Promotional Account Credit
              </span>
              <h2 className="text-3xl font-black mt-2">₹{bonusData.availableBalance}</h2>
              <p className="text-xs text-amber-100 mt-1 max-w-sm">
                Apply toward your grocery orders at checkout. Stacks with member benefits and coupons!
              </p>
            </div>
            <Gift className="w-16 h-16 text-white/40 hidden sm:block" />
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Credit Ledger History</h3>
            
            {bonusData.transactions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No bonus transactions recorded.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {bonusData.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{tx.description || tx.type}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(tx.created_at).toLocaleString()} • Ref: {tx.reference_type} #{tx.reference_id}
                      </div>
                    </div>
                    <span className={`font-black text-sm ${
                      tx.type === 'WELCOME_BONUS' || tx.type === 'ADMIN_CREDIT' || tx.type === 'REVERSAL'
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}>
                      {tx.type === 'WELCOME_BONUS' || tx.type === 'ADMIN_CREDIT' || tx.type === 'REVERSAL' ? '+' : '-'}₹{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. VIP MEMBERSHIP TAB */}
      {activeTab === 'membership' && (
        <div className="space-y-6">
          {membershipData ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Active Plan
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-1">{membershipData.plan_name} {membershipData.plan_price}</h2>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-400">Expires on</span>
                  <div className="font-bold text-slate-800">{new Date(membershipData.end_date).toLocaleDateString()}</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Member Benefits</h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>{membershipData.discount_percent}% instant discount applied across all orders</span>
                  </li>
                  {membershipData.free_delivery ? (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Zero delivery fee on all orders</span>
                    </li>
                  ) : null}
                  {(membershipData.benefits || []).map((b, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
              <Award className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No Active Membership</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Join our VIP Saver plans to enjoy unlimited free delivery and up to 10% instant discounts on all fresh groceries!
              </p>
              <button
                onClick={() => onNavigate('membership')}
                className="mt-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Browse VIP Membership Plans
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. SAVED ADDRESSES TAB */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {addr.address_type}
                  </span>
                  {addr.is_default ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  ) : null}
                </div>
                <p className="font-semibold text-slate-800">{addr.address_line}</p>
                {addr.landmark && <p className="text-slate-500 text-[11px]">Landmark: {addr.landmark}</p>}
                <p className="text-slate-500 text-[11px]">
                  {addr.sub_area_name}, {addr.area_name} - {addr.pincode}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

          {/* Order Details & Lifecycle Modal */}
   
{selectedOrder && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60">
    <div className="bg-white rounded-xl w-full max-w-md max-h-[95vh] overflow-y-auto shadow-2xl">

      {/* Close button - not part of receipt */}
      <div className="flex justify-end p-3 border-b print:hidden">
        <button
          type="button"
          onClick={() => setSelectedOrder(null)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Close bill"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Thermal Receipt */}
      <div
        id="customer-order-bill"
        className="thermal-receipt mx-auto w-full max-w-[302px] bg-white p-3 text-black font-mono text-[11px] leading-relaxed"
      >
        {/* Receipt Header */}
        <div className="text-center pb-3 border-b border-dashed border-black">
          <h1 className="text-xl font-black tracking-wider">
            CUSTOMER BILL
          </h1>
          <p className="text-[10px] mt-1">
            Order Receipt
          </p>
        </div>

         <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-black text-sm tracking-tight uppercase">
                {storeSettings.store_name || 'Swastik Supermarket'}
              </h2>
              <p className="text-[10px] text-slate-600">
                {storeSettings.store_address}
              </p>
              <p className="text-[10px] text-slate-600">
                Phone: {storeSettings.store_mobile} | GSTIN: {storeSettings.store_gst || 'N/A'}
              </p>
              
            </div>
        {/* Order Details */}
        <div className="py-3 space-y-1 border-b border-dashed border-black">
          <div className="flex justify-between gap-2">
            <span>Bill No:</span>
            <strong className="text-right break-all">
              {selectedOrder.order.order_number}
            </strong>
          </div>

          <div className="flex justify-between gap-2">
            <span>Order Date:</span>
            <span className="text-right">
              {selectedOrder.order.created_at
                ? new Date(
                    selectedOrder.order.created_at
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                  })
                : "-"}
            </span>
          </div>

          <div className="flex justify-between gap-2">
            <span>Delivered:</span>
            <span className="text-right">
              {selectedOrder.order.delivered_at
                ? new Date(
                    selectedOrder.order.delivered_at
                  ).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: "Asia/Kolkata",
                  })
                : "Not delivered"}
            </span>
          </div>

          <div className="flex justify-between gap-2">
            <span>Status:</span>
            <strong>
              {selectedOrder.order.order_status || "-"}
            </strong>
          </div>
        </div>

        {/* Customer */}
        <div className="py-3 border-b border-dashed border-black space-y-1">
          <p className="font-bold text-xs">CUSTOMER DETAILS</p>

          <p>
            Name: {selectedOrder.order.customer_name || "-"}
          </p>

          <p>
            Mobile: {selectedOrder.order.customer_mobile || "-"}
          </p>

          <p className="break-words">
            Address: {selectedOrder.order.delivery_address || "-"}
          </p>

          {selectedOrder.order.landmark && (
            <p>Landmark: {selectedOrder.order.landmark}</p>
          )}

          <p>
            {[ 
              selectedOrder.order.sub_area_name,
              selectedOrder.order.area_name,
              selectedOrder.order.pincode,
            ].filter(Boolean).join(", ")}
          </p>
        </div>

        {/* Products */}
        <div className="py-3 border-b border-dashed border-black">
          <p className="font-bold text-xs mb-3">
            ITEMS ({selectedOrder.items?.length || 0})
          </p>

          {selectedOrder.items?.map((item, index) => (
            <div
              key={item.id}
              className="mb-3 pb-2 border-b border-dotted border-gray-400 last:border-0"
            >
              <div className="font-bold break-words">
                {index + 1}. {item.product_name}
              </div>

              <div className="flex justify-between gap-2 mt-1">
                <span>
                  {Number(item.applied_price || 0).toFixed(2)}
                  {" × "}
                  {item.quantity} {item.unit}
                </span>

                <strong className="whitespace-nowrap">
                  ₹{Number(item.total || 0).toFixed(2)}
                </strong>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
     <div className="py-4 border-b border-dashed border-black">
       {Number(selectedOrder.order.coupon_discount || 0) > 0 && (
        <div className="flex justify-between items-center gap-2 mb-2">
          <span className="font-semibold text-sm">
            Coupon Discount
          </span>
          <span className="font-semibold text-sm whitespace-nowrap">
            -₹{Number(selectedOrder.order.coupon_discount).toFixed(2)}
          </span>
        </div>
      )}

      {Number(selectedOrder.order.bonus_discount || 0) > 0 && (
        <div className="flex justify-between items-center gap-2 mb-3">
          <span className="font-semibold text-sm">
            Welcome Bonus Discount
          </span>
          <span className="font-semibold text-sm whitespace-nowrap">
            -₹{Number(selectedOrder.order.bonus_discount).toFixed(2)}
          </span>
        </div>
      )}

        <div className="flex justify-between items-center gap-2">
          <span className="font-black text-sm">
            TOTAL AMOUNT
          </span>

          <span className="font-black text-lg whitespace-nowrap">
            ₹{Number(
              selectedOrder.order.grand_total || 0
            ).toFixed(2)}
          </span>
        </div>
      </div>
          <p className="mt-2">
            Payment: {selectedOrder.order.payment_method || "-"}
          </p>

          <p>
            Payment Status: {selectedOrder.order.payment_status || "-"}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 pb-2">
          <p className="font-bold text-xs">
            THANK YOU!
          </p>
          <p className="mt-1">
            Visit us again.
          </p>
          <p className="mt-3 text-[9px]">
            *** CUSTOMER COPY ***
          </p>
        </div>
      </div>
    </div>

  
  
)}

  {/* Thermal receipt print styling */}
    <style>{`
      @media print {
        @page {
          size: 80mm auto;
          margin: 0;
        }

        body * {
          visibility: hidden !important;
        }

        #customer-order-bill,
        #customer-order-bill * {
          visibility: visible !important;
        }

        #customer-order-bill {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 72mm !important;
          max-width: 72mm !important;
          margin: 0 !important;
          padding: 3mm !important;
          font-family: monospace !important;
          font-size: 10px !important;
          color: #000 !important;
          background: #fff !important;
          box-shadow: none !important;
        }

        .print\\:hidden {
          display: none !important;
        }

        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }
      }
    `}</style>

    </div>
  );
}
