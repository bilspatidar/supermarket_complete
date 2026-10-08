import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingCart, Plus, Minus, ShieldCheck, Truck, Clock, AlertCircle } from 'lucide-react';
import client from '../../api/client.js';
import { useCart } from '../../context/CartContext.jsx';
import { getProductImageUrl } from '../../utils/image.js';


export default function ProductDetailPage({ productId, onNavigate }) {
  const { items, addToCart, updateQuantity } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    loadProduct();
  }, [productId]);

  async function loadProduct() {
    setLoading(true);
    try {
      const res = await client.get(`/products/${productId}`);
      if (res.success && res.data) {
        setProduct(res.data);
        setActiveImage(res.data.image || '');
      }
    } catch (err) {
      console.warn('Failed to load product details:', err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="py-24 text-center text-slate-400 text-xs">Loading product details...</div>;
  }

  if (!product) {
    return (
      <div className="py-24 text-center space-y-3">
        <h3 className="text-base font-bold text-slate-800">Product Not Found</h3>
        <button
          onClick={() => onNavigate('shop')}
          className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const cartItem = items.find(i => i.product_id === product.id);
  const currentQty = cartItem ? cartItem.quantity : 0;
  const isOutOfStock = product.stock <= 0;
  const discountPercent = product.original_price > product.selling_price
    ? Math.round(((product.original_price - product.selling_price) / product.original_price) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Back button */}
      <button
        onClick={() => onNavigate('shop')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Products</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center relative">
            <img
             src={getProductImageUrl(product)}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {discountPercent > 0 && (
              <span className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Alternate image thumbnails */}
          {product.image2 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveImage(product.image)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 cursor-pointer ${
                  activeImage === product.image ? 'border-emerald-600' : 'border-transparent'
                }`}
              >
                <img src={product.image} alt="Thumbnail 1" className="w-full h-full object-cover" />
              </button>
              <button
                onClick={() => setActiveImage(product.image2)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 cursor-pointer ${
                  activeImage === product.image2 ? 'border-emerald-600' : 'border-transparent'
                }`}
              >
                <img src={product.image2} alt="Thumbnail 2" className="w-full h-full object-cover" />
              </button>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                {product.brand_name || 'Brand'}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                SKU: {product.product_code}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-3xl font-black text-slate-900">
                ₹{product.selling_price}
              </span>
              {product.original_price > product.selling_price && (
                <span className="text-lg text-slate-400 line-through">
                  ₹{product.original_price}
                </span>
              )}
              <span className="text-xs text-slate-500 font-medium">
                ({product.unit})
              </span>
            </div>

            {/* Live Stock Status */}
            <div className="pt-1">
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                  <AlertCircle className="w-4 h-4" /> Out of Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  In Stock ({product.stock} units available)
                </span>
              )}
            </div>

            {/* Description */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                About this item
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {product.description || 'Pure, high-grade supermarket essential with rigorous quality testing.'}
              </p>
            </div>
          </div>

          {/* Cart Stepper / Add button */}
          <div className="pt-6 border-t border-slate-100 flex items-center gap-4">
            {currentQty > 0 ? (
              <div className="flex items-center bg-emerald-600 text-white rounded-2xl p-1 shadow-md">
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, currentQty - 1)}
                  className="p-2.5 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-black min-w-[32px] text-center">
                  {currentQty}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, currentQty + 1)}
                  disabled={currentQty >= product.stock}
                  className="p-2.5 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={() => addToCart(product.id, 1)}
                className="flex-1 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Basket</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
