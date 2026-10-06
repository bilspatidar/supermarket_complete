import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Phone,
  MessageSquare,
  Clock3,
  Store,
} from 'lucide-react';
import client from '../../api/client.js';
import ProductCard from '../../components/store/ProductCard.jsx';

export default function HomePage({ onNavigate }) {
  const [sliders, setSliders] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  async function loadHomeData() {
    try {
      const [sliderRes, catRes, prodRes, settingsRes] = await Promise.all([
        client.get('/cms/sliders'),
        client.get('/categories'),
        client.get('/products?featured=1&limit=8'),
        client.get('/settings'),
      ]);

      if (sliderRes.success) setSliders(sliderRes.data || []);
      if (catRes.success) setCategories(catRes.data || []);
      if (prodRes.success) setFeaturedProducts(prodRes.data?.products || []);
      if (settingsRes.success) setStoreSettings(settingsRes.data || null);
    } catch (err) {
      console.warn('Failed to load home data:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-advance sliders if multiple active
  useEffect(() => {
    if (sliders.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % sliders.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [sliders.length]);

  const activeSlider = sliders[currentSlideIndex] || null;

  function handleSliderNav(url) {
    if (!url) {
      onNavigate('shop');
      return;
    }
    if (url.startsWith('/shop') || url === 'shop') {
      onNavigate('shop');
    } else if (url.startsWith('/membership') || url === 'membership') {
      onNavigate('membership');
    } else if (url.startsWith('/contact') || url === 'contact') {
      onNavigate('contact');
    } else if (url.startsWith('/page/') || url.startsWith('/')) {
      const slug = url.replace(/^\/(page\/)?/, '');
      onNavigate('cms', { slug });
    } else {
      onNavigate('shop');
    }
  }

  return (
    <div className="space-y-10 pb-12">
      
      {/* Dynamic Hero Banner / Slider Section */}
      {activeSlider ? (
        <section className="relative rounded-3xl overflow-hidden shadow-xl bg-slate-900 mx-4 sm:mx-6 lg:mx-8 mt-4 group">
          <picture className="absolute inset-0 z-0">
            {activeSlider.mobile_image && (
              <source media="(max-width: 640px)" srcSet={activeSlider.mobile_image} />
            )}
            <img
              src={activeSlider.image}
              alt={activeSlider.title}
              className="w-full h-full object-cover opacity-50 transform scale-102 transition-transform duration-700"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent" />

          <div className="relative z-10 max-w-2xl p-8 sm:p-14 lg:p-16 text-white space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Farm Fresh Supermarket</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              {activeSlider.title}
            </h1>

            {activeSlider.subtitle && (
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg">
                {activeSlider.subtitle}
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleSliderNav(activeSlider.link_url || activeSlider.button_url)}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>{activeSlider.button_text || 'Start Shopping'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('membership')}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
              >
                Explore VIP Savings
              </button>
            </div>
          </div>

          {/* Carousel Next/Prev Controls if multiple */}
          {sliders.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setCurrentSlideIndex((prev) => (prev === 0 ? sliders.length - 1 : prev - 1))
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentSlideIndex((prev) => (prev + 1) % sliders.length)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Indicator Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                {sliders.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === currentSlideIndex ? 'w-6 bg-emerald-400' : 'w-2 bg-white/50'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        /* Clean Default Section without fake slider data */
        <section className="relative rounded-3xl overflow-hidden shadow-xl bg-linear-to-br from-emerald-900 via-slate-900 to-slate-950 mx-4 sm:mx-6 lg:mx-8 mt-4 p-8 sm:p-14 text-white space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fresh Supermarket Direct</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-2xl">
            {storeSettings?.store_name || 'FreshMart Supermarket'}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg">
            {storeSettings?.store_tagline || 'Daily essentials, fresh vegetables, fruits, and groceries delivered fast to your doorstep.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>Start Shopping</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('membership')}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
            >
              Explore VIP Savings
            </button>
          </div>
        </section>
      )}

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
            type="button"
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
            type="button"
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
            type="button"
            onClick={() => onNavigate('membership')}
            className="px-6 py-3.5 bg-slate-950 hover:bg-slate-900 text-amber-300 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            View VIP Plans from ₹99
          </button>
        </div>
      </section>

      {/* COMPACT CONTACT / STORE INFORMATION SECTION (Requirement 6) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Contact &amp; Store Information
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Visit our physical supermarket walk-in counter or reach our instant delivery team.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <span>View Full Map &amp; Info</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Store Address */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900">Physical Location</h3>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {storeSettings?.store_address || 'Plot 42, Commercial Zone, Jabalpur, MP, 482002'}
              </p>
            </div>

            {/* Helpline */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900">Phone Support</h3>
              <p className="text-slate-700 font-mono font-bold text-[11px]">
                {storeSettings?.store_mobile || '+91 98765 43210'}
              </p>
              <span className="text-[10px] text-slate-400 block">Express Order Helpline</span>
            </div>

            {/* WhatsApp */}
            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-emerald-950">WhatsApp Desk</h3>
              <p className="text-emerald-800 font-mono font-bold text-[11px]">
                +{storeSettings?.store_whatsapp || storeSettings?.admin_whatsapp_number || '919876543210'}
              </p>
              <a
                href={`https://wa.me/${storeSettings?.store_whatsapp || storeSettings?.admin_whatsapp_number || '919876543210'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-emerald-700 hover:underline block"
              >
                Chat on WhatsApp &rarr;
              </a>
            </div>

            {/* Business Hours */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Clock3 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900">Opening Hours</h3>
              <p className="text-slate-600 text-[11px]">
                {storeSettings?.store_business_hours || 'Mon - Sun: 08:00 AM - 10:00 PM'}
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold block">30-Min Fast Delivery</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
