
import React from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import { useDelivery } from '../../context/DeliveryContext.jsx';
import { getProductImageUrl } from '../../utils/image.js';

export default function CartDrawer({ onNavigate }) {
  const {
    items,
    subtotal,
    count,
    isDrawerOpen,
    setIsDrawerOpen,
    updateQuantity,
  } = useCart();

  const { selectedSubArea } = useDelivery();

  if (!isDrawerOpen) return null;

  const freeDeliveryThreshold =
    Number(selectedSubArea?.effective_free_minimum) || 499;

  const remainingForFree = Math.max(
    0,
    freeDeliveryThreshold - subtotal
  );

  const progressPercent =
    freeDeliveryThreshold > 0
      ? Math.min(
          100,
          Math.round((subtotal / freeDeliveryThreshold) * 100)
        )
      : 100;

  function handleCheckout() {
    setIsDrawerOpen(false);
    onNavigate('checkout');
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close cart"
        onClick={() => setIsDrawerOpen(false)}
        className="absolute inset-0 h-full w-full bg-slate-900/50 backdrop-blur-[2px]"
      />

      {/* Drawer: stays within the visible viewport */}
      <div
        className="
          fixed inset-y-0 right-0 z-10
          flex h-full w-full min-w-0
          flex-col overflow-hidden bg-white
          shadow-2xl
          sm:w-[420px] sm:max-w-[90vw]
        "
        style={{
          height: '100dvh',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 bg-emerald-800 p-4 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <ShoppingBag className="h-5 w-5 shrink-0" />

            <div className="min-w-0">
              <h3 className="text-sm font-bold">
                My Grocery Basket
              </h3>
              <p className="text-[11px] text-emerald-200">
                {count} items in your basket
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close shopping cart"
            className="shrink-0 rounded-lg p-2 text-emerald-200 hover:bg-emerald-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free delivery progress */}
        <div className="shrink-0 border-b border-emerald-100 bg-emerald-50 p-3 text-xs">
          {remainingForFree > 0 ? (
            <>
              <p className="mb-1.5 text-emerald-900">
                Add{' '}
                <strong className="text-emerald-700">
                  ₹{remainingForFree}
                </strong>{' '}
                more to unlock{' '}
                <strong className="font-extrabold text-emerald-700">
                  FREE DELIVERY
                </strong>
                !
              </p>

              <div
                className="h-2 w-full overflow-hidden rounded-full bg-emerald-200"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
              >
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </>
          ) : (
            <p className="flex items-center gap-1.5 font-bold text-emerald-800">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Congratulations! You have unlocked FREE Delivery!
              </span>
            </p>
          )}
        </div>

        {/* Independently scrollable cart items */}
        <div
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 sm:p-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {items.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center p-6 text-center text-slate-500">
              <ShoppingBag className="mb-3 h-16 w-16 stroke-[1.5] text-slate-300" />

              <h4 className="text-base font-bold text-slate-800">
                Your basket is empty
              </h4>

              <p className="mt-1 max-w-xs text-xs text-slate-500">
                Browse fresh fruits, vegetables, dairy, and household essentials.
              </p>

              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onNavigate('shop');
                }}
                className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.cart_item_id}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2 sm:gap-3 sm:p-2.5"
                >
                  <img
                    src={
                      getProductImageUrl(item) ||
                      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80'
                    }
                    alt={item.name}
                    className="h-12 w-12 shrink-0 rounded-lg bg-white object-cover sm:h-14 sm:w-14"
                  />

                  {/* Product details can shrink without pushing controls offscreen */}
                  <div className="min-w-0 flex-1">
                    <h4
                      className="truncate text-xs font-bold text-slate-900"
                      title={item.name}
                    >
                      {item.name}
                    </h4>

                    <p className="truncate text-[11px] text-slate-500">
                      {item.unit}
                    </p>

                    <div className="mt-1 break-words text-[11px] font-black text-slate-900 sm:text-xs">
                      ₹{item.selling_price} × {item.quantity}
                      {' = '}
                      <span className="text-emerald-700">
                        ₹{item.line_total}
                      </span>
                    </div>
                  </div>

                  {/* Quantity controls never shrink or overflow */}
                  <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-white">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${item.name}`}
                      onClick={() =>
                        updateQuantity(
                          item.product_id,
                          item.quantity - 1
                        )
                      }
                      className="flex h-8 w-7 items-center justify-center rounded-l-lg hover:text-rose-600 sm:w-8"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="h-3.5 w-3.5" />
                      ) : (
                        <Minus className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <span className="min-w-[22px] px-1 text-center text-xs font-bold">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      aria-label={`Increase quantity of ${item.name}`}
                      onClick={() =>
                        updateQuantity(
                          item.product_id,
                          item.quantity + 1
                        )
                      }
                      disabled={item.quantity >= item.stock}
                      className="flex h-8 w-7 items-center justify-center rounded-r-lg hover:text-emerald-600 disabled:opacity-30 sm:w-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer stays visible while the items scroll */}
        {items.length > 0 && (
          <div className="shrink-0 space-y-3 border-t border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-600">
                Subtotal
              </span>

              <span className="text-base font-black text-slate-900">
                ₹{subtotal}
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-500">
              Delivery fees and discounts are calculated by the central
              pricing engine at checkout.
            </p>

            <button
              type="button"
              onClick={handleCheckout}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-emerald-700 active:scale-[0.98]"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
