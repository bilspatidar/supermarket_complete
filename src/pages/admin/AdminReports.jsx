import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Gift,
  Award,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
  Briefcase,
  Package,
  CreditCard,
  Crown,
  Percent,
  RefreshCw,
} from 'lucide-react';
import client from '../../api/client.js';

export default function AdminReports() {
  const [reportType, setReportType] = useState('sales');
  const [period, setPeriod] = useState('last30');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const reportTypes = [
    { id: 'sales', label: 'Sales', icon: TrendingUp },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'brands', label: 'Brands', icon: Briefcase },
    { id: 'membership', label: 'Membership', icon: Crown },
    { id: 'coupons', label: 'Coupons', icon: Percent },
    { id: 'welcomebonus', label: 'Welcome Bonus', icon: Gift },
    { id: 'inventory', label: 'Inventory', icon: BarChart3 },
  ];

  const periods = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last7', label: 'Last 7 Days' },
    { id: 'last30', label: 'Last 30 Days' },
    { id: 'thisMonth', label: 'Current Month' },
    { id: 'lastMonth', label: 'Previous Month' },
    { id: 'custom', label: 'Custom Range' },
  ];

  useEffect(() => {
    loadReport();
  }, [reportType, period, fromDate, toDate]);

  async function loadReport() {
    if (period === 'custom' && (!fromDate || !toDate)) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      params.append('period', period);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await client.get(`/reports/detailed?${params.toString()}`);
      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.warn('Report load error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportReport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      params.append('period', period);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const token = localStorage.getItem('freshmart_token');
      const response = await fetch(`/api/reports/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Report export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportType}-${period}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  const rows = reportData?.rows || [];
  const summary = reportData?.summary || {};

  return (
    <div className="space-y-6">
      
      {/* Header & Export CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Database Financial &amp; Operational Reports</h1>
          <p className="text-xs text-slate-500">
            Real aggregated transactional metrics from relational SQLite/MySQL tables. Zero fabricated data.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportReport}
          disabled={exporting || rows.length === 0}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Exporting...' : 'Export CSV Report'}</span>
        </button>
      </div>

      {/* 11 Report Types Horizontal Navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {reportTypes.map((t) => {
          const Icon = t.icon;
          const isActive = reportType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setReportType(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date Periods Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Time Horizon:</span>
            {periods.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                  period === p.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 animate-fade-in">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Real Summary KPI Metrics */}
      {summary && Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(summary).map(([key, val]) => (
            <div key={key} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {key.replace(/_/g, ' ')}
              </span>
              <strong className="text-lg font-black text-slate-900 mt-1 block">
                {typeof val === 'number' && key.includes('revenue') || key.includes('amount') || key.includes('sales') || key.includes('total') || key.includes('spent')
                  ? `₹${Math.round(val)}`
                  : String(val)}
              </strong>
            </div>
          ))}
        </div>
      )}

      {/* Real Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
            <span className="capitalize">{reportType} Report Records</span>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
              {rows.length} rows returned
            </span>
          </div>
        </div>

        <div className="overflow-x-auto text-xs">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Generating analytical database report...</div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center text-slate-400">No records found for the selected time horizon.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  {Object.keys(rows[0]).map((col) => (
                    <th key={col} className="p-3">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    {Object.entries(row).map(([k, v], cellIdx) => (
                      <td key={cellIdx} className="p-3">
                        {v === null || v === undefined
                          ? '-'
                          : typeof v === 'number' && (k.includes('price') || k.includes('revenue') || k.includes('total') || k.includes('amount') || k.includes('discount'))
                          ? `₹${v}`
                          : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
