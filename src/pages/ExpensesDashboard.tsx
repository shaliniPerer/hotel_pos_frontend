import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Menu as MenuIcon, Search, Download, FileText, X,
} from 'lucide-react';
import AppSidebar from '../components/AppSidebar';

interface ExpenseCategory {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  expense_date: string;
  category_id: string;
  category_name: string;
  expense_for: string;
  amount: number;
  reference_no: string;
  note: string;
  created_by: string;
}

export default function ExpensesDashboard() {
  const { user, apiFetch } = useStore();
  const navigate = useNavigate();

  const [showSidebar, setShowSidebar] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [categoryId, setCategoryId] = useState('');
  const [refSearch, setRefSearch] = useState('');

  useEffect(() => {
    if (user?.role === 'cashier') { navigate('/'); return; }
    apiFetch('/api/expenses/categories')
      .then(r => r.ok ? r.json() : [])
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const formatDisplay = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}-${m}-${y}`;
  };

  const fetchReport = async () => {
    if (!fromDate || !toDate) { setErrorMsg('Please Enter Valid Information'); return; }
    if (fromDate > toDate) { setErrorMsg('From Date cannot be after To Date'); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate });
      if (categoryId) params.set('category_id', categoryId);
      const res = await apiFetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
      } else {
        setExpenses([]);
      }
      setHasSearched(true);
    } catch {
      setExpenses([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setHasSearched(false);
    setExpenses([]);
    setRefSearch('');
    setErrorMsg('');
    setFromDate(today);
    setToDate(today);
    setCategoryId('');
  };

  const filtered = refSearch.trim()
    ? expenses.filter(e =>
        e.reference_no?.toLowerCase().includes(refSearch.trim().toLowerCase())
      )
    : expenses;

  const totalAmount = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  const downloadPDF = () => {
    const win = window.open('', '_blank', 'width=1000,height=750');
    if (!win) return;
    const catLabel = categoryId
      ? categories.find(c => c.id === categoryId)?.name || 'Unknown'
      : 'All Categories';
    const rows = filtered.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${formatDisplay(e.expense_date)}</td>
        <td>${e.reference_no || '—'}</td>
        <td>${e.category_name || '—'}</td>
        <td>${e.expense_for || '—'}</td>
        <td style="text-align:right">LKR ${(e.amount || 0).toFixed(2)}</td>
        <td>${e.note || '—'}</td>
        <td>${e.created_by || '—'}</td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Expense Report</title><style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;padding:28px;}
      .header{text-align:center;border-bottom:3px solid #f97316;padding-bottom:14px;margin-bottom:18px;}
      .title{font-size:22px;font-weight:700;color:#f97316;}.sub{font-size:11px;color:#64748b;margin-top:3px;}
      .filters{display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;}
      .filter-item{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:6px 12px;font-size:11px;}
      .filter-item strong{color:#ea580c;}
      .summary{display:flex;gap:12px;margin-bottom:16px;}
      .card{border-radius:8px;padding:10px 14px;min-width:120px;}
      table{width:100%;border-collapse:collapse;}
      th{background:#f97316;color:white;padding:8px 10px;text-align:left;font-size:11px;}
      td{padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;}
      tr:nth-child(even){background:#fff7ed;}
      .total-row td{font-weight:700;background:#fff7ed;border-top:2px solid #f97316;}
      .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:10px;}
    </style></head><body>
    <div class="header">
      <div class="title">HotelMate POS</div>
      <div class="sub">Expense Report</div>
      <div class="sub">Generated: ${new Date().toLocaleString()}</div>
    </div>
    <div class="filters">
      <div class="filter-item"><strong>From:</strong> ${formatDisplay(fromDate)}</div>
      <div class="filter-item"><strong>To:</strong> ${formatDisplay(toDate)}</div>
      <div class="filter-item"><strong>Category:</strong> ${catLabel}</div>
      ${refSearch ? `<div class="filter-item"><strong>Ref No:</strong> ${refSearch}</div>` : ''}
    </div>
    <div class="summary">
      <div class="card" style="background:#fff7ed;border:1px solid #fed7aa">
        <div style="font-size:10px;color:#ea580c;font-weight:700;text-transform:uppercase">Total Records</div>
        <div style="font-size:20px;font-weight:700;color:#c2410c">${filtered.length}</div>
      </div>
      <div class="card" style="background:#fff7ed;border:1px solid #fed7aa">
        <div style="font-size:10px;color:#ea580c;font-weight:700;text-transform:uppercase">Total Amount</div>
        <div style="font-size:20px;font-weight:700;color:#c2410c">LKR ${totalAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
      </div>
    </div>
    <table><thead><tr>
      <th>#</th><th>Date</th><th>Ref No</th><th>Category</th><th>Expense For</th><th>Amount</th><th>Note</th><th>Created By</th>
    </tr></thead>
    <tbody>${rows}
      <tr class="total-row">
        <td colspan="5" style="text-align:right">Total</td>
        <td style="text-align:right">LKR ${totalAmount.toFixed(2)}</td>
        <td colspan="2"></td>
      </tr>
    </tbody></table>
    <div class="footer">HotelMate POS — Expense Report — ${filtered.length} record(s)</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const downloadCSV = () => {
    if (!filtered.length) return;
    const headers = ['#', 'Date', 'Ref No', 'Category', 'Expense For', 'Amount', 'Note', 'Created By'];
    const rows = filtered.map((e, i) => [
      i + 1, formatDisplay(e.expense_date), e.reference_no || '',
      e.category_name || '', e.expense_for || '',
      e.amount || 0, e.note || '', e.created_by || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `expense_report_${fromDate}_${toDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <AppSidebar show={showSidebar} onClose={() => setShowSidebar(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-sm shrink-0">
          <button onClick={() => setShowSidebar(true)} className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <MenuIcon className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-500 rounded-xl shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Expenses</p>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">Expense Report</h2>
            </div>
          </div>
          <p className="ml-auto text-xs text-slate-400 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Filter Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            {errorMsg && (
              <p className="text-red-500 text-sm font-medium mb-4">{errorMsg}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {/* From Date */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-600 w-28 shrink-0">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              {/* To Date */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-600 w-28 shrink-0">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              {/* Category */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-600 w-28 shrink-0">Category Name</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                >
                  <option value="">-All-</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {/* Reference No */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-600 w-28 shrink-0">Reference No</label>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={refSearch}
                    onChange={e => setRefSearch(e.target.value)}
                    placeholder="Search by reference no..."
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={fetchReport}
                disabled={loading}
                className="px-10 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                {loading ? 'Loading...' : 'Show'}
              </button>
              <button
                onClick={handleClose}
                className="px-10 py-2.5 bg-orange-400 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>

          {/* Results */}
          {hasSearched && (
            <>
              {/* Summary + Download */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex gap-3">
                  <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-orange-500">Records</p>
                    <p className="text-xl font-bold text-orange-700">{filtered.length}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-orange-500">Total Amount</p>
                    <p className="text-xl font-bold text-orange-700">LKR {totalAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</p>
                  </div>
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={downloadPDF}
                    disabled={!filtered.length}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> Download PDF
                  </button>
                  <button
                    onClick={downloadCSV}
                    disabled={!filtered.length}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download CSV
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-orange-500 text-white">
                      <th className="px-4 py-3 font-semibold">#</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Ref No</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Expense For</th>
                      <th className="px-4 py-3 font-semibold text-right">Amount</th>
                      <th className="px-4 py-3 font-semibold">Note</th>
                      <th className="px-4 py-3 font-semibold">Created By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((e, i) => (
                      <tr key={e.id} className="hover:bg-orange-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatDisplay(e.expense_date)}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{e.reference_no || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{e.category_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-800 font-medium">{e.expense_for || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">LKR {(e.amount || 0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-40 truncate">{e.note || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{e.created_by || '—'}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-500">No expenses found for the selected filters</td></tr>
                    )}
                    {filtered.length > 0 && (
                      <tr className="bg-orange-50 font-bold">
                        <td colSpan={5} className="px-4 py-3 text-right text-slate-700">Total</td>
                        <td className="px-4 py-3 text-right text-orange-700">LKR {totalAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                        <td colSpan={2}></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
