import React, { useState } from 'react';
import { X, CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store';

interface Props { onClose: () => void; }

export default function AttachItemModal({ onClose }: Props) {
  const { products, categories, updateProduct } = useStore();
  const [filterCat, setFilterCat] = useState<string>('all');
  const [toggling, setToggling]   = useState<Set<string>>(new Set());
  const [search, setSearch]       = useState('');

  const displayed = products.filter(p => {
    const matchesCat    = filterCat === 'all' ? true : p.category_id === filterCat;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Group by category
  const grouped = categories.reduce<Record<string, typeof products>>((acc, cat) => {
    const items = displayed.filter(p => p.category_id === cat.id);
    if (items.length > 0) acc[cat.id] = items;
    return acc;
  }, {});
  // Uncategorised
  const uncategorised = displayed.filter(p => !categories.find(c => c.id === p.category_id));
  if (uncategorised.length > 0) grouped['__none__'] = uncategorised;

  async function toggleVisible(id: string, current: boolean) {
    setToggling(prev => new Set(prev).add(id));
    try {
      await updateProduct(id, { visible: !current });
    } catch (e: any) {
      alert('Failed to update item: ' + e.message);
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  const totalVisible = products.filter(p => p.visible !== false).length;
  const totalHidden  = products.length - totalVisible;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Attach Item to Outlet</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Ticked items appear in the POS menu ·{' '}
              <span className="text-emerald-600 font-medium">{totalVisible} visible</span>
              {totalHidden > 0 && <span className="text-slate-400"> · {totalHidden} hidden</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0 flex-wrap">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
          />
          {/* Category filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1">
            <button
              onClick={() => setFilterCat('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterCat === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setFilterCat(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterCat === c.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="px-6 py-2 border-b border-slate-100 flex items-center gap-6 text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Visible in POS menu</span>
          <span className="flex items-center gap-1.5"><Circle size={14} className="text-slate-300" /> Hidden from POS menu</span>
          <span className="text-slate-400">Click item to toggle</span>
        </div>

        {/* Items, grouped by category */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {Object.keys(grouped).length === 0 && (
            <p className="text-center py-12 text-slate-400">No items found</p>
          )}

          {Object.entries(grouped).map(([catId, items]) => {
            const catName = catId === '__none__' ? 'Uncategorised' : (categories.find(c => c.id === catId)?.name || catId);
            const visibleCount = items.filter(p => p.visible !== false).length;
            return (
              <div key={catId}>
                {/* Category heading */}
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{catName}</h3>
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-400">{visibleCount}/{items.length} visible</span>
                </div>

                {/* Item cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {items.map(product => {
                    const isVisible = product.visible !== false;
                    const isToggling = toggling.has(product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => !isToggling && toggleVisible(product.id, isVisible)}
                        disabled={isToggling}
                        className={`relative text-left rounded-xl border-2 p-3 transition-all group ${
                          isVisible
                            ? 'border-emerald-400 bg-emerald-50/50 hover:border-emerald-500'
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 opacity-60'
                        } ${isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                      >
                        {/* Tick indicator */}
                        <div className="absolute top-2 right-2">
                          {isVisible
                            ? <CheckCircle2 size={18} className="text-emerald-500" />
                            : <Circle size={18} className="text-slate-300" />}
                        </div>

                        {/* Image */}
                        <div className="w-full aspect-square bg-white rounded-lg mb-2 overflow-hidden border border-slate-100 flex items-center justify-center text-slate-300">
                          {product.image
                            ? <img src={product.image} alt={product.name} className={`w-full h-full object-cover ${!isVisible ? 'grayscale' : ''}`} />
                            : <span className="text-2xl font-bold text-slate-200">{product.name[0]}</span>}
                        </div>

                        <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">{product.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">LKR {product.price.toFixed(2)}</p>

                        {/* Hidden badge */}
                        {!isVisible && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                            <EyeOff size={10} /> Hidden
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-400">Changes are saved immediately when you click an item</p>
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
