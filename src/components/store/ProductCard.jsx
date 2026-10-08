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
      <div
        onClick={() => onSelect && onSelect(product)}
        className="w-full aspect-4/3 bg-slate-50 overflow-hidden relative cursor-pointer"
      >
      <img
        src={getProductImageUrl(product)}
        alt={product.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center">
            <span className="bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Unit */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="font-semibold text-emerald-700 truncate max-w-[120px]">
              {product.brand_name || 'FreshMart'}
            </span>
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
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
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-slate-900">
                ₹{product.selling_price}
              </span>
              {product.original_price > product.selling_price && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{product.original_price}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block leading-none">
              Incl. all taxes
            </span>
          </div>

          {/* Add to Cart or Stepper */}
          {currentQty > 0 ? (
            <div className="flex items-center bg-emerald-600 text-white rounded-xl shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => updateQuantity(product.id, currentQty - 1)}
                className="p-1.5 hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-xs font-black min-w-[20px] text-center">
                {currentQty}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(product.id, currentQty + 1)}
                disabled={currentQty >= product.stock}
                className="p-1.5 hover:bg-emerald-700 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => addToCart(product.id, 1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 hover:border-transparent font-bold text-xs rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-95"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
