import React, { useState, useEffect } from 'react';
import { Printer, X, CheckCircle, Store, Phone, MapPin, Receipt, FileText } from 'lucide-react';
import client from '../../api/client.js';

export default function PrintBillModal({ orderData, onClose }) {
  const [thermalMode, setThermalMode] = useState(true); // Default 80mm thermal receipt
  const [storeSettings, setStoreSettings] = useState({
    store_name: 'FreshMart Supermarket',
    store_address: 'Plot 42, Commercial Zone, Jabalpur, MP, 482002',
    store_mobile: '+91 98765 43210',
    store_gst: '23AAAAA0000A1Z5',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await client.get('/settings');
      if (res.success && res.data) {
        setStoreSettings(prev => ({ ...prev, ...res.data }));
      }
    } catch (e) {
      // Use defaults
    }
  }

  if (!orderData) return null;

  // Normalize order & items depending on whether it came from POS or OrderDetails
  const order = orderData.order || orderData;
  const items = orderData.items || orderData.calculation?.items || [];
  const orderNumber = order.order_number || order.orderNumber || orderData.orderNumber;
  const grandTotal = order.grand_total || order.grandTotal || orderData.calculation?.grand_total || 0;
  const subtotal = order.subtotal || orderData.calculation?.subtotal || grandTotal;
  const tax = order.tax || order.tax_total || orderData.calculation?.tax || 0;
  const couponDiscount = order.coupon_discount || orderData.calculation?.coupon_discount || 0;
  const membershipDiscount = order.membership_discount || orderData.calculation?.membership_discount || 0;
  const bonusDiscount = order.bonus_discount || orderData.calculation?.bonus_discount || 0;
  const deliveryCharge = order.delivery_charge || orderData.calculation?.delivery_charge || 0;
  const paymentMethod = order.payment_method || orderData.paymentMethod || 'CASH';
  const paymentStatus = order.payment_status || 'PAID';
  const customerName = order.customer_name || order.customerName || 'Walk-in Shopper';
  const customerMobile = order.customer_mobile || order.customerMobile || order.notification_phone || '—';
  const createdAt = order.created_at ? new Date(order.created_at) : new Date();

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white print:static">
      
      {/* Print-specific style overrides */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-bill, #printable-bill * {
            visibility: visible !important;
          }
          #printable-bill {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${thermalMode ? '80mm' : '100%'} !important;
            max-width: ${thermalMode ? '80mm' : '100%'} !important;
            margin: 0 !important;
            padding: ${thermalMode ? '4mm' : '10mm'} !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col print:max-h-none print:overflow-visible print:shadow-none print:border-none print:max-w-none print:w-auto">
        
        {/* Modal Top Bar (Hidden on print) */}
        <div className="no-print p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-sm text-slate-900">Tax Invoice / Bill Print</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle: 80mm Thermal vs Normal A4 */}
            <div className="bg-slate-200 p-0.5 rounded-xl flex text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setThermalMode(true)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  thermalMode ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setThermalMode(false)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  !thermalMode ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard A4
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT BILL</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Bill Area */}
        <div className="p-5 flex justify-center bg-slate-100/50 print:bg-white print:p-0">
          <div
            id="printable-bill"
            className={`bg-white shadow-sm border border-slate-200 text-slate-900 p-5 font-mono ${
              thermalMode
                ? 'w-[320px] text-[11px] leading-tight rounded-xl'
                : 'w-full text-xs leading-normal rounded-2xl'
            }`}
          >
            {/* Store Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-black text-sm tracking-tight uppercase">
                {storeSettings.store_name || 'FreshMart Supermarket'}
              </h2>
              <p className="text-[10px] text-slate-600">
                {storeSettings.store_address}
              </p>
              <p className="text-[10px] text-slate-600">
                Phone: {storeSettings.store_mobile} | GSTIN: {storeSettings.store_gst || 'N/A'}
              </p>
              <div className="pt-1 font-bold tracking-wider text-[11px] uppercase">
                TAX INVOICE / CASH MEMO
              </div>
            </div>

            {/* Bill Info Row */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Bill #: <strong>#{orderNumber}</strong></span>
                <span>Date: {createdAt.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Time: {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>Source: {order.source || 'IN_HOUSE'}</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span>Customer: <strong>{customerName}</strong></span>
                <span>Mob: {customerMobile}</span>
              </div>
              {order.delivery_staff_name && (
                <div className="flex justify-between text-slate-600">
                  <span>Delivered By:</span>
                  <strong>{order.delivery_staff_name}</strong>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-[10px] uppercase pb-1 border-b border-slate-200 mb-1">
                <span className="w-1/2">Item</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/6 text-right">Rate</span>
                <span className="w-1/6 text-right">Amt</span>
              </div>

              <div className="space-y-1">
                {items.map((item, idx) => {
                  const name = item.product_name || item.name || `Item ${idx + 1}`;
                  const qty = item.quantity || 1;
                  const rate = item.applied_price || item.selling_price || item.price || 0;
                  const itemTotal = item.total || (qty * rate);
                  return (
                    <div key={item.id || idx} className="flex justify-between text-[10px]">
                      <span className="w-1/2 truncate font-semibold">{name}</span>
                      <span className="w-1/6 text-center">{qty}</span>
                      <span className="w-1/6 text-right">₹{rate}</span>
                      <span className="w-1/6 text-right font-bold">₹{itemTotal}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal}</span>
              </div>

              {membershipDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>VIP Discount:</span>
                  <span>-₹{membershipDiscount}</span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount:</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              )}

              {bonusDiscount > 0 && (
                <div className="flex justify-between text-amber-800">
                  <span>Welcome Credit:</span>
                  <span>-₹{bonusDiscount}</span>
                </div>
              )}

              {deliveryCharge > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span>₹{deliveryCharge}</span>
                </div>
              )}

              {tax > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>GST (Included):</span>
                  <span>₹{tax}</span>
                </div>
              )}

              <div className="flex justify-between text-xs font-black pt-1.5 border-t border-slate-300">
                <span>GRAND TOTAL:</span>
                <span className="text-sm">₹{grandTotal}</span>
              </div>
            </div>

            {/* Payment & Cash Collection Details */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <strong>{paymentMethod}</strong>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <strong className="uppercase">{paymentStatus}</strong>
              </div>
              {paymentMethod === 'COD' && (
                <div className="flex justify-between text-slate-700">
                  <span>Cash Collection:</span>
                  <span>{paymentStatus === 'COD_COLLECTED' || paymentStatus === 'COD_SETTLED' ? `Collected ₹${grandTotal}` : 'Pending Collection'}</span>
                </div>
              )}
            </div>

            {/* Footer Message & Barcode-like layout */}
            <div className="pt-3 text-center text-[9px] text-slate-500 space-y-1">
              <p className="font-bold uppercase tracking-wider text-slate-800">
                *** THANK YOU FOR SHOPPING! ***
              </p>
              <p>For return / exchange, please retain this original invoice.</p>
              <div className="pt-1 font-mono tracking-widest text-[8px] text-slate-400">
                |||||| | |||| ||| ||||||| |||| |||||
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions (Hidden on print) */}
        <div className="no-print p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-3xl">
          <p className="text-[11px] text-slate-500">
            Supports Standard A4 and 80mm thermal receipt roll printers.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT BILL</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
