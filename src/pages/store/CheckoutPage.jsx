import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, MapPin, Clock, Tag, Gift, CreditCard, Banknote, ArrowRight, CheckCircle, AlertCircle, Plus, User } from 'lucide-react';
import client from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useDelivery } from '../../context/DeliveryContext.jsx';

export default function CheckoutPage({ onNavigate }) {
  const { user, isAuthenticated } = useAuth();
  const { items, clearCart } = useCart();
  const { zones, slots, selectedArea, selectedSubArea, setZoneSelection } = useDelivery();

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('new');
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('482002');
  const [selectedSlotId, setSelectedSlotId] = useState(slots[0]?.id || 1);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [useBonus, setUseBonus] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [notificationPhone, setNotificationPhone] = useState(user?.mobile || '');

  const [calculation, setCalculation] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
      if (user?.mobile && !notificationPhone) {
        setNotificationPhone(user.mobile);
      }
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (items.length > 0 && selectedArea && selectedSubArea) {
      runCalculation();
    }
  }, [items, selectedArea, selectedSubArea, appliedCoupon, useBonus]);

  async function loadAddresses() {
    try {
      const res = await client.get('/addresses');
      if (res.success && res.data && res.data.length > 0) {
        setSavedAddresses(res.data);
        const def = res.data.find(a => a.is_default) || res.data[0];
        setSelectedAddressId(def.id);
        setAddressLine(def.address_line);
        setLandmark(def.landmark || '');
        setPincode(def.pincode);

        // sync area and sub area
        const matchedArea = zones.find(z => z.id === def.area_id);
        const matchedSub = matchedArea?.sub_areas?.find(s => s.id === def.sub_area_id);
        if (matchedArea && matchedSub) {
          setZoneSelection(matchedArea, matchedSub);
        }
      }
    } catch (err) {
      console.warn('Failed to load saved addresses:', err.message);
    }
  }

  function handleAddressSelect(addrId) {
    setSelectedAddressId(addrId);
    if (addrId === 'new') {
      setAddressLine('');
      setLandmark('');
    } else {
      const addr = savedAddresses.find(a => a.id === Number(addrId));
      if (addr) {
        setAddressLine(addr.address_line);
        setLandmark(addr.landmark || '');
        setPincode(addr.pincode);
        const matchedArea = zones.find(z => z.id === addr.area_id);
        const matchedSub = matchedArea?.sub_areas?.find(s => s.id === addr.sub_area_id);
        if (matchedArea && matchedSub) {
          setZoneSelection(matchedArea, matchedSub);
        }
      }
    }
  }

  async function runCalculation() {
    if (items.length === 0 || !selectedArea || !selectedSubArea) return;
    setCalcLoading(true);
    setCalcError('');

    try {
      const res = await client.post('/orders/calculate', {
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        couponCode: appliedCoupon || null,
        useBonus,
        areaId: selectedArea.id,
        subAreaId: selectedSubArea.id,
        source: 'ONLINE',
      });

      if (res.success) {
        setCalculation(res.data);
      }
    } catch (err) {
      setCalcError(err.message);
      setCalculation(null);
    } finally {
      setCalcLoading(false);
    }
  }

  function handleApplyCoupon(e) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setAppliedCoupon(couponCode.trim().toUpperCase());
  }

  function handleRemoveCoupon() {
    setAppliedCoupon('');
    setCouponCode('');
  }

  async function handlePlaceOrder() {
    if (!isAuthenticated) {
      alert('Please log in or register before completing your order.');
      onNavigate('login');
      return;
    }

    if (user?.account_type === 'INTERNAL') {
      alert('Access Denied: Internal staff/administrator accounts cannot place customer online store orders. Please switch to In-House POS or use a customer account.');
      return;
    }

    if (!selectedArea || !selectedSubArea) {
      alert('Please select a delivery Area and Sub-Area.');
      return;
    }

    if (!addressLine.trim() || !pincode.trim()) {
      alert('Please enter your street address and pincode.');
      return;
    }

    if (calcError) {
      alert(`Cannot place order: ${calcError}`);
      return;
    }

    setPlacingOrder(true);
    try {
      // If new address, save to customer_addresses
      if (selectedAddressId === 'new') {
        client.post('/addresses', {
          area_id: selectedArea.id,
          sub_area_id: selectedSubArea.id,
          address_line: addressLine.trim(),
          landmark: landmark.trim(),
          pincode: pincode.trim(),
          is_default: savedAddresses.length === 0 ? 1 : 0,
        }).catch(() => {});
      }

      const res = await client.post('/orders', {
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        couponCode: appliedCoupon || null,
        useBonus,
        areaId: selectedArea.id,
        subAreaId: selectedSubArea.id,
        deliverySlotId: Number(selectedSlotId),
        deliveryAddress: addressLine.trim(),
        landmark: landmark.trim(),
        pincode: pincode.trim(),
        paymentMethod,
        notificationPhone: notificationPhone.trim() || user.mobile,
        source: 'ONLINE',
      });

      if (res.success && res.data) {
        const orderData = res.data;

        // If Razorpay payment method
        if (paymentMethod === 'RAZORPAY' && orderData.razorpayOrder) {
          // Verify client-side payment completion
          await client.post('/payments/razorpay/verify', {
            orderId: orderData.orderId,
            razorpay_order_id: orderData.razorpayOrder.id,
            razorpay_payment_id: `pay_${Date.now()}_mock`,
            razorpay_signature: 'valid_signature',
          });
        }

        clearCart();
        onNavigate('order-success', {
          orderNumber: orderData.orderNumber,
          orderId: orderData.orderId,
        });
      }
    } catch (err) {
      alert(`Order placement failed: ${err.message}`);
    } finally {
      setPlacingOrder(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Your basket is empty</h2>
        <p className="text-xs text-slate-500">Please add products to your basket before checking out.</p>
        <button
          onClick={() => onNavigate('shop')}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Checkout &amp; Delivery</h1>
        <p className="text-xs text-slate-500">Real-time zone eligibility, operational slots, and single pricing calculation</p>
      </div>

      {/* Guest Notice */}
      {!isAuthenticated && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950">Guest Checkout</h4>
              <p className="text-[11px] text-amber-800">
                You can browse as guest, but mandatory login/registration is required before final order placement.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('login')}
            className="px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {/* Internal Staff Warning */}
      {isAuthenticated && user?.account_type === 'INTERNAL' && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-200 text-rose-900 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-950">Internal Staff / Admin Account Detected</h4>
              <p className="text-[11px] text-rose-800">
                Staff accounts are prohibited from placing customer online orders. Please switch to In-House POS or log in with a customer account.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('admin-pos')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            Go to In-House POS &rarr;
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Delivery & Options (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Area & Sub Area */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>1. Delivery Area &amp; Sub-Area</span>
              </h3>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Hierarchy: Area → Sub-Area
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Area</label>
                <select
                  value={selectedArea?.id || ''}
                  onChange={(e) => {
                    const area = zones.find(z => z.id === Number(e.target.value));
                    setZoneSelection(area, area?.sub_areas?.[0] || null);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Sub-Area</label>
                <select
                  value={selectedSubArea?.id || ''}
                  onChange={(e) => {
                    const sub = selectedArea?.sub_areas?.find(s => s.id === Number(e.target.value));
                    setZoneSelection(selectedArea, sub);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  {(selectedArea?.sub_areas || []).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Fee: ₹{s.effective_delivery_charge})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedSubArea && (
              <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-slate-600">
                <span>Standard Fee: <strong>₹{selectedSubArea.effective_delivery_charge}</strong></span>
                <span>Free Above: <strong className="text-emerald-700">₹{selectedSubArea.effective_free_minimum}</strong></span>
                <span>Hours: <strong>{selectedSubArea.effective_start_time} - {selectedSubArea.effective_end_time}</strong></span>
              </div>
            )}
          </div>

          {/* Section 2: Address */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>2. Delivery Street Address</span>
            </h3>

            {/* Saved addresses selector */}
            {savedAddresses.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Saved Addresses</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {savedAddresses.map(addr => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleAddressSelect(addr.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{addr.address_type}</span>
                        {selectedAddressId === addr.id && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <p className="mt-1 text-[11px] font-normal text-slate-600 truncate">{addr.address_line}</p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddressSelect('new')}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      selectedAddressId === 'new'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-dashed border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Enter New Address</span>
                  </button>
                </div>
              </div>
            )}

            {/* Address fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">House / Flat No., Street, Building</label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="e.g. Flat 302, Green Residency, Scheme 54"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Landmark (Optional)</label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Near Apollo Hospital"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="482002"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Delivery Slots */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>3. Preferred Delivery Slot</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {slots.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSlotId(s.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedSlotId === s.id
                      ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-950'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{s.name}</span>
                    {selectedSlotId === s.id && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: WhatsApp Notification Phone */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <span>4. WhatsApp Order Updates Number</span>
            </h3>
            <div className="text-xs">
              <label className="font-bold text-slate-700 block mb-1">
                WhatsApp Phone for Order Notifications
              </label>
              <input
                type="tel"
                value={notificationPhone}
                onChange={(e) => setNotificationPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 text-slate-900"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Live delivery status, OTP, and tracking will be dispatched to this number via WhatsApp.
              </p>
            </div>
          </div>

          {/* Section 5: Payment Method */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>5. Payment Method</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                  paymentMethod === 'COD'
                    ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-950'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <div>
                  <div>Cash on Delivery (COD)</div>
                  <div className="text-[10px] text-slate-500 font-normal">Pay cash/UPI at doorstep</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('RAZORPAY')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                  paymentMethod === 'RAZORPAY'
                    ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-950'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <div>
                  <div>Razorpay Online</div>
                  <div className="text-[10px] text-slate-500 font-normal">UPI, Cards, NetBanking</div>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Order Summary & Pricing Engine (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Order Calculation Summary
            </h3>

            {/* Error banner from pricing engine if time window or min order not met */}
            {calcError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Delivery Validation Notice</p>
                  <p>{calcError}</p>
                </div>
              </div>
            )}

            {/* Coupon Code Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Apply Coupon Code</span>
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <span className="font-bold text-emerald-800">
                    Coupon: <strong>{appliedCoupon}</strong> Applied
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="e.g. WELCOME50, FRESH10"
                    className="flex-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 uppercase font-bold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              )}
            </div>

            {/* Welcome Bonus (Promotional Account Credit) Checkbox */}
            {calculation && calculation.available_bonus > 0 && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useBonus}
                    onChange={(e) => setUseBonus(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-amber-950 flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5 text-amber-700" />
                      Redeem Promotional Welcome Bonus
                    </span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Available Credit: <strong>₹{calculation.available_bonus}</strong>
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Line items pricing breakdown */}
            {calculation ? (
              <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">₹{calculation.subtotal}</span>
                </div>

                {calculation.membership_discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>VIP Member Discount ({calculation.active_membership?.plan_name})</span>
                    <span>-₹{calculation.membership_discount}</span>
                  </div>
                )}

                {calculation.coupon_discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-₹{calculation.coupon_discount}</span>
                  </div>
                )}

                {calculation.bonus_discount > 0 && (
                  <div className="flex justify-between text-amber-800 font-semibold">
                    <span>Welcome Bonus Credit</span>
                    <span>-₹{calculation.bonus_discount}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charge</span>
                  <span>
                    {calculation.delivery_charge === 0 ? (
                      <strong className="text-emerald-700 uppercase">FREE</strong>
                    ) : (
                      `₹${calculation.delivery_charge}`
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Taxes (GST)</span>
                  <span>₹{calculation.tax}</span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline text-sm">
                  <span className="font-bold text-slate-900">Grand Total</span>
                  <span className="text-xl font-black text-slate-950">₹{calculation.grand_total}</span>
                </div>
              </div>
            ) : calcLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Calculating order pricing...</div>
            ) : null}

            {/* Place Order CTA */}
            <button
              type="button"
              disabled={placingOrder || Boolean(calcError) || calcLoading || user?.account_type === 'INTERNAL'}
              onClick={handlePlaceOrder}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{placingOrder ? 'Processing Order...' : `Place Order • ₹${calculation?.grand_total || '...'}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Real DB Transaction • Lock applied upon delivery</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
