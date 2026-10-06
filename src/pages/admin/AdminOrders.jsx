import React, { useEffect, useState } from 'react';
import { Search, Eye, Lock, CheckCircle, Clock, Truck, XCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import client from '../../api/client.js';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [statusUpdateNote, setStatusUpdateNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, sourceFilter, search]);

  async function loadOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (sourceFilter !== 'ALL') params.append('source', sourceFilter);
      if (search.trim()) params.append('search', search.trim());
      params.append('limit', '50');

      const res = await client.get(`/orders?${params.toString()}`);
      if (res.success && res.data) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.warn('Failed to load orders:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function viewOrderDetails(orderId) {
    setModalLoading(true);
    try {
      const res = await client.get(`/orders/${orderId}`);
      if (res.success && res.data) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      alert(`Failed to load order details: ${err.message}`);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleStatusChange(orderId, newStatus) {
    if (!confirm(`Are you sure you want to update order status to ${newStatus}?${newStatus === 'DELIVERED' ? ' WARNING: Order will become permanently LOCKED upon delivery.' : ''}`)) {
      return;
    }

    setUpdatingStatus(true);
    try {
      const res = await client.put(`/orders/${orderId}/status`, {
        status: newStatus,
        notes: statusUpdateNote || `Status changed to ${newStatus}`,
      });
      if (res.success) {
        alert(res.message);
        setStatusUpdateNote('');
        loadOrders();
        viewOrderDetails(orderId);
      }
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  }

  const statusOptions = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

  return (
    <div className="space-y-6">
      
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Order Management</h1>
          <p className="text-xs text-slate-500">Live order processing, status state machine, and delivery locking</p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-xl font-semibold outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-xl font-semibold outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Sources</option>
            <option value="ONLINE">Online Customer</option>
            <option value="IN_HOUSE">In-House POS</option>
          </select>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order #, customer name, or phone number..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-hidden focus:border-emerald-500 font-medium"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Order #</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Area &amp; Address</th>
                <th className="p-3.5">Grand Total</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">No orders found.</td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-900">#{ord.order_number}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{ord.source}</span>
                        {ord.locked_at && (
                          <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{ord.customer_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{ord.customer_mobile}</div>
                    </td>

                    <td className="p-3.5 max-w-[180px]">
                      <div className="font-semibold text-slate-800 truncate">
                        {ord.sub_area_name || 'Walk-in'}, {ord.area_name || 'Store'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{ord.delivery_address}</div>
                    </td>

                    <td className="p-3.5 font-black text-slate-950 text-sm">
                      ₹{ord.grand_total}
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{ord.payment_method}</div>
                      <div className="text-[10px] font-semibold text-emerald-700">{ord.payment_status}</div>
                    </td>

                    <td className="p-3.5">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        ord.order_status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.order_status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {ord.order_status}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => viewOrderDetails(ord.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details & Status Transition Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Details</span>
                <h3 className="text-lg font-black text-slate-900 font-mono">#{selectedOrder.order.order_number}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Lock status banner (Section 44) */}
            {selectedOrder.order.locked_at ? (
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center gap-3">
                <Lock className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <h4 className="font-bold text-white">Delivered Order is Permanently Locked</h4>
                  <p className="text-slate-300 text-[11px]">
                    Locked on {new Date(selectedOrder.order.locked_at).toLocaleString()}. Products, commercial pricing, and items cannot be modified.
                  </p>
                </div>
              </div>
            ) : (
              /* Status State Machine Controls */
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Update Order Status</span>
                  <span className="text-xs font-black text-emerald-800">Current: {selectedOrder.order.order_status}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {statusOptions.map(st => (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingStatus || selectedOrder.order.order_status === st}
                      onClick={() => handleStatusChange(selectedOrder.order.id, st)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        selectedOrder.order.order_status === st
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Historical Order Items Snapshot */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Historical Order Items</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items.map(item => (
                      <tr key={item.id}>
                        <td className="p-2.5 font-bold text-slate-800">
                          {item.product_name} <span className="text-[10px] font-mono text-slate-400">({item.product_code})</span>
                        </td>
                        <td className="p-2.5">₹{item.applied_price}</td>
                        <td className="p-2.5">{item.quantity} {item.unit}</td>
                        <td className="p-2.5 text-right font-black">₹{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Totals Breakdown */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{selectedOrder.order.subtotal}</span>
              </div>
              {selectedOrder.order.membership_discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>VIP Discount</span>
                  <span>-₹{selectedOrder.order.membership_discount}</span>
                </div>
              )}
              {selectedOrder.order.coupon_discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-₹{selectedOrder.order.coupon_discount}</span>
                </div>
              )}
              {selectedOrder.order.bonus_discount > 0 && (
                <div className="flex justify-between text-amber-800 font-semibold">
                  <span>Welcome Bonus Credit</span>
                  <span>-₹{selectedOrder.order.bonus_discount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge</span>
                <span>₹{selectedOrder.order.delivery_charge}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax (GST)</span>
                <span>₹{selectedOrder.order.tax}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-900">
                <span>Grand Total</span>
                <span>₹{selectedOrder.order.grand_total}</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
