import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useStore } from '../store';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function AddItemModal({ onClose, onSaved }: Props) {
  const { categories, products } = useStore();
  const addProduct = useStore((s) => s.addProduct);
  const addCategory = useStore((s) => s.addCategory);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [posCenter, setPosCenter] = useState(true);
  const [kot, setKot] = useState(false);

  // Inline new-category creation
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const cat = await addCategory({
        name: newCatName.trim(),
        color: 'bg-slate-100',
        sort_order: categories.length + 1,
      });
      setCategoryId(cat.id);
      setNewCatName('');
      setShowNewCat(false);
    } catch (e) {
      console.error('Add category error:', e);
    } finally {
      setAddingCat(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Item Name is required.'); return; }
    if (!categoryId) { setError('Please select a category.'); return; }
    if (isNaN(Number(price)) || Number(price) < 0) { setError('Please enter a valid price.'); return; }
    if (code.trim() && products.some(p => p.code && p.code.toLowerCase() === code.trim().toLowerCase())) {
      setError(`Item code "${code.trim()}" is already in use. Please choose a different code.`);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await addProduct({
        code,
        name: name.trim(),
        description,
        price: Number(price),
        category_id: categoryId,
        image: '',
        kot,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
          <h2 className="text-lg font-bold text-slate-900">Add New Item</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-4">
              {/* Item Code */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError(''); }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    code.trim() && products.some(p => p.code && p.code.toLowerCase() === code.trim().toLowerCase())
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-300'
                  }`}
                />
                {code.trim() && products.some(p => p.code && p.code.toLowerCase() === code.trim().toLowerCase()) && (
                  <p className="text-xs text-red-500 mt-1">This code is already used by another item.</p>
                )}
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <div className="flex gap-2">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCat(!showNewCat)}
                    className="w-9 h-9 flex items-center justify-center border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {showNewCat && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="New category name"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      onClick={handleAddCategory}
                      disabled={addingCat || !newCatName.trim()}
                      className="px-3 py-2 bg-cyan-500 text-white text-sm font-medium rounded-lg hover:bg-cyan-600 disabled:opacity-50 transition-colors"
                    >
                      {addingCat ? '...' : 'Add'}
                    </button>
                  </div>
                )}
              </div>

              {/* KOT */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">KOT (Kitchen Order Ticket)</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="kot" checked={kot} onChange={() => setKot(true)} className="w-4 h-4 text-cyan-600 focus:ring-cyan-500" />
                    <span className="text-sm text-slate-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="kot" checked={!kot} onChange={() => setKot(false)} className="w-4 h-4 text-cyan-600 focus:ring-cyan-500" />
                    <span className="text-sm text-slate-700">No</span>
                  </label>
                </div>
              </div>

              {/* Error */}
              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
