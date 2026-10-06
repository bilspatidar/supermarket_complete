import React, { useEffect, useState } from 'react';
import { Layers, PlusCircle, Search, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';
import client from '../../api/client.js';

export default function AdminInventory() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustType, setAdjustType] = useState('PURCHASE');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTransactions();
    loadProducts();
  }, []);

  async function loadTransactions() {
    setLoading(true);
    try {
      const res = await client.get('/inventory/transactions?limit=100');
      if (res.success && res.data) {
        setTransactions(res.data.transactions || []);
      }
    } catch (err) {
      console.warn('Failed to load inventory transactions:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const res = await client.get('/products?limit=100');
      if (res.success && res.data) {
        setProducts(res.data.products || []);
        if (res.data.products?.length > 0 && !selectedProductId) {
          setSelectedProductId(res.data.products[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load products:', err.message);
    }
  }

  async function handleAdjustSubmit(e) {
    e.preventDefault();
    if (!selectedProductId || !adjustQty) return;
    setSubmitting(true);
    try {
      const qty = adjustType === 'RETURN' || adjustType === 'PURCHASE' || Number(adjustQty) > 0
        ? Math.abs(Number(adjustQty))
        : -Math.abs(Number(adjustQty));

      const res = await client.post('/inventory/adjust', {
        productId: Number(selectedProductId),
        type: adjustType,
        quantity: qty,
        note: adjustNote || 'Manual stock update',
      });

      if (res.success) {
        alert(res.message);
        setIsAdjustModalOpen(false);
        setAdjustQty('');
        setAdjustNote('');
        loadTransactions();
        loadProducts();
      }
    } catch (err) {
      alert(`Adjustment failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Inventory Ledger</h1>
          <p className="text-xs text-slate-500">
            Immutable transaction history of all stock changes (Purchase, Order, Return, Adjustments)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdjustModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Stock Batch / Adjustment</span>
        </button>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">ID / Date</th>
                <th className="p-3.5">Product</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Previous</th>
                <th className="p-3.5">Change</th>
                <th className="p-3.5">New Stock</th>
                <th className="p-3.5">Notes / Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading ledger...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">No ledger transactions found.</td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isPositive = ['PURCHASE', 'CANCEL', 'RETURN'].includes(tx.type) || tx.new_stock > tx.previous_stock;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <span className="font-mono text-slate-400 text-[10px]">#{tx.id}</span>
                        <div className="text-[11px] text-slate-600">{new Date(tx.created_at).toLocaleString()}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{tx.product_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{tx.product_code} ({tx.unit})</div>
                      </td>

                      <td className="p-3.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          tx.type === 'ORDER'
                            ? 'bg-rose-100 text-rose-800'
                            : tx.type === 'PURCHASE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {tx.type}
                        </span>
                      </td>

                      <td className="p-3.5 font-semibold text-slate-600">
                        {tx.previous_stock}
                      </td>

                      <td className="p-3.5 font-black">
                        <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                          {isPositive ? '+' : '-'}{Math.abs(tx.quantity)}
                        </span>
                      </td>

                      <td className="p-3.5 font-black text-slate-950">
                        {tx.new_stock}
                      </td>

                      <td className="p-3.5 text-slate-600 max-w-xs">
                        <div className="truncate">{tx.note || 'No notes'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {tx.reference_type} #{tx.reference_id}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Adjust Inventory Stock</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Transaction Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
                >
                  <option value="PURCHASE">PURCHASE (Stock In / New Batch)</option>
                  <option value="ADJUSTMENT">ADJUSTMENT (Audit Correction / Damage)</option>
                  <option value="RETURN">RETURN (Customer Return)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Quantity</label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="e.g. 50 (or -5 for damage)"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason / Note for Ledger</label>
                <textarea
                  rows={2}
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="e.g. Supplier Batch #902, verified physical stock"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Post Inventory Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
