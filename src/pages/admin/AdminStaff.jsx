import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, UserPlus, Key } from 'lucide-react';
import client from '../../api/client.js';

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Staff Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);
    try {
      const res = await client.get('/staff');
      if (res.success && res.data) {
        setStaff(res.data.staff || []);
        setRoles(res.data.roles || []);
        if (res.data.roles?.length > 0 && !roleId) {
          setRoleId(res.data.roles[0].id);
        }
      }
    } catch (err) {
      console.warn('Staff error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStaff(e) {
    e.preventDefault();
    try {
      await client.post('/staff', {
        name,
        mobile,
        password,
        email: email || null,
        roleId: Number(roleId),
      });
      setIsModalOpen(false);
      setName('');
      setMobile('');
      setPassword('');
      loadStaff();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleRoleChange(staffId, newRoleId) {
    try {
      await client.put(`/staff/${staffId}/roles`, { roleId: Number(newRoleId) });
      loadStaff();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Staff &amp; Permissions</h1>
          <p className="text-xs text-slate-500">Granular role-based access control (POS, Inventory, Orders, Super Admin)</p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Account</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Staff Member</th>
                <th className="p-3.5">Mobile</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Assigned Role</th>
                <th className="p-3.5">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900">
                    {s.name}
                  </td>
                  <td className="p-3.5 font-mono text-slate-700 font-semibold">
                    {s.mobile}
                  </td>
                  <td className="p-3.5 text-slate-500">
                    {s.email || '—'}
                  </td>
                  <td className="p-3.5">
                    <select
                      value={roles.find(r => s.roles?.includes(r.name))?.id || ''}
                      onChange={(e) => handleRoleChange(s.id, e.target.value)}
                      className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 cursor-pointer"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3.5 text-slate-400 text-[11px]">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-black text-slate-900">Add Staff Member</h3>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Cashier"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Role Assignment</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
