import React, { useEffect, useState } from 'react';
import { User, Lock, Gift, Award, MapPin, Package, Clock, ShieldCheck, ChevronRight, Phone, Mail, Calendar, CheckCircle } from 'lucide-react';
import client from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AccountDashboard({ onNavigate }) {
  const { user, stats, refreshMe, updateProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'profile', 'bonus', 'membership', 'addresses'
  const [orders, setOrders] = useState([]);
  const [bonusData, setBonusData] = useState({ availableBalance: 0, transactions: [] });
  const [membershipData, setMembershipData] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile edit fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    loadAccountData();
  }, []);

  async function loadAccountData() {
    setLoading(true);
    try {
      const [orderRes, bonusRes, memberRes, addrRes] = await Promise.all([
        client.get('/orders'),
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

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    try {
      await updateProfile({ name, email });
      setProfileMsg('Profile information updated successfully');
      refreshMe();
    } catch (err) {
      setProfileError(err.message);
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
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">Personal Profile &amp; Locked Dates</h2>
            <p className="text-xs text-slate-500">
              DOB and Anniversary are set once to ensure tamper-proof birthday &amp; anniversary promotions.
            </p>
          </div>

          {profileMsg && <div className="p-3 bg-emerald-50 text-emerald-900 text-xs rounded-xl font-bold">{profileMsg}</div>}
          {profileError && <div className="p-3 bg-rose-50 text-rose-900 text-xs rounded-xl font-bold">{profileError}</div>}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mobile Number (Primary Identifier)</label>
              <input
                type="text"
                value={user?.mobile}
                disabled
                className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="optional"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
              />
            </div>

            {/* LOCKED DOB DISPLAY (Section 5 Requirement) */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                Security-Protected Celebration Dates
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* DOB Box */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-semibold text-[11px] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Date of Birth
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  </div>
                  {/* Strict display as text: "DOB: 14 September 1990" */}
                  <div className="text-sm font-black text-slate-900 pt-1">
                    DOB: {formatDate(user?.dob)}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Set once. Automated WhatsApp birthday greetings trigger on this date.
                  </p>
                </div>

                {/* Anniversary Box */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-semibold text-[11px] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-pink-600" /> Anniversary
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  </div>
                  {/* Strict display as text */}
                  <div className="text-sm font-black text-slate-900 pt-1">
                    Anniversary: {formatDate(user?.anniversary_date)}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Set once. Automated WhatsApp anniversary greetings trigger on this date.
                  </p>
                </div>

              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Save Profile Changes
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
                  <h2 className="text-xl font-black text-slate-900 mt-1">{membershipData.plan_name}</h2>
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

    </div>
  );
}
