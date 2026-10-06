import React, { useEffect, useState } from 'react';
import {
  Search,
  Eye,
  Lock,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  AlertCircle,
  ShoppingCart,
  Download,
  Filter,
  RefreshCw,
  X,
  Printer,
  Calendar,
  Banknote,
} from 'lucide-react';
import client from '../../api/client.js';
import PrintBillModal from '../../components/common/PrintBillModal.jsx';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Comprehensive Backend Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [areaId, setAreaId] = useState('ALL');
  const [areas, setAreas] = useState([]);
  const [deliveryStaffFilter, setDeliveryStaffFilter] = useState('ALL');
  const [deliveryStaffList, setDeliveryStaffList] = useState([]);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [statusUpdateNote, setStatusUpdateNote] = useState('');
  const [assignDeliveryStaffId, setAssignDeliveryStaffId] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [settlingCod, setSettlingCod] = useState(false);
  const [showBillPrintModal, setShowBillPrintModal] = useState(false);

  useEffect(() => {
    loadDeliveryAreas();
    loadDeliveryStaff();
  }, []);

  async function loadDeliveryStaff() {
    try {
      const res = await client.get('/staff/delivery-staff');
      if (res.success && res.data) {
        setDeliveryStaffList(res.data);
      }
    } catch (err) {
      console.warn('Failed to load delivery staff:', err.message);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [
    statusFilter,
    sourceFilter,
    paymentStatusFilter,
    paymentMethodFilter,
    fromDate,
    toDate,
    orderNumber,
    customerName,
    customerMobile,
    areaId,
    deliveryStaffFilter,
  ]);

  async function loadDeliveryAreas() {
    try {
      const res = await client.get('/delivery/zones');
      if (res.success && res.data) {
        setAreas(res.data || []);
      }
    } catch (err) {
      console.warn('Failed to load areas:', err.message);
    }
  }

  function buildQueryParams() {
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    if (sourceFilter !== 'ALL') params.append('source', sourceFilter);
    if (paymentStatusFilter !== 'ALL') params.append('paymentStatus', paymentStatusFilter);
    if (paymentMethodFilter !== 'ALL') params.append('paymentMethod', paymentMethodFilter);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    if (orderNumber.trim()) params.append('orderNumber', orderNumber.trim());
    if (customerName.trim()) params.append('customer', customerName.trim());
    if (customerMobile.trim()) params.append('mobile', customerMobile.trim());
    if (areaId !== 'ALL') params.append('areaId', areaId);
    if (deliveryStaffFilter !== 'ALL') params.append('deliveryStaffId', deliveryStaffFilter);
    return params;
  }

  async function loadOrders() {
    setLoading(true);
    try {
      const params = buildQueryParams();
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

  async function handleExportOrders() {
    setExporting(true);
    try {
      const params = buildQueryParams();
      const token = localStorage.getItem('freshmart_token');
      const response = await fetch(`/api/orders/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed on server');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  async function viewOrderDetails(orderId) {
    setModalLoading(true);
    try {
      const res = await client.get(`/orders/${orderId}`);
      if (res.success && res.data) {
        setSelectedOrder(res.data);
        setAssignDeliveryStaffId(
          res.data.order.delivery_staff_id ? String(res.data.order.delivery_staff_id) : ''
        );
      }
    } catch (err) {
      alert(`Failed to load order details: ${err.message}`);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleStatusChange(orderId, newStatus) {
    if (newStatus === 'OUT_FOR_DELIVERY' && !assignDeliveryStaffId) {
      alert('Please select a Delivery Staff member before setting status to OUT_FOR_DELIVERY.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to update order status to ${newStatus}?${
          newStatus === 'DELIVERED'
            ? ' WARNING: Order will become permanently LOCKED upon delivery.'
            : ''
        }`
      )
    ) {
      return;
    }

    setUpdatingStatus(true);
    try {
      const res = await client.put(`/orders/${orderId}/status`, {
        status: newStatus,
        notes: statusUpdateNote || `Status changed to ${newStatus}`,
        delivery_staff_id: assignDeliveryStaffId ? Number(assignDeliveryStaffId) : undefined,
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

  async function handleSettleCod(orderId) {
    const ref = prompt('Enter cash vault / deposit reference for this COD settlement:', `SETTLE-${Date.now().toString().slice(-6)}`);
    if (ref === null) return;
    setSettlingCod(true);
    try {
      const res = await client.put(`/orders/${orderId}/settle-cod`, {
        settlementRef: ref.trim() || `SETTLE-${Date.now()}`,
        settlementNote: 'Cash handed over to store by delivery staff',
      });
      if (res.success) {
        alert(res.message);
        loadOrders();
        viewOrderDetails(orderId);
      }
    } catch (err) {
      alert(`COD settlement failed: ${err.message}`);
    } finally {
      setSettlingCod(false);
    }
  }

  function resetFilters() {
    setStatusFilter('ALL');
    setSourceFilter('ALL');
    setPaymentStatusFilter('ALL');
    setPaymentMethodFilter('ALL');
    setDeliveryStaffFilter('ALL');
    setFromDate('');
    setToDate('');
    setOrderNumber('');
    setCustomerName('');
    setCustomerMobile('');
    setAreaId('ALL');
  }

  const statusOptions = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

  return (
    <div className="space-y-6">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Order Management</h1>
          <p className="text-xs text-slate-500">
            Backend-filtered orders, status lifecycle transitions, and immutable delivered order locking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            <span>{showAdvancedFilters ? 'Hide Filters' : 'Filter Orders'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportOrders}
            disabled={exporting}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Primary & Advanced Filters Panel */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 text-xs">
        {/* Quick Filter Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-hidden focus:border-emerald-500 cursor-pointer text-xs"
            >
              <option value="ALL">All Statuses</option>
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-hidden focus:border-emerald-500 cursor-pointer text-xs"
            >
              <option value="ALL">All Sources</option>
              <option value="ONLINE">Online Customer</option>
              <option value="IN_HOUSE">In-House POS</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Payment Status</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-hidden focus:border-emerald-500 cursor-pointer text-xs"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Payment Method</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-hidden focus:border-emerald-500 cursor-pointer text-xs"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="COD">COD</option>
              <option value="RAZORPAY">Razorpay Online</option>
              <option value="CASH">In-House Cash</option>
              <option value="CARD_POS">In-House Card / UPI</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters Expandable Grid */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 animate-fade-in">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Order #</label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. FM-"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Name"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Customer Mobile</label>
              <input
                type="tel"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                placeholder="10-digit mobile"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Delivery Area</label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer"
              >
                <option value="ALL">All Areas</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Delivered By</label>
              <select
                value={deliveryStaffFilter}
                onChange={(e) => setDeliveryStaffFilter(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer font-semibold"
              >
                <option value="ALL">All Delivery Staff</option>
                {deliveryStaffList.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-4 lg:col-span-6 flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Order #</th>
                <th className="p-3.5">Date</th>
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
                  <td colSpan={8} className="p-8 text-center text-slate-400">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">No orders match the selected filters.</td>
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

                    <td className="p-3.5 text-slate-600 whitespace-nowrap">
                      {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'N/A'}
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
                      {ord.delivery_staff_name && (
                        <div className="text-[10px] text-indigo-700 font-bold truncate mt-0.5">
                          Delivered By: {ord.delivery_staff_name}
                        </div>
                      )}
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
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details & Lifecycle Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Order #{selectedOrder.order.order_number}</span>
                  {selectedOrder.order.locked_at && (
                    <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Immutable Locked
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Placed on {new Date(selectedOrder.order.created_at).toLocaleString()} via {selectedOrder.order.source}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBillPrintModal(true)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
                  title="Print Bill"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PRINT BILL</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Delivered Lock Alert */}
            {selectedOrder.order.locked_at ? (
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-start gap-2.5 shadow-md">
                <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-emerald-300">Order is Permanently Locked (Delivered)</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    Once delivered, orders are permanently sealed against modifications. Items, prices, discounts, coupons, membership, customer profile, and financial totals cannot be changed by any admin or staff user.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Order & Delivery Assignment Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px]">
              <div>
                <span className="text-slate-400 block font-bold uppercase text-[9px]">Customer:</span>
                <strong className="text-slate-900">{selectedOrder.order.customer_name}</strong>
                <span className="text-slate-500 block font-mono">{selectedOrder.order.customer_mobile}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase text-[9px]">Delivery Slot / Zone:</span>
                <strong className="text-slate-800">{selectedOrder.order.slot_name || 'Immediate / Standard'}</strong>
                <span className="text-slate-500 block truncate">{selectedOrder.order.sub_area_name || ''}, {selectedOrder.order.area_name || ''}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-400 block font-bold uppercase text-[9px]">Delivered By:</span>
                <strong className="text-indigo-900 text-xs">
                  {selectedOrder.order.delivery_staff_name || 'Not assigned'}
                </strong>
                {selectedOrder.order.delivery_staff_mobile && (
                  <span className="text-slate-500 block font-mono">{selectedOrder.order.delivery_staff_mobile}</span>
                )}
              </div>
            </div>

            {/* COD Cash Collection Tracking */}
            {selectedOrder.order.payment_method === 'COD' && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-amber-700" />
                    <span>COD Cash Collection Tracking</span>
                  </h4>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    selectedOrder.order.payment_status === 'COD_SETTLED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedOrder.order.payment_status === 'COD_COLLECTED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {selectedOrder.order.payment_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700 bg-white/70 p-2.5 rounded-xl border border-amber-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Payment Method:</span>
                    <strong>COD</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cash Amount:</span>
                    <strong>₹{selectedOrder.order.grand_total}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Collected By:</span>
                    <strong>{selectedOrder.order.delivery_staff_name || 'Delivery Staff'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Settlement State:</span>
                    <strong className={selectedOrder.order.payment_status === 'COD_SETTLED' ? 'text-emerald-700' : 'text-amber-800'}>
                      {selectedOrder.order.payment_status === 'COD_SETTLED' ? 'Settled to Store' : 'Pending Settlement'}
                    </strong>
                  </div>
                </div>

                {selectedOrder.order.payment_status === 'COD_COLLECTED' && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-amber-800">
                      Cash collected by staff from customer. Handover pending store vault settlement.
                    </span>
                    <button
                      type="button"
                      disabled={settlingCod}
                      onClick={() => handleSettleCod(selectedOrder.order.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{settlingCod ? 'Settling...' : 'Settle to Store'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Items in Order */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">Purchased Items ({selectedOrder.items?.length || 0})</h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="p-2.5 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <div className="font-bold text-slate-900">{item.product_name}</div>
                      <div className="text-[11px] text-slate-500">
                        ₹{item.applied_price} × {item.quantity} {item.unit} (Tax: ₹{item.tax})
                      </div>
                    </div>
                    <div className="font-black text-slate-900">
                      ₹{item.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1.5">
              <div className="flex justify-between text-slate-600"><span>Subtotal:</span><strong>₹{selectedOrder.order.subtotal}</strong></div>
              {selectedOrder.order.membership_discount > 0 && (
                <div className="flex justify-between text-emerald-700"><span>VIP Discount:</span><strong>-₹{selectedOrder.order.membership_discount}</strong></div>
              )}
              {selectedOrder.order.coupon_discount > 0 && (
                <div className="flex justify-between text-emerald-700"><span>Coupon ({selectedOrder.order.coupon_code}):</span><strong>-₹{selectedOrder.order.coupon_discount}</strong></div>
              )}
              {selectedOrder.order.bonus_discount > 0 && (
                <div className="flex justify-between text-amber-800"><span>Welcome Bonus:</span><strong>-₹{selectedOrder.order.bonus_discount}</strong></div>
              )}
              <div className="flex justify-between text-slate-600"><span>Delivery Fee:</span><strong>₹{selectedOrder.order.delivery_charge}</strong></div>
              <div className="flex justify-between text-slate-600"><span>GST Tax:</span><strong>₹{selectedOrder.order.tax_total}</strong></div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-900">Grand Total:</span>
                <strong className="text-emerald-900 text-base">₹{selectedOrder.order.grand_total}</strong>
              </div>
            </div>

            {/* Status Transition Control (Only allowed if NOT locked) */}
            {!selectedOrder.order.locked_at && (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-3">
                <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  <span>Update Order Lifecycle Status</span>
                </h4>

                {/* Delivered By Dropdown when assigning delivery */}
                <div className="p-2.5 bg-white border border-indigo-200 rounded-xl space-y-1">
                  <label className="text-[10px] font-bold uppercase text-indigo-900 block">
                    Delivered By (Required for OUT_FOR_DELIVERY):
                  </label>
                  <select
                    value={assignDeliveryStaffId}
                    onChange={(e) => setAssignDeliveryStaffId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <option value="">[ Select Delivery Staff ▼ ]</option>
                    {deliveryStaffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} {st.mobile ? `(${st.mobile})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  value={statusUpdateNote}
                  onChange={(e) => setStatusUpdateNote(e.target.value)}
                  placeholder="Optional audit note (e.g. Dispatched with driver Rahul)"
                  className="w-full p-2 bg-white border border-indigo-200 rounded-xl text-xs"
                />

                <div className="flex flex-wrap gap-1.5">
                  {statusOptions.map((status) => {
                    const isCurrent = selectedOrder.order.order_status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={isCurrent || updatingStatus}
                        onClick={() => handleStatusChange(selectedOrder.order.id, status)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-indigo-600 text-white cursor-default'
                            : 'bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50'
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Complete Order History (Formatted according to specs) */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">Order History</h4>
              <div className="space-y-2 text-xs">
                {selectedOrder.history?.map((h) => {
                  const fromSt = h.old_status || h.previous_status;
                  const toSt = h.new_status;
                  const d = h.created_at ? new Date(h.created_at) : new Date();
                  const formattedDate = `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-US', { month: 'short' })} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

                  return (
                    <div key={h.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="text-[11px] font-mono font-bold text-slate-500">
                        {formattedDate}
                      </div>
                      <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                        {fromSt ? (
                          <>
                            <span>{fromSt}</span>
                            <span className="text-emerald-600">→</span>
                            <span className="text-emerald-700">{toSt}</span>
                          </>
                        ) : (
                          <span className="text-emerald-700">{toSt} (Order Created)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {toSt === 'OUT_FOR_DELIVERY' && selectedOrder.order.delivery_staff_name ? (
                          <span>Delivered By: <strong className="text-slate-900">{selectedOrder.order.delivery_staff_name}</strong></span>
                        ) : (
                          <span>By: <strong className="text-slate-900">{h.changed_by_name || 'Admin'}</strong></span>
                        )}
                      </div>
                      {h.notes && !h.notes.startsWith('Status changed to') && h.notes !== 'Order created' && (
                        <div className="text-[10px] text-slate-500 italic">
                          "{h.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Instant Bill Print Modal */}
      {showBillPrintModal && selectedOrder && (
        <PrintBillModal
          orderData={selectedOrder}
          onClose={() => setShowBillPrintModal(false)}
        />
      )}

    </div>
  );
}
