import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import { useNavigate, Link } from 'react-router-dom';
import {
  LogOut, ShoppingCart, TrendingUp, CalendarDays, BedDouble,
  Receipt, BarChart2, X, Menu as MenuIcon, ChevronDown,
} from 'lucide-react';

type DateFilter = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom';

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

interface CategorySummary {
  name: string;
  total: number;
  count: number;
}

export default function Reports() {
  const { user, token, logout, apiFetch } = useStore();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);

  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const updateDatesForFilter = useCallback((filter: DateFilter) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    switch (filter) {
      case 'today':
        start = end = new Date(now);
        break;
      case 'yesterday': {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        start = end = y;
        break;
      }
      case 'this_week': {
        const s = new Date(now); s.setDate(s.getDate() - s.getDay());
        start = s; end = new Date(now);
        break;
      }
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'custom':
        return; // Don't override custom
    }
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (user?.role === 'cashier') { navigate('/'); return; }
    updateDatesForFilter(dateFilter);
  }, [token, user, updateDatesForFilter]);

  const fetchExpenses = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/expenses');
      if (res.ok) {
        const all: Expense[] = await res.json();
        setExpenses(all.filter((e) => e.expense_date >= startDate && e.expense_date <= endDate));
      }
    } finally {
      setLoading(false);
    }
  }, [apiFetch, startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) fetchExpenses();
  }, [startDate, endDate, fetchExpenses]);

  const handleFilterChange = (f: DateFilter) => {
    setDateFilter(f);
    setShowDatePicker(f === 'custom');
    if (f !== 'custom') updateDatesForFilter(f);
  };

  // Summaries
  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const categorySummary: CategorySummary[] = Object.values(
    expenses.reduce((acc, e) => {
      const key = e.category_name || 'Uncategorised';
      if (!acc[key]) acc[key] = { name: key, total: 0, count: 0 };
      acc[key].total += Number(e.amount);
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, CategorySummary>)
  ).sort((a, b) => b.total - a.total);

  const FILTER_LABELS: Record<DateFilter, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'This Week',
    this_month: 'This Month',
    last_month: 'Last Month',
    custom: 'Custom Range',
  };

  const printReport = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const hh = now.getHours(); const ampm = hh >= 12 ? 'PM' : 'AM'; const h12 = hh % 12 || 12;
    const genTime = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(h12)}.${pad(now.getMinutes())} ${ampm}`;

    const catRows = categorySummary.map((cat, i) => {
      const pct = totalAmount > 0 ? (cat.total / totalAmount) * 100 : 0;
      return `<tr><td style="text-align:center">${i+1}</td><td>${cat.name}</td><td style="text-align:right">${cat.count}</td><td style="text-align:right">LKR ${cat.total.toLocaleString(undefined,{minimumFractionDigits:2})}</td><td style="text-align:right">${pct.toFixed(1)}%</td></tr>`;
    }).join('');

    const expRows = expenses.map((e, i) =>
      `<tr><td style="text-align:center">${i+1}</td><td>${e.expense_date}</td><td>${e.category_name||'—'}</td><td>${e.expense_for}</td><td>${e.reference_no||'—'}</td><td style="text-align:right">LKR ${Number(e.amount).toLocaleString(undefined,{minimumFractionDigits:2})}</td><td>${e.created_by||'—'}</td></tr>`
    ).join('');

    win.document.write(`<!DOCTYPE html><html><head><title>Expense Report</title><style>
      body{font-family:Arial,sans-serif;max-width:960px;margin:0 auto;padding:32px;color:#1e293b;}
      .header{text-align:center;border-bottom:3px solid #0891b2;padding-bottom:20px;margin-bottom:24px;}
      .biz-name{font-size:22px;font-weight:700;color:#0f172a;}
      .biz-info{font-size:12px;color:#475569;margin-top:3px;}
      .report-title{font-size:17px;font-weight:700;color:#0891b2;margin-top:10px;}
      .meta{font-size:11px;color:#64748b;margin-top:4px;}
      h3{font-size:12px;font-weight:700;color:#1e293b;margin:20px 0 6px;text-transform:uppercase;letter-spacing:0.05em;}
      table{width:100%;border-collapse:collapse;margin-bottom:20px;}
      th{background:#0891b2;color:white;padding:9px 11px;text-align:left;font-size:11px;}
      td{padding:8px 11px;border-bottom:1px solid #f1f5f9;font-size:12px;}
      tr:hover td{background:#f8fafc;}
      tfoot td{background:#f1f5f9;font-weight:700;border-top:2px solid #0891b2;}
      .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;}
      @media print{body{padding:16px;}}
    </style></head><body>
    <div class="header">
      <div class="biz-name">The Tranquil</div>
      <div class="biz-info">No.194 / 1, Makola South, Makola, Sri Lanka</div>
      <div class="biz-info">+94 11 2 965 888 / +94 77 5 072 909</div>
      <div class="report-title">Expense Report</div>
      <div class="meta">Report Duration: ${startDate} &mdash; ${endDate}</div>
      <div class="meta">Generated: ${genTime}</div>
    </div>
    <h3>By Category</h3>
    <table><thead><tr><th style="width:36px;text-align:center">#</th><th>Category</th><th style="text-align:right">Transactions</th><th style="text-align:right">Total Amount</th><th style="text-align:right">% of Total</th></tr></thead>
    <tbody>${catRows}</tbody>
    <tfoot><tr><td></td><td><strong>Total</strong></td><td style="text-align:right">${expenses.length}</td><td style="text-align:right">LKR ${totalAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</td><td></td></tr></tfoot>
    </table>
    <h3>All Transactions</h3>
    <table><thead><tr><th style="width:36px;text-align:center">#</th><th>Date</th><th>Category</th><th>Expense For</th><th>Reference No.</th><th style="text-align:right">Amount</th><th>Created By</th></tr></thead>
    <tbody>${expRows}</tbody>
    <tfoot><tr><td colspan="5"><strong>Total</strong></td><td style="text-align:right">LKR ${totalAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</td><td></td></tr></tfoot>
    </table>
    <div class="footer">Digital Solutions by Click Inmo Pvt Ltd.<br><a href="https://clickinmo.com" target="_blank" style="color:#0891b2;text-decoration:underline;">https://clickinmo.com</a></div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {showSidebar && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* ══ Sidebar ══ */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-64 bg-slate-900 text-slate-300 fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-auto shrink-0 overflow-y-auto`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-bold text-white leading-tight">The Tranquil Restaurant</h1>
          <button onClick={() => setShowSidebar(false)} className="md:hidden text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <nav className="px-4 py-4 flex-1 space-y-0.5">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition-colors text-sm">
            <ShoppingCart size={17} /><span>POS Terminal</span>
          </Link>
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition-colors text-sm">
            <TrendingUp size={17} /><span>Dashboard & Analytics</span>
          </Link>
          <Link to="/events" className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition-colors text-sm">
            <CalendarDays size={17} /><span>Event Management</span>
          </Link>
          <Link to="/room-service" className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition-colors text-sm">
            <BedDouble size={17} /><span>Room Service</span>
          </Link>
          <Link to="/expenses" className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition-colors text-sm">
            <Receipt size={17} /><span>Expenses</span>
          </Link>
          <Link to="/reports" className="flex items-center gap-3 px-3 py-2.5 bg-cyan-600 text-white rounded-xl transition-colors text-sm font-semibold">
            <BarChart2 size={17} /><span>Reports</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      {/* ══ Content ══ */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
          <button onClick={() => setShowSidebar(true)} className="md:hidden text-slate-600 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100">
            <MenuIcon size={22} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-xl shrink-0"><BarChart2 size={20} /></div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Reports</p>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">Expense Report</h2>
            </div>
          </div>
          <p className="ml-auto text-xs text-slate-400 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        <main className="p-4 md:p-8 space-y-6">
          {/* ── Filter bar ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FILTER_LABELS) as DateFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${dateFilter === f ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 ml-auto">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                <span className="text-slate-400 text-sm">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </div>
            )}
            {dateFilter !== 'custom' && startDate && endDate && (
              <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                {startDate} → {endDate}
              </span>
            )}
            <button
              onClick={printReport}
              disabled={expenses.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Receipt size={15} /> Print Report
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Summary cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard label="Total Expenses" value={`LKR ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} sub={`${expenses.length} transaction${expenses.length !== 1 ? 's' : ''}`} color="bg-amber-50 text-amber-700" />
                <SummaryCard label="Categories" value={String(categorySummary.length)} sub="expense categories" color="bg-cyan-50 text-cyan-700" />
                <SummaryCard
                  label="Highest Category"
                  value={categorySummary[0]?.name || '—'}
                  sub={categorySummary[0] ? `LKR ${categorySummary[0].total.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'No data'}
                  color="bg-violet-50 text-violet-700"
                />
              </div>

              {/* ── Category breakdown ── */}
              {categorySummary.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">By Category</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Category', 'Transactions', 'Total Amount', '% of Total'].map((h) => (
                          <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {categorySummary.map((cat) => {
                        const pct = totalAmount > 0 ? (cat.total / totalAmount) * 100 : 0;
                        return (
                          <tr key={cat.name} className="hover:bg-slate-50/70">
                            <td className="px-5 py-3.5 font-semibold text-slate-800">{cat.name}</td>
                            <td className="px-5 py-3.5 text-slate-600">{cat.count}</td>
                            <td className="px-5 py-3.5 font-semibold text-slate-800">LKR {cat.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div className="h-2 bg-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td className="px-5 py-3 text-xs font-bold text-slate-600 uppercase">Total</td>
                        <td className="px-5 py-3 font-bold text-slate-800">{expenses.length}</td>
                        <td className="px-5 py-3 font-bold text-slate-800">LKR {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* ── Expense detail ── */}
              {expenses.length > 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">All Transactions</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          {['Date', 'Category', 'Expense for', 'Reference No.', 'Amount', 'Created by'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {expenses.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.expense_date}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{e.category_name || '—'}</td>
                            <td className="px-4 py-3 text-slate-700">{e.expense_for}</td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{e.reference_no || '—'}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">LKR {Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{e.created_by || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Total</td>
                          <td className="px-4 py-3 font-bold text-slate-800">LKR {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
                  <div className="text-slate-300 flex justify-center mb-3"><Receipt size={32} /></div>
                  <p className="text-slate-500 font-medium">No expenses found for the selected period.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 border border-slate-100 shadow-sm ${color} bg-opacity-30`}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold leading-tight">{value}</p>
      <p className="text-xs opacity-60 mt-1">{sub}</p>
    </div>
  );
}
