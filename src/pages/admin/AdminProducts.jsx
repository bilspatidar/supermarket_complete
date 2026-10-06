import React, { useEffect, useState } from 'react';
import { Package, Plus, Edit2, Trash2, Search, Upload, ShieldCheck, AlertCircle } from 'lucide-react';
import client from '../../api/client.js';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [taxPercent, setTaxPercent] = useState('5');
  const [unit, setUnit] = useState('1 kg');
  const [stock, setStock] = useState('20');
  const [minStock, setMinStock] = useState('5');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [image2, setImage2] = useState('');
  const [featured, setFeatured] = useState(false);

  useEffect(() => {
    loadData();
  }, [search]);

  async function loadData() {
    setLoading(true);
    try {
      const [prodsRes, catsRes, brandsRes] = await Promise.all([
        client.get(`/products?status=ALL&limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`),
        client.get('/categories'),
        client.get('/brands'),
      ]);

      if (prodsRes.success) setProducts(prodsRes.data?.products || []);
      if (catsRes.success) setCategories(catsRes.data || []);
      if (brandsRes.success) setBrands(brandsRes.data || []);
    } catch (err) {
      console.warn('Failed to load products:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingProduct(null);
    setName('');
    setProductCode('');
    setCategoryId(categories[0]?.id || '');
    setBrandId(brands[0]?.id || '');
    setOriginalPrice('');
    setSellingPrice('');
    setTaxPercent('5');
    setUnit('1 kg');
    setStock('25');
    setMinStock('5');
    setDescription('');
    setImage('https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80');
    setImage2('');
    setFeatured(false);
    setIsModalOpen(true);
  }

  function openEditModal(prod) {
    setEditingProduct(prod);
    setName(prod.name);
    setProductCode(prod.product_code);
    setCategoryId(prod.category_id);
    setBrandId(prod.brand_id || '');
    setOriginalPrice(prod.original_price);
    setSellingPrice(prod.selling_price);
    setTaxPercent(prod.tax_percent);
    setUnit(prod.unit);
    setStock(prod.stock);
    setMinStock(prod.minimum_stock);
    setDescription(prod.description || '');
    setImage(prod.image || '');
    setImage2(prod.image2 || '');
    setFeatured(Boolean(prod.featured));
    setIsModalOpen(true);
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        product_code: productCode,
        category_id: Number(categoryId),
        brand_id: brandId ? Number(brandId) : null,
        original_price: Number(originalPrice),
        selling_price: Number(sellingPrice),
        tax_percent: Number(taxPercent),
        unit,
        stock: Number(stock),
        minimum_stock: Number(minStock),
        description,
        image,
        image2,
        featured: featured ? 1 : 0,
      };

      if (editingProduct) {
        await client.put(`/products/${editingProduct.id}`, payload);
      } else {
        await client.post('/products', payload);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(id) {
    if (!confirm('Are you sure you want to deactivate this product?')) return;
    try {
      await client.delete(`/products/${id}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Product Catalog</h1>
          <p className="text-xs text-slate-500">Manage supermarket items, SKU codes, pricing, and stock levels</p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter products by code, name, category, or brand..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-hidden focus:border-emerald-500 font-medium"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Product</th>
                <th className="p-3.5">SKU / Code</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Selling Price</th>
                <th className="p-3.5">Stock</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading products...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">No products found.</td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.stock <= p.minimum_stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 flex items-center gap-3">
                        <img
                          src={p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&q=80'}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded-lg bg-slate-100 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-400">{p.unit}</div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-slate-700">
                        {p.product_code}
                      </td>

                      <td className="p-3.5 font-semibold text-slate-600">
                        {p.category_name}
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-900">₹{p.selling_price}</span>
                        {p.original_price > p.selling_price && (
                          <span className="text-[10px] text-slate-400 line-through ml-1.5">
                            ₹{p.original_price}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className={`font-black text-xs ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                          {p.stock}
                        </span>
                        {isLow && (
                          <span className="text-[10px] text-rose-500 font-bold block">
                            Low (min {p.minimum_stock})
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="p-1.5 hover:text-emerald-600 text-slate-500 transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 hover:text-rose-600 text-slate-400 transition-colors cursor-pointer"
                          title="Deactivate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Product Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Fresh Shimla Apples"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SKU / Product Code</label>
                  <input
                    type="text"
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    placeholder="Leave blank for auto SP0000XX"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Brand</label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
                  >
                    <option value="">No Brand (Generic)</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    required
                    placeholder="180"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    required
                    placeholder="149"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    required
                    placeholder="1 kg or 500 g"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {editingProduct ? 'Current Stock' : 'Initial Stock'}
                  </label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    disabled={Boolean(editingProduct)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100"
                  />
                  {editingProduct && (
                    <span className="text-[10px] text-slate-400">Use Inventory Ledger to adjust</span>
                  )}
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Minimum Alert Stock</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">GST Tax %</label>
                  <input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-700 block mb-1">Image URL</label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Product specifications..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-bold text-slate-800">Feature on Homepage</span>
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
