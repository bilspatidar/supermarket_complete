import React, { useEffect, useState } from 'react';
import { FileText, MessageSquare, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import client from '../../api/client.js';

export default function AdminAudit() {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit', 'notifications'
  const [auditLogs, setAuditLogs] = useState([]);
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [activeTab]);

  async function loadLogs() {
    setLoading(true);
    try {
      if (activeTab === 'audit') {
        const res = await client.get('/audit/logs?limit=50');
        if (res.success) setAuditLogs(res.data || []);
      } else {
        const res = await client.get('/notifications/logs?limit=50');
        if (res.success) setNotificationLogs(res.data || []);
      }
    } catch (err) {
      console.warn('Logs error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Audit &amp; Communication Logs</h1>
          <p className="text-xs text-slate-500">
            Immutable tracking for sensitive operations (DOB corrections, staff changes) and WhatsApp events
          </p>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-bold text-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            System Audit Trail
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'notifications' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            WhatsApp Message Dispatch Logs
          </button>
        </div>
      </div>

      {activeTab === 'audit' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Staff User</th>
                  <th className="p-3.5">Entity</th>
                  <th className="p-3.5">Reason / Note</th>
                  <th className="p-3.5">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">No audit logs recorded yet.</td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                          {log.action}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-slate-800">
                        {log.user_name || `User #${log.user_id}`}
                      </td>

                      <td className="p-3.5 text-slate-600">
                        {log.entity_type} #{log.entity_id}
                      </td>

                      <td className="p-3.5 max-w-xs text-slate-700">
                        <div className="truncate font-semibold">{log.notes || '—'}</div>
                        {log.new_values && (
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {log.new_values}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                        {log.ip_address}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Sent At</th>
                  <th className="p-3.5">Recipient</th>
                  <th className="p-3.5">Template</th>
                  <th className="p-3.5">Message Content</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notificationLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">No WhatsApp notifications dispatched yet.</td>
                  </tr>
                ) : (
                  notificationLogs.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(n.sent_at).toLocaleString()}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {n.recipient}
                      </td>

                      <td className="p-3.5 font-semibold text-emerald-800">
                        {n.template_key}
                      </td>

                      <td className="p-3.5 max-w-sm text-slate-600 truncate">
                        {n.message_body}
                      </td>

                      <td className="p-3.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          n.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {n.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
