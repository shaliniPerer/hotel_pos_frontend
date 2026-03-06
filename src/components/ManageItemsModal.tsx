import React, { useRef, useState } from 'react';
import { X, Pencil, Trash2, ChevronDown, Upload, Plus } from 'lucide-react';
import { useStore } from '../store';
import type { Product } from '../store';

interface Props { onClose: () => void; }

type EditState = {
  id: string;
  code: string;
  name: string;
  description: string;
  price: string;
  category_id: string;
  kot: boolean;
  bot: boolean;
  image: string;
};

export default function ManageItemsModal({ onClose }: Props) {
  const { products, categories, updateProduct, deleteProduct, addCategory } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterCat, setFilterCat] = useState<string>('');
  const [search, setSearch]     = useState('');

  // Inline new-category
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat]   = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayed = products.filter(p => {
    const matchesCat    = filterCat ? p.category_id === filterCat : true;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEditState({
      id: p.id, code: p.code || '', name: p.name,
      description: p.description || '',
      price: String(p.price), category_id: p.category_id,
      kot: p.kot ?? false, bot: p.bot ?? false, image: p.image || '',
    });
    setError('');
  }

  function cancelEdit() { setEditingId(null); setEditState(null); setError(''); }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editState) return;
    const reader = new FileReader();
    reader.onload = () => setEditState(s => s ? { ...s, image: reader.result as string } : s);
    reader.readAsDataURL(file);
  }

  async function handleSaveEdit() {
    if (!editState) return;
    if (!editState.name.trim()) { setError('Name is required.'); return; }
    if (!editState.category_id)  { setError('Category is required.'); return; }
    const price = Number(editState.price);
    if (isNaN(price) || price < 0) { setError('Invalid price.'); return; }
    setError(''); setSaving(true);
    try {
      await updateProduct(editState.id, {
        code: editState.code, name: editState.name.trim(),
        description: editState.description, price,
        category_id: editState.category_id,
        kot: editState.kot, bot: editState.bot, image: editState.image,
      });
      cancelEdit();
    } catch (e: any) { setError(e.message || 'Save failed.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try { await deleteProduct(id); setDeletingId(null); }
    catch (e: any) { alert('Delete failed: ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleAddCategory() {
    if (!newCatName.trim() || !editState) return;
    setAddingCat(true);
    try {
      const cat = await addCategory({ name: newCatName.trim(), color: 'bg-slate-100', sort_order: categories.length + 1 });
      setEditState(s => s ? { ...s, category_id: cat.id } : s);
      setNewCatName(''); setShowNewCat(false);
    } catch { /* ignore */ }
    finally { setAddingCat(false); }
  }

  const categoryName = (id: string) => categories.find(c => c.id === id)?.name || '—';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Manage Items</h2>
            <p className="text-sm text-slate-500 mt-0.5">{products.length} total items</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
          />
          <div className="relative">
            <select
              value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="appearance-none border border-slate-200 rounded-lg px-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Item</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Category</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Price</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">KOT/BOT</th>
                <th className="px-6 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">No items found</td></tr>
              )}

              {displayed.map(product => (
                <React.Fragment key={product.id}>
                  {/* Row */}
                  <tr className={editingId === product.id ? 'bg-slate-50' : 'hover:bg-slate-50/50'}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-slate-300">
                          {product.image
                            ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            : <span className="text-lg font-bold text-slate-300">{product.name[0]}</span>}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{product.name}</div>
                          {product.code && <div className="text-xs text-slate-400">{product.code}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{categoryName(product.category_id)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">LKR {product.price.toFixed(2)}</td>
                    <td className="px-3 py-3 text-center text-xs text-slate-500">
                      {product.kot && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-1">KOT</span>}
                      {product.bot && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">BOT</span>}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === product.id ? (
                          <button onClick={cancelEdit} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 border border-slate-200 rounded-lg">Cancel</button>
                        ) : (
                          <>
                            <button onClick={() => startEdit(product)} className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => setDeletingId(product.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline Edit Form */}
                  {editingId === product.id && editState && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={5} className="px-6 pb-5 pt-1">
                        {error && <p className="text-red-500 text-xs mb-3 font-medium">{error}</p>}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Left col */}
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Item Code</label>
                              <input value={editState.code} onChange={e => setEditState(s => s ? { ...s, code: e.target.value } : s)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Item Name <span className="text-red-400">*</span></label>
                              <input value={editState.name} onChange={e => setEditState(s => s ? { ...s, name: e.target.value } : s)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                              <textarea value={editState.description} onChange={e => setEditState(s => s ? { ...s, description: e.target.value } : s)} rows={2}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 resize-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Price <span className="text-red-400">*</span></label>
                              <input type="number" min="0" step="0.01" value={editState.price} onChange={e => setEditState(s => s ? { ...s, price: e.target.value } : s)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800" />
                            </div>
                          </div>
                          {/* Right col */}
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Category <span className="text-red-400">*</span></label>
                              <div className="relative">
                                <select value={editState.category_id} onChange={e => setEditState(s => s ? { ...s, category_id: e.target.value } : s)}
                                  className="w-full appearance-none border border-slate-200 rounded-lg px-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white">
                                  <option value="">Select category</option>
                                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              </div>
                              {!showNewCat && (
                                <button onClick={() => setShowNewCat(true)} className="mt-1 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                                  <Plus size={12} /> Add new category
                                </button>
                              )}
                              {showNewCat && (
                                <div className="mt-2 flex gap-2">
                                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                                    placeholder="Category name"
                                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800" />
                                  <button onClick={handleAddCategory} disabled={addingCat || !newCatName.trim()}
                                    className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg disabled:opacity-50">
                                    {addingCat ? '...' : 'Add'}
                                  </button>
                                  <button onClick={() => setShowNewCat(false)} className="px-2 py-1.5 text-xs text-slate-500">✕</button>
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-2">Options</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={editState.kot} onChange={e => setEditState(s => s ? { ...s, kot: e.target.checked } : s)} className="rounded" />
                                  <span className="text-sm text-slate-700">KOT</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={editState.bot} onChange={e => setEditState(s => s ? { ...s, bot: e.target.checked } : s)} className="rounded" />
                                  <span className="text-sm text-slate-700">BOT</span>
                                </label>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Item Image</label>
                              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                              <button onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors w-full justify-center">
                                <Upload size={16} />
                                {editState.image ? 'Change Image' : 'Upload Image'}
                              </button>
                              {editState.image && (
                                <img src={editState.image} alt="preview" className="mt-2 w-16 h-16 rounded-lg object-cover border border-slate-200" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                          <button onClick={cancelEdit} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
                          <button onClick={handleSaveEdit} disabled={saving}
                            className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-slate-900 text-lg mb-2">Delete Item?</h3>
            <p className="text-slate-500 text-sm mb-6">
              "{products.find(p => p.id === deletingId)?.name}" will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deletingId)} disabled={saving}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
