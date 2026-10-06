import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Plus,
  UserPlus,
  Key,
  Users,
  Lock,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Shield,
  Layers,
} from 'lucide-react';
import client from '../../api/client.js';

export default function AdminStaff() {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'roles'

  // Staff state
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffMobile, setStaffMobile] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRoleId, setStaffRoleId] = useState('');
  const [creatingStaff, setCreatingStaff] = useState(false);

  // Roles CRUD State
  const [rolesList, setRolesList] = useState([]);
  const [permissionsGrouped, setPermissionsGrouped] = useState({});
  const [allPermissions, setAllPermissions] = useState([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Role Form
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleStatus, setRoleStatus] = useState('ACTIVE');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
  const [savingRole, setSavingRole] = useState(false);
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [staffRes, rolesRes, permsRes] = await Promise.all([
        client.get('/staff'),
        client.get('/roles'),
        client.get('/permissions'),
      ]);

      if (staffRes.success && staffRes.data) {
        setStaff(staffRes.data.staff || []);
        setRoles(staffRes.data.roles || []);
        if (staffRes.data.roles?.length > 0 && !staffRoleId) {
          setStaffRoleId(staffRes.data.roles[0].id);
        }
      }

      if (rolesRes.success && rolesRes.data) {
        setRolesList(rolesRes.data);
      }

      if (permsRes.success && permsRes.data) {
        setAllPermissions(permsRes.data.permissions || []);
        setPermissionsGrouped(permsRes.data.grouped || {});
      }
    } catch (err) {
      console.warn('Failed to load staff/roles data:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- STAFF ACTIONS ---
  async function handleCreateStaff(e) {
    e.preventDefault();
    setCreatingStaff(true);
    try {
      await client.post('/staff', {
        name: staffName,
        mobile: staffMobile,
        password: staffPassword,
        email: staffEmail || null,
        roleId: Number(staffRoleId),
      });
      setIsStaffModalOpen(false);
      setStaffName('');
      setStaffMobile('');
      setStaffPassword('');
      setStaffEmail('');
      loadData();
    } catch (err) {
      alert(`Create staff error: ${err.message}`);
    } finally {
      setCreatingStaff(false);
    }
  }

  async function handleRoleChange(staffId, newRoleId) {
    try {
      await client.put(`/staff/${staffId}/roles`, { roleId: Number(newRoleId) });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  // --- ROLES ACTIONS ---
  function handleOpenCreateRole() {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setRoleStatus('ACTIVE');
    setSelectedPermissionIds([]);
    setRoleError('');
    setIsRoleModalOpen(true);
  }

  function handleOpenEditRole(r) {
    setEditingRole(r);
    setRoleName(r.name || '');
    setRoleDescription(r.description || '');
    setRoleStatus(r.status || 'ACTIVE');
    setSelectedPermissionIds(r.permission_ids || []);
    setRoleError('');
    setIsRoleModalOpen(true);
  }

  function togglePermission(permId) {
    setSelectedPermissionIds(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  }

  function toggleGroupPermissions(groupName) {
    const groupPerms = permissionsGrouped[groupName] || [];
    const groupIds = groupPerms.map(p => p.id);
    const allSelected = groupIds.every(id => selectedPermissionIds.includes(id));

    if (allSelected) {
      // Deselect all in group
      setSelectedPermissionIds(prev => prev.filter(id => !groupIds.includes(id)));
    } else {
      // Select all in group
      setSelectedPermissionIds(prev => Array.from(new Set([...prev, ...groupIds])));
    }
  }

  async function handleSaveRole(e) {
    e.preventDefault();
    if (!roleName.trim()) {
      setRoleError('Role name is required');
      return;
    }

    setSavingRole(true);
    setRoleError('');
    try {
      const payload = {
        name: roleName.trim(),
        description: roleDescription ? roleDescription.trim() : null,
        status: roleStatus,
        permissionIds: selectedPermissionIds,
      };

      if (editingRole) {
        await client.put(`/roles/${editingRole.id}`, payload);
      } else {
        await client.post('/roles', payload);
      }

      setIsRoleModalOpen(false);
      loadData();
    } catch (err) {
      setRoleError(err.message || 'Failed to save role');
    } finally {
      setSavingRole(false);
    }
  }

  async function handleToggleRoleStatus(role) {
    if (role.name === 'SUPER_ADMIN' || role.name === 'CUSTOMER') {
      alert('Core system roles cannot be disabled.');
      return;
    }

    try {
      await client.put(`/roles/${role.id}/status`);
      loadData();
    } catch (err) {
      alert(`Failed to toggle status: ${err.message}`);
    }
  }

  async function handleDeleteRole(role) {
    if (role.is_system === 1 || ['SUPER_ADMIN', 'CUSTOMER'].includes(role.name)) {
      alert(`Protected system role "${role.name}" cannot be deleted.`);
      return;
    }

    if (role.user_count > 0) {
      alert(`Cannot delete role "${role.name}" because it is currently assigned to ${role.user_count} user(s). Please reassign them to another role first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      return;
    }

    try {
      await client.delete(`/roles/${role.id}`);
      loadData();
    } catch (err) {
      alert(`Delete role failed: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Staff &amp; Role-Based Permissions</span>
          </h1>
          <p className="text-xs text-slate-500">
            Granular access control, custom roles, module-level permission assignments, and internal accounts
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-200 p-1 rounded-xl text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'staff'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Accounts ({staff.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'roles'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Roles &amp; Permissions ({rolesList.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: STAFF ACCOUNTS */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsStaffModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
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
                          className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 cursor-pointer text-xs"
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
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS CRUD */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleOpenCreateRole}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Role</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">Role Name</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5 text-center">Assigned Users</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rolesList.map((r) => {
                    const isSuper = r.name === 'SUPER_ADMIN';
                    const isCustomer = r.name === 'CUSTOMER';
                    const isProtected = isSuper || isCustomer;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5">
                          <div className="font-black text-slate-900 flex items-center gap-1.5">
                            <span>{r.name}</span>
                            {isSuper && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                                Super Admin (Unrestricted)
                              </span>
                            )}
                            {r.is_system === 1 && !isSuper && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                                System
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {r.permission_ids?.length || 0} permissions assigned
                          </div>
                        </td>

                        <td className="p-3.5 text-slate-600 max-w-sm truncate">
                          {r.description || '—'}
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold text-slate-800 text-xs">
                            {r.user_count} {r.user_count === 1 ? 'user' : 'users'}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            disabled={isProtected}
                            onClick={() => handleToggleRoleStatus(r)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-colors cursor-pointer disabled:cursor-not-allowed ${
                              r.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={isProtected ? 'Core system role cannot be toggled' : 'Click to toggle status'}
                          >
                            <span>{r.status || 'ACTIVE'}</span>
                          </button>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRole(r)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                              title="Edit Role & Permissions"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {!isProtected && (
                              <button
                                type="button"
                                disabled={r.user_count > 0}
                                onClick={() => handleDeleteRole(r)}
                                className={`p-1.5 rounded-lg cursor-pointer ${
                                  r.user_count > 0
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title={
                                  r.user_count > 0
                                    ? `Cannot delete: currently assigned to ${r.user_count} user(s)`
                                    : 'Delete Role'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ROLE MODAL WITH GROUPED PERMISSIONS */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>{editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Custom Role'}</span>
                  {editingRole?.name === 'SUPER_ADMIN' && (
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      Super Admin
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Define role identification and check the permissions granted to users with this role.
                </p>
              </div>
            </div>

            {roleError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold">
                {roleError}
              </div>
            )}

            <form onSubmit={handleSaveRole} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Role Name *</label>
                  <input
                    type="text"
                    disabled={editingRole?.name === 'SUPER_ADMIN' || editingRole?.name === 'CUSTOMER'}
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. STORE_MANAGER or CASHIER"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-bold text-slate-900 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Role Status</label>
                  <select
                    disabled={editingRole?.name === 'SUPER_ADMIN' || editingRole?.name === 'CUSTOMER'}
                    value={roleStatus}
                    onChange={(e) => setRoleStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Description</label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="e.g. In-store cashier with POS billing and customer search permissions"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* GROUPED PERMISSIONS MATRIX */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">Permissions Assignment</h4>
                    <p className="text-[11px] text-slate-500">
                      Permissions are grouped by module. Backend enforces permissions on every API route.
                    </p>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    {selectedPermissionIds.length} permissions assigned
                  </div>
                </div>

                {editingRole?.name === 'SUPER_ADMIN' ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-1">
                    <strong className="block font-bold">Unrestricted Access Policy:</strong>
                    <span>SUPER_ADMIN inherently bypasses all individual permission checks on the backend and retains unrestricted access to all supermarket modules.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {Object.keys(permissionsGrouped).map((groupName) => {
                      const groupPerms = permissionsGrouped[groupName] || [];
                      const allInGroupSelected = groupPerms.length > 0 && groupPerms.every(p => selectedPermissionIds.includes(p.id));

                      return (
                        <div
                          key={groupName}
                          className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5"
                        >
                          {/* Module Group Header */}
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                            <h5 className="font-black text-slate-900 text-xs">
                              {groupName}
                            </h5>
                            <button
                              type="button"
                              onClick={() => toggleGroupPermissions(groupName)}
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                            >
                              {allInGroupSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>

                          {/* Individual Module Permissions */}
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {groupPerms.map((perm) => {
                              const isChecked = selectedPermissionIds.includes(perm.id);
                              // Friendly action label
                              const actionName = perm.name.includes('.') ? perm.name.split('.')[1] : perm.name;
                              const formattedAction = actionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-start gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                                    isChecked
                                      ? 'bg-emerald-50/80 text-emerald-950 font-semibold'
                                      : 'text-slate-600 hover:bg-white'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(perm.id)}
                                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <span className="leading-tight">
                                    {formattedAction}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 border rounded-xl cursor-pointer font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingRole ? 'Saving...' : 'Save Role & Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD STAFF ACCOUNT MODAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-black text-slate-900">Add Staff Account</h3>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Name *</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Ramesh Cashier"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile (10 digits) *</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={staffMobile}
                  onChange={(e) => setStaffMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Password *</label>
                <input
                  type="password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="staff@freshmart.local"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Role Assignment *</label>
                <select
                  value={staffRoleId}
                  onChange={(e) => setStaffRoleId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 border rounded-xl cursor-pointer font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingStaff}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {creatingStaff ? 'Saving...' : 'Save Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
