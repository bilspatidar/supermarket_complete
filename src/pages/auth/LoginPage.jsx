import React, { useState } from 'react';
import { Store, Phone, Lock, MessageSquare, ArrowRight, ShieldAlert, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LoginPage({ onNavigate }) {
  const { loginWithPassword, requestOtp, verifyOtp, register } = useAuth();

  const [activeTab, setActiveTab] = useState('password'); // 'password', 'otp', 'register'
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regAnniv, setRegAnniv] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function fillDemoAccount(mob, pass) {
    setMobile(mob);
    setPassword(pass);
    setActiveTab('password');
    setError('');
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginWithPassword(mobile, password);
      redirectAfterAuth(res.meta?.destination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestOtp(mobile);
      setOtpSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await verifyOtp(mobile, otpCode);
      redirectAfterAuth(res.meta?.destination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await register({
        mobile,
        password: password || 'customer123',
        name: regName,
        email: regEmail || null,
        dob: regDob || null,
        anniversaryDate: regAnniv || null,
      });
      redirectAfterAuth(res.meta?.destination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function redirectAfterAuth(dest) {
    if (dest === '/admin/dashboard') {
      onNavigate('admin-dashboard');
    } else if (dest === '/admin/pos') {
      onNavigate('admin-pos');
    } else if (dest === '/admin/orders') {
      onNavigate('admin-orders');
    } else {
      onNavigate('account');
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-6">
        
        {/* Branding */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black mx-auto shadow-md">
            <Store className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight pt-2">
            One Unified Sign In
          </h2>
          <p className="text-xs text-slate-500">
            Access Customer Account, In-House POS, or Admin Console
          </p>
        </div>

        {/* Demo Fast Login Buttons */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>⚡ 1-Click Demo Accounts</span>
            <span className="text-emerald-700 font-semibold">Test Profiles</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => fillDemoAccount('9876543212', 'customer123')}
              className="p-1.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-lg font-bold text-slate-800 transition-colors cursor-pointer text-center"
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('9876543211', 'staff123')}
              className="p-1.5 bg-white border border-slate-200 hover:border-indigo-500 rounded-lg font-bold text-indigo-700 transition-colors cursor-pointer text-center"
            >
              Cashier POS
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('9876543210', 'admin123')}
              className="p-1.5 bg-white border border-slate-200 hover:border-purple-500 rounded-lg font-bold text-purple-700 transition-colors cursor-pointer text-center"
            >
              Super Admin
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => { setActiveTab('password'); setError(''); }}
            className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'password' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('otp'); setError(''); }}
            className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'otp' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            WhatsApp OTP
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(''); }}
            className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        {/* TAB 1: Password Form */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mobile Number</label>
              <div className="relative">
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile (e.g. 9876543210)"
                  required
                  className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900 font-semibold"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* TAB 2: WhatsApp OTP Form */}
        {activeTab === 'otp' && (
          <div className="space-y-4 text-xs">
            {!otpSent ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile Number</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="10-digit mobile number"
                      required
                      className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900 font-semibold"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    We will dispatch a 6-digit login OTP to your WhatsApp account.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{loading ? 'Sending OTP...' : 'Send WhatsApp OTP'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px]">
                  OTP dispatched to <strong>{mobile}</strong>. (For instant testing, demo OTP is <strong>123456</strong>)
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Enter 6-digit OTP</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    required
                    maxLength={6}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900 text-center text-lg font-black tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-center text-slate-500 hover:text-slate-800 text-[11px] cursor-pointer"
                >
                  Change Mobile Number
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Bilash Patidar"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mobile Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
              />
            </div>

            {/* DOB & Anniversary Section - Set Once! */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                ⭐ Birthday &amp; Anniversary Perks (Set Once)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={regDob}
                    onChange={(e) => setRegDob(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden text-slate-800 text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Anniversary</label>
                  <input
                    type="date"
                    value={regAnniv}
                    onChange={(e) => setRegAnniv(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden text-slate-800 text-[11px]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Note: DOB and Anniversary are set once and locked in accordance with supermarket security rules.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Register & Claim ₹100 Welcome Bonus'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
