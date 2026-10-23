import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldAlert, MapPin, Clock, Tag, Gift, CreditCard, Banknote, ArrowRight, CheckCircle, AlertCircle, Plus, User } from 'lucide-react';
import client from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useDelivery } from '../../context/DeliveryContext.jsx';
import { useStoreSettings } from '../../context/StoreSettingsContext';


export default function CheckoutPage({ onNavigate }) {
  const { user, isAuthenticated } = useAuth();
  const { items, clearCart } = useCart();
  const { zones, slots, selectedArea, selectedSubArea, setZoneSelection } = useDelivery();
  const { storeSettings } = useStoreSettings();

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
  const [couponError, setCouponError] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const codEnabled =
  String(storeSettings?.enable_cod ?? 'YES').toUpperCase() === 'YES';

  const razorpayEnabled =
    String(storeSettings?.enable_payment_gateway ?? 'YES').toUpperCase() === 'YES';

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

  function getRequestErrorMessage(err, fallback = 'Unable to calculate order pricing') {
    return (
      err?.response?.data?.message ||
      err?.data?.message ||
      err?.message ||
      fallback
    );
  }

  async function requestCalculation({ coupon = appliedCoupon, bonus = useBonus } = {}) {
    const res = await client.post('/orders/calculate', {
      items: items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
      })),
      couponCode: coupon || null,
      useBonus: Boolean(bonus),
      areaId: selectedArea.id,
      subAreaId: selectedSubArea.id,
      source: 'ONLINE',
    });

    if (!res?.success || !res?.data) {
      throw new Error(res?.message || 'Unable to calculate order pricing');
    }

    return res.data;
  }

  async function runCalculation() {
    if (items.length === 0 || !selectedArea || !selectedSubArea) return;

    setCalcLoading(true);
    setCalcError('');

    try {
      const result = await requestCalculation();
      setCalculation(result);
      setCouponError('');
    } catch (err) {
      const message = getRequestErrorMessage(err);

      // If an applied coupon becomes invalid/expired, remove it and recalculate
      // without the coupon so the base total and eligible bonus remain visible.
      if (appliedCoupon) {
        setAppliedCoupon('');
        setCouponCode('');
        setCouponError(message);

        try {
          const baseResult = await requestCalculation({ coupon: null, bonus: useBonus });
          setCalculation(baseResult);
          setCalcError('');
        } catch (baseErr) {
          setCalculation(null);
          setCalcError(getRequestErrorMessage(baseErr));
        }
      } else {
        setCalcError(message);
        setCalculation(null);
      }
    } finally {
      setCalcLoading(false);
    }
  }

  async function handleApplyCoupon(e) {
    e.preventDefault();

    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    if (!items.length) {
      setCouponError('Your basket is empty.');
      return;
    }

    if (!selectedArea || !selectedSubArea) {
      setCouponError('Please select a delivery area and sub-area first.');
      return;
    }

    setCouponApplying(true);
    setCouponError('');

    try {
      const result = await requestCalculation({ coupon: code, bonus: useBonus });

      // Show the coupon as applied only after the server confirms it.
      if (
        !result.applied_coupon ||
        String(result.applied_coupon.code || '').trim().toUpperCase() !== code
      ) {
        throw new Error('The server did not confirm this coupon as valid.');
      }

      setAppliedCoupon(code);
      setCalculation(result);
      setCalcError('');
      setCouponError('');
      toast.success('Coupon applied successfully');
    } catch (err) {
      const message = getRequestErrorMessage(err, 'Coupon is invalid or inactive');
      setCouponError(message);
      setAppliedCoupon('');

      // An invalid coupon must not erase the order summary or bonus balance.
      try {
        const baseResult = await requestCalculation({ coupon: null, bonus: useBonus });
        setCalculation(baseResult);
        setCalcError('');
      } catch (baseErr) {
        setCalcError(getRequestErrorMessage(baseErr));
        setCalculation(null);
      }

      toast.error(message);
    } finally {
      setCouponApplying(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon('');
    setCouponCode('');
    setCouponError('');
    setCalcError('');
  }


function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}


  
async function handlePlaceOrder() {
  if (!isAuthenticated) {
    toast.error('Please log in or register before completing your order.', {
  duration: 2000,
});
    onNavigate('login');
    return;
  }

  if (user?.account_type === 'INTERNAL') {
    toast.error(
      'Access Denied: Internal staff/administrator accounts cannot place customer online store orders. Please use a customer account.', {
  duration: 2000,
}
    );
    return;
  }

  if (!selectedArea || !selectedSubArea) {
    toast.error('Please select a delivery Area and Sub-Area.', {
  duration: 2000,
});
    return;
  }

  if (!addressLine.trim() || !pincode.trim()) {
    toast.error('Please enter your street address and pincode.', {
  duration: 2000,
});
    return;
  }

  if (calcError) {
    toast.error(`Cannot place order: ${calcError}`, {
  duration: 2000,
});
    return;
  }

  if (!items.length) {
    toast.error('Your basket is empty.', {
  duration: 2000,
});
    return;
  }

  if (paymentMethod === 'RAZORPAY' && !razorpayEnabled) {
    toast.error('Online payment is currently unavailable.', {
  duration: 2000,
});
    return;
  }

  if (paymentMethod === 'COD' && !codEnabled) {
    toast.error('Cash on Delivery is currently unavailable.', {
  duration: 2000,
});
    return;
  }

  setPlacingOrder(true);

  try {
    // Save a newly entered address without blocking checkout.
    if (selectedAddressId === 'new') {
      client.post('/addresses', {
        area_id: selectedArea.id,
        sub_area_id: selectedSubArea.id,
        address_line: addressLine.trim(),
        landmark: landmark.trim(),
        pincode: pincode.trim(),
        is_default: savedAddresses.length === 0 ? 1 : 0,
      }).catch((error) => {
        console.warn('Address save failed:', error.message);
      });
    }

    const checkoutPayload = {
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      couponCode: appliedCoupon || null,
      useBonus,
      areaId: selectedArea.id,
      subAreaId: selectedSubArea.id,
      deliverySlotId: Number(selectedSlotId),
      deliveryAddress: addressLine.trim(),
      landmark: landmark.trim(),
      pincode: pincode.trim(),
      notificationPhone: notificationPhone.trim() || user?.mobile || '',
      source: 'ONLINE',
    };

    // COD keeps the existing order-placement flow.
    if (paymentMethod === 'COD') {
      const res = await client.post('/orders', {
        ...checkoutPayload,
        paymentMethod: 'COD',
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || 'Unable to place COD order');
      }

      const order = res.data;

      clearCart();
      onNavigate('order-success', {
        orderNumber: order.orderNumber,
        orderId: order.orderId,
      });

      return;
    }

    // Razorpay must NEVER call POST /orders before payment verification.
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded || !window.Razorpay) {
      throw new Error('Unable to load Razorpay Checkout. Please try again.');
    }

    // 1. Create a temporary checkout session and provider order.
const createRes = await client.post(
  '/payments/razorpay/create-order',
  checkoutPayload
);

   if (!createRes.success) {
  throw new Error(
    createRes.message || 'Unable to initialize Razorpay payment'
  );
}

   const paymentData = createRes.data ?? createRes;

console.log('[Razorpay] Payment data:', paymentData);

if (
  !paymentData.checkoutKey ||
  !paymentData.razorpayOrder?.id ||
  !paymentData.keyId
) {
  throw new Error('Invalid Razorpay checkout initialization response');
}
    // 2. Open the real Razorpay payment window.
    const options = {
      key: paymentData.keyId,
      amount: paymentData.razorpayOrder.amount,
      currency: paymentData.razorpayOrder.currency || 'INR',
      name: storeSettings?.store_name || 'Swastik Supermarket',
      description: 'Online supermarket order',
      order_id: paymentData.razorpayOrder.id,

      prefill: {
        name: paymentData.customer?.name || user?.name || '',
        contact:
          paymentData.customer?.mobile ||
          notificationPhone.trim() ||
          user?.mobile ||
          '',
      },

      notes: {
        checkout_key: paymentData.checkoutKey,
      },

      theme: {
        color: '#047857',
      },

      // 3. Verify using the REAL response from Razorpay.
      handler: async function (response) {
        try {
          const verifyRes = await client.post(
            '/payments/razorpay/verify',
            {
              checkoutKey: paymentData.checkoutKey,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }
          );

          if (!verifyRes.success || !verifyRes.order) {
            throw new Error(
              verifyRes.message ||
              'Payment verification is pending. Please check your order status.'
            );
          }

          const order = verifyRes.order;

          clearCart();

          onNavigate('order-success', {
            orderNumber: order.order_number || order.orderNumber,
            orderId: order.id || order.orderId,
          });
        } catch (error) {
          console.error('[Checkout] Razorpay verification error:', error);

          toast.error(
            'Payment was submitted, but order confirmation could not be completed. Do not pay again yet. Please check your order/payment status or contact support.', {
  duration: 2000,
}
          );
        } finally {
          setPlacingOrder(false);
        }
      },

      modal: {
        ondismiss: function () {
          setPlacingOrder(false);
        },
      },
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on('payment.failed', function (response) {
      console.error('[Razorpay] Payment failed:', response.error);

      toast.error(
        response.error?.description ||
        'Payment failed. You can try again.', {
  duration: 2000,
}
      );

      setPlacingOrder(false);
    });


    console.log('[Razorpay] Opening checkout:', {
  key: options.key,
  order_id: options.order_id,
  amount: options.amount,
  currency: options.currency,
});

  razorpay.open();

  } catch (error) {
    console.error('[Checkout] Order/payment initialization error:', error);

    toast.error(`Order placement failed: ${error.message}`, {
  duration: 2000,
});
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
                    placeholder="Near School"
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
            {/* <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
               <Clock className="w-4 h-4 text-emerald-600" />
              <span>3. Preferred Delivery Slot</span>
            </h3> */}
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
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      if (couponError) setCouponError('');
                    }}
                    placeholder="e.g. WELCOME50, FRESH10"
                    className="flex-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 uppercase font-bold"
                  />
                  <button
                    type="submit"
                    disabled={couponApplying || calcLoading}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {couponApplying ? 'Checking...' : 'Apply'}
                  </button>
                </form>
              )}
              {couponError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
                  {couponError}
                </div>
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
            {useBonus &&
              calculation &&
              Number(calculation.available_bonus || 0) > 0 &&
              Number(calculation.bonus_discount || 0) <= 0 && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
                  Bonus credit is available, but it is not eligible for this order. Check the welcome-bonus minimum order and coupon/membership rules.
                </p>
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

                {/* <div className="flex justify-between text-slate-600">
                  <span>Taxes (GST)</span>
                  <span>₹{calculation.tax}</span>
                </div> */}

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline text-sm">
                  <span className="font-bold text-slate-900">Grand Total</span>
                  <span className="text-xl font-black text-slate-950">₹{calculation.grand_total}</span>
                </div>
              </div>
            ) : calcLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Calculating order pricing...</div>
            ) : null}

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

           {razorpayEnabled && (
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
                  <div className="text-[10px] text-slate-500 font-normal">
                    UPI, Cards, NetBanking
                  </div>
                </div>
              </button>
            )}

            </div>
          </div>
            {/* Place Order CTA */}
            <button
              type="button"
              disabled={placingOrder || Boolean(calcError) || calcLoading || couponApplying || !calculation || user?.account_type === 'INTERNAL'}
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
