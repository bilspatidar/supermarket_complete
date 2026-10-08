import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Upload,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  X,
  FileSpreadsheet,
  Download,
  Tag,
  Briefcase,
  Layers,
  Power,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import client from '../../api/client.js';
import ImageUploader from '../../components/common/ImageUploader.jsx';
import ImagePreview from '../../components/common/ImagePreview.jsx';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getProductImageUrl } from '../../utils/image.js';

export default function AdminProducts() {
  const { roles, permissions } = useAuth();
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'categories', 'brands', 'bulk'

  // Products State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [imageFilter, setImageFilter] = useState('');
  const [stockSort, setStockSort] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [productHasMore, setProductHasMore] = useState(true);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);

  const PRODUCTS_PER_PAGE = 100;

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // Product Form Fields
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [taxPercent, setTaxPercent] = useState('5');
  const [unit, setUnit] = useState('1 kg');
  const [stock, setStock] = useState('25');
  const [minStock, setMinStock] = useState('5');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [image2, setImage2] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [image2File, setImage2File] = useState(null);
  const [featured, setFeatured] = useState(false);

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catSort, setCatSort] = useState('0');
  const [savingCat, setSavingCat] = useState(false);

  // Brand Modal State
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [brandLogo, setBrandLogo] = useState('');
  const [savingBrand, setSavingBrand] = useState(false);

  // Bulk Import State
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkValidationErrors, setBulkValidationErrors] = useState([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  // Delete Confirm Modal State
  const [deleteModalItem, setDeleteModalItem] = useState(null); // { type: 'product'|'category'|'brand', item }
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setProductPage(1);
    setProductHasMore(true);
    loadAllData(1, false);
  }, [search,imageFilter,stockSort]);


  async function loadAllData(pageNumber = 1, append = false) {
    if (pageNumber === 1) {
      setLoading(true);
    } else {
      setLoadingMoreProducts(true);
    }
  
    try {
      const productParams = new URLSearchParams();
  
      productParams.append('status', 'ALL');
      productParams.append('page', String(pageNumber));
      productParams.append('limit', String(PRODUCTS_PER_PAGE));
  
      if (search) {
        productParams.append('search', search);
      }

      if (imageFilter) {
        productParams.append('image', imageFilter);
      }

      if (stockSort) {
        productParams.append('stockSort', stockSort);
      }
  
      const productRequest = client.get(
        `/products?${productParams.toString()}`
      );
  
      // Categories & brands only need to be loaded on first page
      const requests = [productRequest];
  
      if (pageNumber === 1) {
        requests.push(
          client.get('/categories?includeInactive=true'),
          client.get('/brands?includeInactive=true')
        );
      }
  
      const results = await Promise.all(requests);
  
      const prodsRes = results[0];
  
      if (prodsRes.success) {
        const newProducts = prodsRes.data?.products || [];
        const pagination = prodsRes.data?.pagination;
  
        if (append) {
          setProducts(prev => [...prev, ...newProducts]);
        } else {
          setProducts(newProducts);
        }
  
        setProductPage(pageNumber);
  
        if (pagination) {
          setTotalProducts(pagination.total || 0);
          setProductHasMore(pageNumber < pagination.pages);
        } else {
          setTotalProducts(newProducts.length);
          setProductHasMore(
            newProducts.length === PRODUCTS_PER_PAGE
          );
        }
      }
  
      if (pageNumber === 1) {
        const catsRes = results[1];
        const brandsRes = results[2];
  
        if (catsRes?.success) {
          setCategories(catsRes.data || []);
        }
  
        if (brandsRes?.success) {
          setBrands(brandsRes.data || []);
        }
      }
    } catch (err) {
      console.warn(
        'Failed to load catalog data:',
        err.message
      );
    } finally {
      setLoading(false);
      setLoadingMoreProducts(false);
    }
  }

  async function handleLoadMoreProducts() {
    if (loadingMoreProducts || !productHasMore) {
      return;
    }
  
    await loadAllData(productPage + 1, true);
  }

  // --- PRODUCT CRUD ---
  function openCreateProductModal() {
    setEditingProduct(null);
    setName('');
    const count = products.length + 1;
    setProductCode(`SP${count.toString().padStart(6, '0')}`);
    setCategoryId(categories[0]?.id || '');
    setBrandId(brands[0]?.id || '');
    setOriginalPrice('');
    setSellingPrice('');
    setTaxPercent('5');
    setUnit('1 kg');
    setStock('25');
    setMinStock('5');
    setDescription('');
    setImage('');
    setImage2('');
    setImageFile(null);
    setImage2File(null);
    setFeatured(false);
    setIsProductModalOpen(true);
  }

  function openEditProductModal(prod) {
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
    setImageFile(null);
    setImage2File(null);
    setFeatured(Boolean(prod.featured));
    setIsProductModalOpen(true);
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    setSavingProduct(true);
  
    try {
      const formData = new FormData();
  
      formData.append('name', name);
      formData.append('product_code', productCode);
      formData.append('category_id', categoryId);
      formData.append('brand_id', brandId || '');
      formData.append('original_price', originalPrice);
      formData.append('selling_price', sellingPrice);
      formData.append('tax_percent', taxPercent);
      formData.append('unit', unit);
      formData.append('stock', stock);
      formData.append('minimum_stock', minStock);
      formData.append('description', description);
      formData.append('featured', featured ? '1' : '0');
  
      // Send actual selected files
      if (imageFile) {
        formData.append('image', imageFile);
      }
  
      if (image2File) {
        formData.append('image2', image2File);
      }
  
      let response;
  
      if (editingProduct) {
        response = await client.put(
          `/products/${editingProduct.id}`,
          formData
        );
      } else {
        response = await client.post(
          '/products',
          formData
        );
      }
  
      if (!response?.success) {
        throw new Error(
          response?.message || 'Product save failed'
        );
      }
  
      setIsProductModalOpen(false);
  
      setImageFile(null);
      setImage2File(null);
  
      loadAllData();
  
    } catch (err) {
      console.error('Save product error:', err);
  
      alert(`Save failed: ${err.message}`);
    } finally {
      setSavingProduct(false);
    }
  }
  // --- CATEGORY CRUD ---
  function openCreateCategoryModal() {
    setEditingCat(null);
    setCatName('');
    setCatDesc('');
    setCatImage('');
    setCatSort('0');
    setIsCatModalOpen(true);
  }

  function openEditCategoryModal(cat) {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setCatImage(cat.image || '');
    setCatSort(String(cat.sort_order || 0));
    setIsCatModalOpen(true);
  }

  async function handleSaveCategory(e) {
    e.preventDefault();
    setSavingCat(true);
    try {
      const payload = {
        name: catName,
        description: catDesc,
        image: catImage,
        sort_order: Number(catSort),
      };

      if (editingCat) {
        await client.put(`/categories/${editingCat.id}`, payload);
      } else {
        await client.post('/categories', payload);
      }

      setIsCatModalOpen(false);
      loadAllData();
    } catch (err) {
      alert(`Save category failed: ${err.message}`);
    } finally {
      setSavingCat(false);
    }
  }

  async function handleToggleCatStatus(cat) {
    try {
      const res = await client.put(`/categories/${cat.id}/status`, {});
      if (res.success) {
        loadAllData();
      }
    } catch (err) {
      alert(`Status toggle failed: ${err.message}`);
    }
  }

  // --- BRAND CRUD ---
  function openCreateBrandModal() {
    setEditingBrand(null);
    setBrandName('');
    setBrandDesc('');
    setBrandLogo('');
    setIsBrandModalOpen(true);
  }

  function openEditBrandModal(b) {
    setEditingBrand(b);
    setBrandName(b.name);
    setBrandDesc(b.description || '');
    setBrandLogo(b.logo || '');
    setIsBrandModalOpen(true);
  }

  async function handleSaveBrand(e) {
    e.preventDefault();
    setSavingBrand(true);
    try {
      const payload = {
        name: brandName,
        description: brandDesc,
        logo: brandLogo,
      };

      if (editingBrand) {
        await client.put(`/brands/${editingBrand.id}`, payload);
      } else {
        await client.post('/brands', payload);
      }

      setIsBrandModalOpen(false);
      loadAllData();
    } catch (err) {
      alert(`Save brand failed: ${err.message}`);
    } finally {
      setSavingBrand(false);
    }
  }

  async function handleToggleBrandStatus(b) {
    try {
      const res = await client.put(`/brands/${b.id}/status`, {});
      if (res.success) {
        loadAllData();
      }
    } catch (err) {
      alert(`Status toggle failed: ${err.message}`);
    }
  }

  // --- REUSABLE SENSITIVE DELETE EXECUTION ---
  async function handleDeleteConfirm(password) {
    if (!deleteModalItem) return;
    setDeleteLoading(true);
    setDeleteError('');

    const { type, item } = deleteModalItem;
    let endpoint = '';
    if (type === 'product') endpoint = `/products/${item.id}`;
    if (type === 'category') endpoint = `/categories/${item.id}`;
    if (type === 'brand') endpoint = `/brands/${item.id}`;

    try {
      const res = await client.delete(endpoint, {
        headers: {
          'x-confirm-password': password,
        },
      });

      if (res.success) {
        alert(res.message);
        setDeleteModalItem(null);
        loadAllData();
      } else {
        throw new Error(res.message || 'Deletion failed');
      }
    } catch (err) {
      setDeleteError(err.message || 'Deletion failed. Check password.');
    } finally {
      setDeleteLoading(false);
    }
  }

  // --- BULK IMPORT LOGIC ---
  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      // Split with comma awareness
      const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = parts[idx] !== undefined ? parts[idx] : '';
      });
      items.push(obj);
    }
    return items;
  }

  function downloadCsvTemplate() {
    const csv = `product_code,name,category,brand,original_price,selling_price,tax_percent,unit,stock,minimum_stock,description\nSP000888,Farm Fresh Apples,fruits-vegetables,,160,135,5,1 kg,50,5,Fresh crisp apples\nSP000889,Organic Desi Ghee,dairy-bakery,Amul,650,599,5,1 L,30,5,Pure cow desi ghee`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-bulk-import-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleExecuteBulkImport() {
    setBulkValidationErrors([]);
    setBulkSuccessMsg('');
    if (!bulkCsvText.trim()) {
      alert('Please paste CSV contents or upload a file');
      return;
    }

    const rows = parseCSV(bulkCsvText);
    if (rows.length === 0) {
      alert('CSV contains no data rows or header format is invalid');
      return;
    }

    setBulkImporting(true);
    try {
      const res = await client.post('/products/bulk-import', { products: rows });
      if (res.success) {
        setBulkSuccessMsg(res.message);
        setBulkCsvText('');
        loadAllData();
      }
    } catch (err) {
      if (err.data?.errors) {
        setBulkValidationErrors(err.data.errors);
      } else {
        alert(`Bulk Import Error: ${err.message}`);
      }
    } finally {
      setBulkImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Module Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Catalog &amp; Inventory Management</h1>
          <p className="text-xs text-slate-500">
            Products, Categories, Brands, Bulk Import, and Centralized Image Architecture
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'products' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>
              Products ({totalProducts})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'categories' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categories ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('brands')}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'brands' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Brands ({brands.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'bulk' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk Import</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PRODUCTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by code, name, category, or brand..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Image Filter */}
          <select
            value={imageFilter}
            onChange={(e) => setImageFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="">All Images</option>
            <option value="with">With Image</option>
            <option value="without">Without Image</option>
          </select>

          {/* Stock Sort */}
          <select
            value={stockSort}
            onChange={(e) => setStockSort(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="">Stock: Default</option>
            <option value="asc">Stock: Low to High</option>
            <option value="desc">Stock: High to Low</option>
          </select>
        </div>
                    <button
              type="button"
              onClick={openCreateProductModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <tr>
                  <th className="p-3.5">#</th>
                    <th className="p-3.5">Image</th>
                    <th className="p-3.5">Product Code</th>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Brand</th>
                    <th className="p-3.5">Price</th>
                    <th className="p-3.5">Stock</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">Loading catalog products...</td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">No products found.</td>
                    </tr>
                  ) : (
                    products.map((p,index) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">

                        <td className="p-3 font-mono font-bold text-slate-900">
                          {index+1}
                        </td>
                        <td className="p-3">
                          <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                            <ImagePreview
                              src={getProductImageUrl(p)}
                              alt={p.name}
                              fallbackText="None"
                              className="w-full h-full object-contain cursor-pointer"
                            />
                          </div>
                        </td>

                        <td className="p-3 font-mono font-bold text-slate-900">
                          {p.product_code}
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.unit}</div>
                        </td>

                        <td className="p-3 font-medium text-slate-700">
                          {p.category_name || 'N/A'}
                        </td>

                        <td className="p-3 font-medium text-slate-700">
                          {p.brand_name || 'N/A'}
                        </td>
                        

                        <td className="p-3 font-bold text-slate-900">
                          <span className="text-emerald-800 font-black">₹{p.selling_price}</span>
                          {p.original_price > p.selling_price && (
                            <span className="line-through text-slate-400 text-[10px] ml-1.5 font-normal">₹{p.original_price}</span>
                          )}
                        </td>

                        <td className="p-3 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            p.stock > 5 ? 'bg-emerald-50 text-emerald-800' : p.stock > 0 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'
                          }`}>
                            {p.stock} units
                          </span>
                        </td>

                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>

                        <td className="p-3 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => openEditProductModal(p)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer inline-block"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteModalItem({ type: 'product', item: p });
                              setDeleteError('');
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer inline-block"
                            title="Delete Product (Password Protected)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {productHasMore && products.length > 0 && (
                <div className="flex flex-col items-center gap-2 py-5">
                  <p className="text-xs text-slate-500">
                    Showing {products.length} of {totalProducts} products
                  </p>

                  <button
                    type="button"
                    onClick={handleLoadMoreProducts}
                    disabled={loadingMoreProducts}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingMoreProducts
                      ? 'Loading Products...'
                      : 'Load More Products'}
                  </button>
                </div>
              )}

              {!productHasMore && products.length > 0 && (
                <div className="text-center py-5 text-xs text-slate-400">
                  Showing all {totalProducts} products
                </div>
              )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: CATEGORIES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Store Categories</h2>
              <p className="text-[11px] text-slate-500">Manage categories, images, and enable/disable states</p>
            </div>
            <button
              type="button"
              onClick={openCreateCategoryModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Category</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Image</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Slug</th>
                  <th className="p-3.5">Products</th>
                  <th className="p-3.5">Sort Order</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <ImagePreview src={cat.image} alt={cat.name} fallbackText="Cat" />
                      </div>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{cat.name}</td>
                    <td className="p-3 font-mono text-slate-500">{cat.slug}</td>
                    <td className="p-3 font-semibold text-slate-700">{cat.product_count || 0} prods</td>
                    <td className="p-3 text-slate-600">{cat.sort_order || 0}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleToggleCatStatus(cat)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer flex items-center gap-1 ${
                          cat.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                        title="Click to toggle status"
                      >
                        <Power className="w-2.5 h-2.5" />
                        <span>{cat.status}</span>
                      </button>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => openEditCategoryModal(cat)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteModalItem({ type: 'category', item: cat });
                          setDeleteError('');
                        }}
                        className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                        title="Delete Category (Password Protected)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: BRANDS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'brands' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Product Brands</h2>
              <p className="text-[11px] text-slate-500">Manage brands, manufacturer logos, and status</p>
            </div>
            <button
              type="button"
              onClick={openCreateBrandModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Brand</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Logo</th>
                  <th className="p-3.5">Brand Name</th>
                  <th className="p-3.5">Slug</th>
                  <th className="p-3.5">Products</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <ImagePreview src={b.logo} alt={b.name} fallbackText="Logo" />
                      </div>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{b.name}</td>
                    <td className="p-3 font-mono text-slate-500">{b.slug}</td>
                    <td className="p-3 font-semibold text-slate-700">{b.product_count || 0} prods</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleToggleBrandStatus(b)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer flex items-center gap-1 ${
                          b.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                        title="Click to toggle status"
                      >
                        <Power className="w-2.5 h-2.5" />
                        <span>{b.status}</span>
                      </button>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => openEditBrandModal(b)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                        title="Edit Brand"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteModalItem({ type: 'brand', item: b });
                          setDeleteError('');
                        }}
                        className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                        title="Delete Brand (Password Protected)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: BULK IMPORT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'bulk' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Bulk Product Import</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Atomic CSV import with row-level validation and automated product code image mapping (e.g. SP000123.webp)
              </p>
            </div>

            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {bulkSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{bulkSuccessMsg}</span>
            </div>
          )}

          {/* Row level errors display */}
          {bulkValidationErrors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
              <div className="font-bold text-rose-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Found {bulkValidationErrors.length} Validation Errors. Import Aborted to Protect Database:</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-rose-100 text-[11px]">
                {bulkValidationErrors.map((err, idx) => (
                  <div key={idx} className="py-1.5">
                    <strong className="text-rose-950">Row {err.row} ({err.product_code}):</strong>
                    <span className="text-rose-700 ml-2">{err.errors.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CSV Input textarea */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <label className="font-bold text-slate-700">Paste CSV Data or Drag &amp; Drop</label>
              <span className="text-[10px] text-slate-400">Header required: product_code, name, category, brand, original_price, selling_price, tax_percent, unit, stock</span>
            </div>
            <textarea
              rows={8}
              value={bulkCsvText}
              onChange={(e) => setBulkCsvText(e.target.value)}
              placeholder="product_code,name,category,brand,original_price,selling_price,tax_percent,unit,stock,minimum_stock,description&#10;SP000555,Fresh Spinach,fruits-vegetables,,40,30,0,1 bunch,25,5,Fresh palak..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Bulk Image Mapping Notice */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1.5 text-indigo-950">
            <h4 className="font-bold flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <span>Automated Product Code Image Mapping</span>
            </h4>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              If image path is left blank, the platform automatically links images matching the product code from storage (e.g. <code className="font-mono bg-white px-1.5 py-0.5 rounded font-bold">/uploads/SP000123.webp</code> and <code className="font-mono bg-white px-1.5 py-0.5 rounded font-bold">/uploads/SP000123_2.webp</code>).
            </p>
          </div>

          <button
            type="button"
            disabled={bulkImporting || !bulkCsvText.trim()}
            onClick={handleExecuteBulkImport}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-40 transition-colors"
          >
            {bulkImporting ? 'Validating & Importing...' : 'Validate & Import Products'}
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PRODUCT CREATE / EDIT MODAL */}
      {/* ------------------------------------------------------------- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <span>{editingProduct ? `Edit Product: ${editingProduct.product_code}` : 'Add New Product'}</span>
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Product Code *
                </label>

                <input
                  type="text"
                  
                  disabled
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Fresh Organic Tomatoes"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Brand</label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="">No Specific Brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Original Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="e.g. 100"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="e.g. 85"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit Specification</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. 1 kg, 500 g, 1 pc"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Central Image Uploader for Primary & Secondary Product Image */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <ImageUploader
                  label="Primary Image"
                  value={image}
                  onChange={setImage}
                  onFileSelect={setImageFile}
                  productCode={productCode}
                  suffix=""
                />
                {/* <ImageUploader
                  label="Secondary Image"
                  value={image2}
                  onChange={setImage2}
                  onFileSelect={setImage2File}
                  productCode={productCode}
                  suffix="_2"
                /> */}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fresh organic produce details..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {savingProduct ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CATEGORY CREATE / EDIT MODAL */}
      {/* ------------------------------------------------------------- */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <span>{editingCat ? 'Edit Category' : 'Create Category'}</span>
              </h3>
              <button onClick={() => setIsCatModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Category Name *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Dairy & Bakery"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Pure milk, artisan breads..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Display Sort Order</label>
                <input
                  type="number"
                  value={catSort}
                  onChange={(e) => setCatSort(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Reusable Image Uploader for Category */}
              <ImageUploader
                label="Category Banner Image"
                value={catImage}
                onChange={setCatImage}
                presetName={`cat-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCat}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {savingCat ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* BRAND CREATE / EDIT MODAL */}
      {/* ------------------------------------------------------------- */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                <span>{editingBrand ? 'Edit Brand' : 'Create Brand'}</span>
              </h3>
              <button onClick={() => setIsBrandModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Brand Name *</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Amul, Nestle, Fortune"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  value={brandDesc}
                  onChange={(e) => setBrandDesc(e.target.value)}
                  placeholder="Manufacturer description..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Reusable Image Uploader for Brand Logo */}
              <ImageUploader
                label="Brand Logo"
                value={brandLogo}
                onChange={setBrandLogo}
                presetName={`brand-${brandName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBrand}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {savingBrand ? 'Saving...' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SENSITIVE PASSWORD-PROTECTED DELETE CONFIRMATION MODAL */}
      {/* ------------------------------------------------------------- */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteModalItem)}
        title={`Confirm ${deleteModalItem?.type?.toUpperCase()} Deletion`}
        itemName={deleteModalItem ? `${deleteModalItem.item.name || deleteModalItem.item.product_code}` : ''}
        message="This action requires current administrator password confirmation to prevent unauthorized deletion."
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteModalItem(null)}
      />

    </div>
  );
}
