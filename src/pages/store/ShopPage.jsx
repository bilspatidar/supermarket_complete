import React, { useEffect, useState } from 'react';
import { Filter, Search, X, SlidersHorizontal } from 'lucide-react';
import client from '../../api/client.js';
import ProductCard from '../../components/store/ProductCard.jsx';

export default function ShopPage({ initialCategory, initialSearch, onNavigate }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(initialSearch || '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || '');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search, selectedCategory, selectedBrand, sortBy]);

  async function loadFilters() {
    try {
      const [catRes, brandRes] = await Promise.all([
        client.get('/categories'),
        client.get('/brands'),
      ]);
      if (catRes.success) setCategories(catRes.data || []);
      if (brandRes.success) setBrands(brandRes.data || []);
    } catch (err) {
      console.warn('Failed to load filters:', err.message);
    }
  }

  async function loadProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedBrand) params.append('brand', selectedBrand);
      params.append('limit', '50');

      const res = await client.get(`/products?${params.toString()}`);
      if (res.success && res.data) {
        let prods = res.data.products || [];
        if (sortBy === 'price_asc') {
          prods.sort((a, b) => a.selling_price - b.selling_price);
        } else if (sortBy === 'price_desc') {
          prods.sort((a, b) => b.selling_price - a.selling_price);
        }
        setProducts(prods);
      }
    } catch (err) {
      console.warn('Failed to load products:', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header & Active query indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Supermarket Catalog</h1>
          <p className="text-xs text-slate-500">
            Showing {products.length} products with live inventory
          </p>
        </div>

        {/* Sort & Filter controls */}
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            <option value="featured">Recommended / Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3.5 py-1.5 rounded-full font-bold shrink-0 transition-colors cursor-pointer ${
            selectedCategory === ''
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300'
          }`}
        >
          All Items
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`px-3.5 py-1.5 rounded-full font-bold shrink-0 transition-colors cursor-pointer ${
              selectedCategory === cat.slug
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Active Search & Filter chips */}
      {(search || selectedCategory || selectedBrand) && (
        <div className="flex flex-wrap items-center gap-2 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-xs">
          <span className="font-bold text-emerald-900">Active filters:</span>
          {search && (
            <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 font-medium text-slate-800">
              Search: "{search}"
              <button onClick={() => setSearch('')} className="hover:text-rose-600 cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 font-medium text-slate-800">
              Category: {categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}
              <button onClick={() => setSelectedCategory('')} className="hover:text-rose-600 cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedBrand && (
            <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 font-medium text-slate-800">
              Brand: {brands.find(b => b.slug === selectedBrand)?.name || selectedBrand}
              <button onClick={() => setSelectedBrand('')} className="hover:text-rose-600 cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('');
              setSelectedBrand('');
            }}
            className="text-[11px] font-bold text-emerald-700 hover:underline ml-auto cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          Loading grocery items...
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Search className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No products found.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try searching for another grocery keyword like "atta", "milk", "apple" or clear your active filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onSelect={(item) => onNavigate('product', { id: item.id })}
            />
          ))}
        </div>
      )}

    </div>
  );
}
