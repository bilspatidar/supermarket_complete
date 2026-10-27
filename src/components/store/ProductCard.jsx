import React from 'react';
import { Plus, Minus, ShoppingCart, AlertCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import { getProductImageUrl } from '../../utils/image.js';

export default function ProductCard({ product, onSelect }) {
  const { items, addToCart, updateQuantity } = useCart();

  const cartItem = items.find(i => i.product_id === product.id);
  const currentQty = cartItem ? cartItem.quantity : 0;
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= (product.minimum_stock || 5);

  const discountPercent = product.original_price > product.selling_price
    ? Math.round(((product.original_price - product.selling_price) / product.original_price) * 100)
    : 0;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden relative">
      
      {/* Discount Tag */}
      {discountPercent > 0 && (
        <span className="absolute top-2.5 left-2.5 z-10 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
          {discountPercent}% OFF
        </span>
      )}

      {/* Product Image */}
   {/* Product Image */}
       {/* Product Image */}
       {/* Product Image */}
{/* Product Image */}
{/* Product Image */}
{/* Product Image */}
<div
  onClick={() => onSelect && onSelect(product)}
  className="relative aspect-[4/3] w-full shrink-0 cursor-pointer overflow-hidden bg-[#AEB0AC]"
>
  <img
    src={getProductImageUrl(product)}
    alt={product.name}
    className="absolute inset-0 h-full w-full object-contain object-center"
    loading="lazy"
  />

  {isOutOfStock && (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50">
      <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
        Out of Stock
      </span>
    </div>
  )}
</div>

      {/* Product Info */}
    <div className="flex flex-1 flex-col p-3">
          <div>
          {/* Brand & Unit */}
          {/* <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="font-semibold text-emerald-700 truncate max-w-[120px]">
              {product.brand_name || 'Swastik'}
            </span>
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
              {product.unit}
            </span>
          </div> */}

          {/* Brand & Unit */}
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] mb-1">
            <span className="min-w-0 flex-1 truncate font-semibold text-emerald-700">
              {product.brand_name || 'Swastik'}
            </span>

            <span className="shrink-0 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
              {product.unit}
            </span>
          </div>

          {/* Title */}
          <h3
            onClick={() => onSelect && onSelect(product)}
            className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 hover:text-emerald-600 cursor-pointer transition-colors min-h-[2.5rem]"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Stock Alert */}
          {isLowStock && (
            <p className="mt-1 text-[10px] text-amber-700 font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Only {product.stock} left in stock!
            </p>
          )}
        </div>

              

{/* Pricing & Cart Action */}
<div className="mt-3 border-t border-slate-100 pt-2.5">
  {/* Selling Price and Original Price: Same Row */}
  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
    <span className="whitespace-nowrap text-base font-black leading-tight text-slate-900">
      ₹{Number(product.selling_price).toFixed(2)}
    </span>

    {Number(product.original_price) > Number(product.selling_price) && (
      <span className="whitespace-nowrap text-sm leading-tight text-slate-400 line-through">
        ₹{Number(product.original_price).toFixed(2)}
      </span>
    )}
  </div>

  {/* Wide, Centered Cart Button / Quantity Stepper */}
  <div className="mt-2.5 flex w-full justify-center">
    {currentQty > 0 ? (
      <div className="flex h-8 w-full text-sm max-w-full items-center justify-between overflow-hidden rounded-full bg-emerald-600 text-white shadow-sm">
        <button
          type="button"
          aria-label={`Decrease ${product.name} quantity`}
          onClick={() => updateQuantity(product.id, currentQty - 1)}
          className="flex h-full w-14 shrink-0 items-center justify-center transition-colors hover:bg-emerald-700"
        >
          <Minus className="h-4 w-4" />
        </button>

        <span className="flex-1 text-center text-sm font-black">
          {currentQty}
        </span>

        <button
          type="button"
          aria-label={`Increase ${product.name} quantity`}
          onClick={() => updateQuantity(product.id, currentQty + 1)}
          disabled={currentQty >= product.stock}
          className="flex h-full w-14 shrink-0 items-center justify-center transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <button
        type="button"
        disabled={isOutOfStock}
        onClick={() => addToCart(product.id, 1)}
        className="flex h-9 w-full max-w-full items-center justify-center gap-2 rounded-full border-2 border-emerald-400 bg-white px-4 text-base font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span>Add to Cart</span>
      </button>
    )}
  </div>
</div>



      </div>
    </div>
  );
}
