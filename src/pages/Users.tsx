import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Users, ShieldCheck } from 'lucide-react';
import { useStore, StaffUser } from '../store';
import AppSidebar from '../components/AppSidebar';

const ROLE_OPTIONS = ['admin', 'manager', 'cashier'];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-violet-100 text-violet-700',
  cashier: 'bg-cyan-100 text-cyan-700',
};

export default function UsersPage() {
  const { staffUsers, fetchStaffUsers, createStaffUser, updateStaffUser, deleteStaffUser, user } = useStore();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffUser | null>(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'cashier' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchStaffUsers();
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ username: '', password: '', name: '', role: 'cashier' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (s: StaffUser) => {
    setEditTarget(s);
    setForm({ username: s.username, password: '', name: s.name, role: s.role });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!editTarget && !form.username.trim()) {
      setError('Username is required');
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        const updates: { name?: string; role?: string; password?: string } = {
          name: form.name,
          role: form.role,
        };
        if (form.password.trim()) updates.password = form.password;
        await updateStaffUser(editTarget.id, updates);
      } else {
        await createStaffUser({
          username: form.username.trim(),
          password: '1234',
          name: form.name.trim(),
          role: 'cashier',
        });
      }
      setShowModal(false);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStaffUser(id);
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <AppSidebar show={showSidebar} onClose={() => setShowSidebar(false)} />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-slate-500" />
            <h1 className="text-base font-bold text-slate-800">Staff Users</h1>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={16} /> Add Staff
            </button>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {staffUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Users size={48} className="opacity-20 mb-3" />
              <p className="text-sm">No staff users yet</p>
              {isAdmin && (
                <button
                  onClick={openCreate}
                  className="mt-4 px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700"
                >
                  + Add Staff
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {staffUsers.map(s => (
                <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-lg shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400 truncate mb-2">@{s.username}</p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[s.role] || 'bg-slate-100 text-slate-600'}`}>
                      <ShieldCheck size={10} /> {s.role}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(s.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                        disabled={s.id === user?.id}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">
                {editTarget ? 'Edit Staff' : 'Add Staff'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full Name *</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. John Silva"
                />
              </div>
              {!editTarget && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Username *</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="e.g. johnsilva"
                    autoComplete="off"
                  />
                </div>
              )}
              {editTarget && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">New Password (leave blank to keep current)</label>
                    <input
                      type="password"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Role *</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:opacity-60"
              >
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2">Delete Staff Member?</h3>
            <p className="text-sm text-slate-500 mb-6">This cannot be undone. The user will lose access to the system.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
