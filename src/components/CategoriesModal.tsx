import React, { useState } from 'react';
import { X, Plus, Pencil, Trash2, Check, GripVertical } from 'lucide-react';
import { useStore, Category } from '../store';

interface Props {
  onClose: () => void;
}

export default function CategoriesModal({ onClose }: Props) {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore();

  const [newName, setNewName] = useState('');
  const [newMenuType, setNewMenuType] = useState<'function' | 'restaurant'>('restaurant');
  const [addingError, setAddingError] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMenuType, setEditMenuType] = useState<'function' | 'restaurant'>('restaurant');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) { setAddingError('Name is required.'); return; }
    setAddingError('');
    setAdding(true);
    try {
      await addCategory({
        name: newName.trim(),
        color: 'bg-slate-100',
        sort_order: categories.length + 1,
        menu_type: newMenuType,
      });
      setNewName('');
    } catch (e: any) {
      setAddingError(e.message || 'Failed to add category.');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditMenuType(cat.menu_type || 'restaurant');
    setEditError('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) { setEditError('Name is required.'); return; }
    setEditError('');
    setSaving(true);
    try {
      await updateCategory(id, { name: editName.trim(), menu_type: editMenuType });
      setEditingId(null);
    } catch (e: any) {
      setEditError(e.message || 'Failed to update category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCategory(id);
    } catch (e: any) {
      // swallow — item still visually removed if API failed? just log it
      console.error('Delete category error:', e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Manage Categories</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Add new category */}
        <div className="px-6 py-4 border-b border-slate-100 shrink-0">
          <label className="block text-sm font-medium text-slate-700 mb-2">Add New Category</label>
          {/* Menu type toggle */}
          <div className="flex gap-1 mb-2 bg-slate-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setNewMenuType('restaurant')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${newMenuType === 'restaurant' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Restaurant Menu
            </button>
            <button
              onClick={() => setNewMenuType('function')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${newMenuType === 'function' ? 'bg-white text-violet-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Function Menu
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Category name..."
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-black disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              <Plus size={15} />
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
          {addingError && <p className="mt-1.5 text-xs text-red-500">{addingError}</p>}
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {categories.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">No categories yet.</p>
          )}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors group"
            >
              <GripVertical size={16} className="text-slate-300 shrink-0" />

              {editingId === cat.id ? (
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(cat.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                      <button
                        onClick={() => setEditMenuType('restaurant')}
                        className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${editMenuType === 'restaurant' ? 'bg-white text-slate-800 shadow' : 'text-slate-500'}`}
                      >Restaurant</button>
                      <button
                        onClick={() => setEditMenuType('function')}
                        className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${editMenuType === 'function' ? 'bg-white text-violet-700 shadow' : 'text-slate-500'}`}
                      >Function</button>
                    </div>
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={saving}
                      className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                    >
                      <X size={14} />
                    </button>
                    {editError && <span className="text-xs text-red-500">{editError}</span>}
                  </div>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-slate-800">{cat.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold mr-1 ${(cat.menu_type || 'restaurant') === 'function' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                    {(cat.menu_type || 'restaurant') === 'function' ? 'Function' : 'Restaurant'}
                  </span>
                  <span className="text-xs text-slate-400 mr-1">#{cat.sort_order}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      disabled={deletingId === cat.id}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
