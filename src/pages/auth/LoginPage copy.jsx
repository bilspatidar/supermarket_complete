import React, { useState } from 'react';
import { Store, Phone, Lock, MessageSquare, ArrowRight, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LoginPage({ onNavigate }) {
  const { loginWithPassword, requestOtp, verifyOtp, register } = useAuth();

  const [authMethod, setAuthMethod] = useState('password'); // 'password', 'otp', 'register'
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regAnniv, setRegAnniv] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function fillDemoAccount(mob, pass) {
    setMobile(mob);
    setPassword(pass);
    setAuthMethod('password');
    setError('');
  }

  function redirectAfterAuth(destination) {
    if (destination === '/admin/dashboard') {
      onNavigate('admin-dashboard');
    } else if (destination === '/admin/pos') {
      onNavigate('admin-pos');
    } else if (destination === '/admin/orders') {
      onNavigate('admin-orders');
    } else {
      onNavigate('account');
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginWithPassword(mobile, password);
      redirectAfterAuth(res.meta?.destination);
    } catch (err) {
      setError(err.message || 'Login failed');
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
      setError(err.message || 'Failed to send OTP');
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
      setError(err.message || 'OTP verification failed');
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
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black mx-auto shadow-md">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-2">
            Sign In
          </h1>
          <p className="text-xs text-slate-500">
            Enter your mobile number to access your account
          </p>
        </div>

        {/* 1-Click Fast Test Profiles (Helper) */}
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>⚡ Quick Demo Credentials</span>
            <span className="text-emerald-700">1-Click Auto Fill</span>
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
              POS Staff
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('9876543210', 'admin123')}
              className="p-1.5 bg-white border border-slate-200 hover:border-purple-500 rounded-lg font-bold text-purple-700 transition-colors cursor-pointer text-center"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Method Toggle: Password vs OTP vs Register */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => { setAuthMethod('password'); setError(''); }}
            className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer ${
              authMethod === 'password' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('otp'); setError(''); }}
            className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer ${
              authMethod === 'otp' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            WhatsApp OTP
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('register'); setError(''); }}
            className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer ${
              authMethod === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            New Account
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* METHOD 1: PASSWORD LOGIN */}
        {authMethod === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
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
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900 font-medium"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* METHOD 2: WHATSAPP OTP */}
        {authMethod === 'otp' && (
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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{loading ? 'Sending OTP...' : 'Send WhatsApp OTP'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px]">
                  <span>6-digit OTP dispatched to WhatsApp for <strong>{mobile}</strong>. (Testing OTP: <strong>123456</strong>)</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    required
                    className="w-full p-3 text-center tracking-widest font-mono text-lg bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{loading ? 'Verifying OTP...' : 'Verify & Sign In'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-center text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Change mobile number
                </button>
              </form>
            )}
          </div>
        )}

        {/* METHOD 3: REGISTER NEW CUSTOMER */}
        {authMethod === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mobile Number *</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={regDob}
                  onChange={(e) => setRegDob(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-[11px]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Anniversary</label>
                <input
                  type="date"
                  value={regAnniv}
                  onChange={(e) => setRegAnniv(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-[11px]"
                />
              </div>
            </div>
            <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg">
              ℹ️ Birthday &amp; Anniversary are set once and locked for special reward vouchers.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Creating Account...' : 'Register & Claim ₹100 Bonus'}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
