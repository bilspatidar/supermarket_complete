import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import { useDelivery } from '../../context/DeliveryContext.jsx';

export default function CartDrawer({ onNavigate }) {
  const { items, subtotal, count, isDrawerOpen, setIsDrawerOpen, updateQuantity } = useCart();
  const { selectedSubArea } = useDelivery();

  if (!isDrawerOpen) return null;

  const freeDeliveryThreshold = selectedSubArea?.effective_free_minimum || 499;
  const remainingForFree = Math.max(0, freeDeliveryThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));

  function handleCheckout() {
    setIsDrawerOpen(false);
    onNavigate('checkout');
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-2xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <div>
                <h3 className="text-sm font-bold">My Grocery Basket</h3>
                <p className="text-[11px] text-emerald-200">{count} items in your basket</p>
              </div>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Delivery Bar */}
          <div className="p-3 bg-emerald-50 border-b border-emerald-100 text-xs">
            {remainingForFree > 0 ? (
              <div>
                <p className="text-emerald-900 font-semibold mb-1.5">
                  Add <strong className="text-emerald-700">₹{remainingForFree}</strong> more to unlock <span className="font-extrabold text-emerald-700">FREE DELIVERY</span>!
                </p>
                <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-emerald-800 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>🎉 Congratulations! You have unlocked FREE Delivery!</span>
              </p>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <ShoppingBag className="w-16 h-16 text-slate-300 mb-3 stroke-[1.5]" />
                <h4 className="text-base font-bold text-slate-800">Your basket is empty</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Browse fresh fruits, vegetables, dairy, and household essentials.
                </p>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onNavigate('shop');
                  }}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.cart_item_id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80'}
                    alt={item.name}
                    className="w-14 h-14 object-cover rounded-lg bg-white shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate" title={item.name}>
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">{item.unit}</p>
                    <div className="mt-1 text-xs font-black text-slate-900">
                      ₹{item.selling_price} × {item.quantity} = <span className="text-emerald-700">₹{item.line_total}</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="p-1 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="px-2 text-xs font-bold min-w-[18px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      className="p-1 hover:text-emerald-600 transition-colors disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Subtotal</span>
                <span className="text-base font-black text-slate-900">₹{subtotal}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Delivery fees &amp; discounts calculated strictly by central pricing engine at checkout.
              </p>
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
