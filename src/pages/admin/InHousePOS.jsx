import React, { useEffect, useState } from 'react';
import { Search, Plus, Minus, Trash2, Printer, CreditCard, Banknote, User, CheckCircle, Tag, Gift, AlertCircle, ShoppingBag } from 'lucide-react';
import client from '../../api/client.js';

export default function InHousePOS() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  
  // Selected customer (or Walk-in)
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');

  // POS Cart
  const [posItems, setPosItems] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [useBonus, setUseBonus] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Calculation & Order
  const [calculation, setCalculation] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (posItems.length > 0) {
      calculatePosOrder();
    } else {
      setCalculation(null);
    }
  }, [posItems, selectedCustomerId, appliedCoupon, useBonus]);

  async function loadProducts() {
    try {
      const res = await client.get('/products?limit=100');
      if (res.success && res.data) {
        setProducts(res.data.products || []);
      }
    } catch (err) {
      console.warn('POS failed to load products:', err.message);
    }
  }

  async function loadCustomers() {
    try {
      const res = await client.get('/customers?limit=100');
      if (res.success && res.data) {
        setCustomers(res.data.customers || []);
      }
    } catch (err) {
      console.warn('POS failed to load customers:', err.message);
    }
  }

  async function calculatePosOrder() {
    setCalcLoading(true);
    try {
      const res = await client.post('/orders/calculate', {
        items: posItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        userId: selectedCustomerId ? Number(selectedCustomerId) : null,
        couponCode: appliedCoupon || null,
        useBonus,
        source: 'IN_HOUSE',
      });
      if (res.success) {
        setCalculation(res.data);
      }
    } catch (err) {
      console.warn('POS calculation error:', err.message);
    } finally {
      setCalcLoading(false);
    }
  }

  function addItemToPos(prod) {
    if (prod.stock <= 0) {
      alert(`Product ${prod.name} is out of stock!`);
      return;
    }

    setPosItems(prev => {
      const existing = prev.find(i => i.product_id === prod.id);
      if (existing) {
        if (existing.quantity >= prod.stock) {
          alert(`Cannot add more than ${prod.stock} units`);
          return prev;
        }
        return prev.map(i => i.product_id === prod.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        return [...prev, {
          product_id: prod.id,
          name: prod.name,
          product_code: prod.product_code,
          selling_price: prod.selling_price,
          unit: prod.unit,
          stock: prod.stock,
          quantity: 1,
        }];
      }
    });
  }

  function updateItemQty(productId, qty) {
    if (qty <= 0) {
      setPosItems(prev => prev.filter(i => i.product_id !== productId));
    } else {
      setPosItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
    }
  }

  async function handleCheckoutPos() {
    if (posItems.length === 0) {
      alert('POS cart is empty!');
      return;
    }

    setPlacingOrder(true);
    try {
      const res = await client.post('/orders', {
        items: posItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        couponCode: appliedCoupon || null,
        useBonus,
        paymentMethod,
        source: 'IN_HOUSE',
        targetCustomerId: selectedCustomerId ? Number(selectedCustomerId) : null,
        deliveryAddress: 'In-Store Walk-in Billing',
        notes: `In-House POS order billed via ${paymentMethod}`,
      });

      if (res.success && res.data) {
        setLastOrder(res.data);
        setPosItems([]);
        setAppliedCoupon('');
        setCouponCode('');
        setUseBonus(false);
        loadProducts(); // refresh live stock
      }
    } catch (err) {
      alert(`POS order failed: ${err.message}`);
    } finally {
      setPlacingOrder(false);
    }
  }

  const filteredProducts = products.filter(p => {
    if (!searchProduct.trim()) return true;
    const q = searchProduct.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.product_code.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      
      {/* POS Header banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>In-House POS Register</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full font-bold">
              Counter #1
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Unified Pricing Engine • Instant Stock Deduction • WhatsApp Receipt
          </p>
        </div>

        {/* Customer Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <User className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Walk-in Customer (Guest)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.mobile})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* POS Grid: Product Catalog Left (7 cols) + Billing Ticket Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Product Search & Quick Grid */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              placeholder="Search by product name or scan SKU barcode (e.g. SP000001)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-emerald-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto p-1">
            {filteredProducts.map((p) => {
              const isOut = p.stock <= 0;
              return (
                <div
                  key={p.id}
                  onClick={() => !isOut && addItemToPos(p)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isOut
                      ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                      : 'border-slate-200 hover:border-emerald-500 hover:shadow-xs bg-white'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 block">{p.product_code}</span>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5">{p.name}</h4>
                    <span className="text-[10px] text-slate-500">{p.unit}</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">₹{p.selling_price}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      p.stock > 5 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                    }`}>
                      {p.stock} left
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right: POS Order Ticket */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Current Register Ticket</span>
            </h3>
            <span className="text-xs text-slate-500 font-bold">{posItems.length} items</span>
          </div>

          {/* Ticket items table */}
          <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
            {posItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                Click products on the left or scan barcodes to begin ticket.
              </div>
            ) : (
              posItems.map(item => (
                <div key={item.product_id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-bold text-slate-900 truncate">{item.name}</div>
                    <div className="text-[11px] text-slate-500">₹{item.selling_price} × {item.quantity} = ₹{item.selling_price * item.quantity}</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateItemQty(item.product_id, item.quantity - 1)}
                      className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold px-1 text-center min-w-[16px]">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateItemQty(item.product_id, item.quantity + 1)}
                      className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateItemQty(item.product_id, 0)}
                      className="p-1 text-rose-500 hover:text-rose-700 ml-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Discounts / Perks check */}
          {posItems.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code (optional)"
                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-bold"
                />
                <button
                  type="button"
                  onClick={() => setAppliedCoupon(couponCode.trim().toUpperCase())}
                  className="px-3 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {selectedCustomerId && calculation?.available_bonus > 0 && (
                <label className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useBonus}
                    onChange={(e) => setUseBonus(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <span className="font-bold text-amber-900 text-[11px]">
                    Redeem Customer Welcome Bonus Credit (Avail: ₹{calculation.available_bonus})
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Pricing Engine Calculation Breakdown */}
          {calculation && (
            <div className="space-y-1.5 pt-3 border-t border-slate-200 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">₹{calculation.subtotal}</span>
              </div>
              {calculation.membership_discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>VIP Discount</span>
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
                  <span>Bonus Credit</span>
                  <span>-₹{calculation.bonus_discount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax (GST)</span>
                <span>₹{calculation.tax}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline text-sm">
                <span className="font-bold text-slate-900">Total Due</span>
                <span className="text-xl font-black text-emerald-800">₹{calculation.grand_total}</span>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer font-bold ${
                paymentMethod === 'CASH'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Cash Bill</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('CARD_POS')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer font-bold ${
                paymentMethod === 'CARD_POS'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Card / UPI POS</span>
            </button>
          </div>

          {/* Complete Billing CTA */}
          <button
            type="button"
            disabled={posItems.length === 0 || placingOrder || calcLoading}
            onClick={handleCheckoutPos}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md transition-transform active:scale-98 cursor-pointer disabled:opacity-40"
          >
            {placingOrder ? 'Processing Bill...' : `Complete Sale & Print Receipt • ₹${calculation?.grand_total || '0'}`}
          </button>

          {/* Last Order Receipt preview */}
          {lastOrder && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5 text-emerald-950 animate-fade-in">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Bill Generated #{lastOrder.orderNumber}
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3 h-3" /> Print
                </button>
              </div>
              <p className="text-[11px] text-emerald-800">
                Inventory updated. WhatsApp receipt dispatched to customer if mobile was provided.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
