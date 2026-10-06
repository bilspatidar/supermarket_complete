import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Truck, Clock, Award, ChevronRight } from 'lucide-react';
import client from '../../api/client.js';
import ProductCard from '../../components/store/ProductCard.jsx';

export default function HomePage({ onNavigate }) {
  const [sliders, setSliders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  async function loadHomeData() {
    try {
      const [sliderRes, catRes, prodRes] = await Promise.all([
        client.get('/cms/sliders'),
        client.get('/categories'),
        client.get('/products?featured=1&limit=8'),
      ]);

      if (sliderRes.success) setSliders(sliderRes.data || []);
      if (catRes.success) setCategories(catRes.data || []);
      if (prodRes.success) setFeaturedProducts(prodRes.data?.products || []);
    } catch (err) {
      console.warn('Failed to load home data:', err.message);
    } finally {
      setLoading(false);
    }
  }

  const activeSlider = sliders[0] || {
    title: 'Farm Fresh Goodness Delivered',
    subtitle: 'Crisp apples, daily veggies and unpolished pulses at everyday low prices',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80',
    button_text: 'Shop Essentials',
  };

  return (
    <div className="space-y-10 pb-12">
      
      {/* Hero Banner Section */}
      <section className="relative rounded-3xl overflow-hidden shadow-xl bg-slate-900 mx-4 sm:mx-6 lg:mx-8 mt-4">
        <div className="absolute inset-0 z-0">
          <img
            src={activeSlider.image}
            alt={activeSlider.title}
            className="w-full h-full object-cover opacity-45 transform scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-2xl p-8 sm:p-14 lg:p-16 text-white space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Farm Direct to Table</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {activeSlider.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg">
            {activeSlider.subtitle}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('shop')}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>{activeSlider.button_text || 'Start Shopping'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('membership')}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
            >
              Explore VIP Savings
            </button>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Explore by Category
            </h2>
            <p className="text-xs text-slate-500">Carefully curated fresh groceries and daily needs</p>
          </div>
          <button
            onClick={() => onNavigate('shop')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onNavigate('shop', { category: cat.slug })}
              className="group bg-white rounded-2xl p-3 border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-emerald-50/50 group-hover:scale-105 transition-transform">
                <img
                  src={cat.image || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80'}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 line-clamp-2">
                {cat.name}
              </h3>
            </div>
          ))}
        </div>
      </section>

      {/* Featured / Fresh Produce Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Top Picks &amp; Fresh Essentials
              </h2>
            </div>
            <p className="text-xs text-slate-500">Popular items ordered right now in Jabalpur</p>
          </div>
          <button
            onClick={() => onNavigate('shop')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Browse Full Store</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading fresh catalog...</div>
        ) : featuredProducts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No products found.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={(p) => onNavigate('product', { id: p.id })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Membership VIP Promo Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <span className="bg-black/20 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
              FreshMart VIP Club
            </span>
            <h3 className="text-2xl sm:text-3xl font-black">
              Unlock Unlimited Free Delivery &amp; Up to 10% Extra Discount
            </h3>
            <p className="text-xs sm:text-sm text-amber-100">
              Join Silver Saver or Gold VIP plans. Stack discounts on top of coupons and promotional welcome bonus!
            </p>
          </div>
          <button
            onClick={() => onNavigate('membership')}
            className="px-6 py-3.5 bg-slate-950 hover:bg-slate-900 text-amber-300 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            View VIP Plans from ₹99
          </button>
        </div>
      </section>

    </div>
  );
}
