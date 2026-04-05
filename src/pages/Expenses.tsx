import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LogOut, Plus, Trash2, Edit2, X, ShoppingCart, TrendingUp,
  CalendarDays, BedDouble, Receipt, Tag, List, FileText,
  CheckCircle, AlertTriangle, Menu as MenuIcon, BarChart2,
  Download, Search,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AppSidebar from '../components/AppSidebar';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubPage = 'new-expense' | 'expenses-list' | 'new-category' | 'categories-list';

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
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
  image?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Sub-nav ──────────────────────────────────────────────────────────────────

const SUB_NAV: { id: SubPage; label: string; icon: React.ReactNode }[] = [
  { id: 'expenses-list',   label: 'Expenses List',   icon: <List size={17} /> },
  { id: 'new-expense',     label: 'New Expense',     icon: <Receipt size={17} /> },
  { id: 'categories-list', label: 'Categories List', icon: <FileText size={17} /> },
  { id: 'new-category',    label: 'New Category',    icon: <Tag size={17} /> },
];

const VALID_TABS: SubPage[] = ['expenses-list', 'new-expense', 'categories-list', 'new-category'];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Expenses() {
  const { user, token, logout, apiFetch } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(false);

  // Derive active tab entirely from URL — always in sync
  const activePage = useMemo<SubPage>(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as SubPage;
    return VALID_TABS.includes(tab) ? tab : 'expenses-list';
  }, [location.search]);

  const setActivePage = useCallback((page: SubPage) => {
    navigate(`/expenses?tab=${page}`, { replace: true });
  }, [navigate]);

  // Data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category_id: '',
    expense_for: '',
    amount: '',
    reference_no: '',
    image: '',
    note: '',
  });
  const [expenseFormLoading, setExpenseFormLoading] = useState(false);
  const [expenseFormError, setExpenseFormError] = useState('');
  const [expenseFormSuccess, setExpenseFormSuccess] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Category form
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [categoryFormLoading, setCategoryFormLoading] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState('');
  const [categoryFormSuccess, setCategoryFormSuccess] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  // Search / filter state
  const [searchCategory, setSearchCategory] = useState('');
  const [searchRefNo, setSearchRefNo] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (searchCategory && e.category_id !== searchCategory) return false;
      if (searchRefNo && !e.reference_no?.toLowerCase().includes(searchRefNo.toLowerCase())) return false;
      if (searchDateFrom && e.expense_date < searchDateFrom) return false;
      if (searchDateTo && e.expense_date > searchDateTo) return false;
      return true;
    });
  }, [expenses, searchCategory, searchRefNo, searchDateFrom, searchDateTo]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const hh = now.getHours(); const ampm = hh >= 12 ? 'PM' : 'AM'; const h12 = hh % 12 || 12;
    const genTime = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(h12)}.${pad(now.getMinutes())} ${ampm}`;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('The Tranquil', pageWidth / 2, 16, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('No.194 / 1, Makola South, Makola, Sri Lanka', pageWidth / 2, 22, { align: 'center' });
    doc.text('+94 11 2 965 888 / +94 77 5 072 909', pageWidth / 2, 27, { align: 'center' });
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Expenses Report', pageWidth / 2, 35, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    const periodStr = (searchDateFrom || searchDateTo)
      ? `Report Duration: ${searchDateFrom || '—'} to ${searchDateTo || '—'}`
      : 'Report Duration: All Time';
    doc.text(periodStr, pageWidth / 2, 41, { align: 'center' });
    doc.text(`Generated: ${genTime}`, pageWidth / 2, 46, { align: 'center' });

    autoTable(doc, {
      startY: 52,
      head: [['#', 'Date', 'Category', 'Reference No.', 'Expense For', 'Amount (LKR)', 'Created By']],
      body: filteredExpenses.map((e, i) => [
        i + 1,
        e.expense_date,
        e.category_name || '—',
        e.reference_no || '—',
        e.expense_for,
        Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        e.created_by || '—',
      ]),
      foot: [['', '', '', '', 'Total', filteredExpenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), '']],
      headStyles: { fillColor: [8, 145, 178] },
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' } },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150);
    doc.text('Digital Solutions by Click Inmo Pvt Ltd.', pageWidth / 2, finalY, { align: 'center' });
    doc.setTextColor(8, 145, 178);
    doc.text('https://clickinmo.com', pageWidth / 2, finalY + 5, { align: 'center' });
    const _expUrlW = doc.getTextWidth('https://clickinmo.com');
    doc.link((pageWidth - _expUrlW) / 2, finalY + 1, _expUrlW, 5, { url: 'https://clickinmo.com' });
    doc.setTextColor(0, 0, 0);

    doc.save(`expenses-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expensesRes, catRes] = await Promise.all([
        apiFetch('/api/expenses'),
        apiFetch('/api/expenses/categories'),
      ]);
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (catRes.ok) setExpenseCategories(await catRes.json());
    } catch (err) {
      console.error('Expenses fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (user?.role === 'cashier') { navigate('/'); return; }
    fetchData();
  }, [token, user, fetchData, navigate]);

  const handleLogout = () => { logout(); navigate('/login'); };

  // ── Expense CRUD ───────────────────────────────────────────────────────────

  const resetExpenseForm = (exp?: Expense) => {
    setExpenseForm({
      expense_date: exp?.expense_date || new Date().toISOString().split('T')[0],
      category_id: exp?.category_id || '',
      expense_for: exp?.expense_for || '',
      amount: exp ? String(exp.amount) : '',
      reference_no: exp?.reference_no || '',
      image: exp?.image || '',
      note: exp?.note || '',
    });
    setEditingExpense(exp || null);
    setExpenseFormError('');
    setExpenseFormSuccess('');
  };

  const saveExpense = async () => {
    const { expense_date, category_id, expense_for, amount } = expenseForm;
    if (!expense_date || !category_id || !expense_for.trim() || !amount) {
      setExpenseFormError('Please fill in all required fields'); return;
    }
    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt < 0) { setExpenseFormError('Amount must be a valid number'); return; }
    setExpenseFormLoading(true); setExpenseFormError('');
    try {
      const cat = expenseCategories.find((c) => c.id === category_id);
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
      const res = await apiFetch(url, {
        method: editingExpense ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_date,
          category_id,
          category_name: cat?.name || '',
          expense_for: expense_for.trim(),
          amount: parsedAmt,
          reference_no: expenseForm.reference_no.trim(),
          image: expenseForm.image || '',
          note: expenseForm.note.trim(),
        }),
      });
      if (!res.ok) { setExpenseFormError((await res.json()).error || 'Failed to save expense'); return; }
      const msg = editingExpense ? 'Expense updated successfully!' : 'New expense added successfully!';
      setExpenseFormSuccess(msg);
      setToast({ message: msg, type: 'success' });
      resetExpenseForm();
      fetchData();
    } finally { setExpenseFormLoading(false); }
  };

  const deleteExpense = async (id: string) => {
    await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
    setDeletingExpenseId(null);
    fetchData();
  };

  // ── Category CRUD ──────────────────────────────────────────────────────────

  const resetCategoryForm = (cat?: ExpenseCategory) => {
    setCategoryForm({ name: cat?.name || '', description: cat?.description || '' });
    setEditingCategory(cat || null);
    setCategoryFormError('');
    setCategoryFormSuccess('');
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) { setCategoryFormError('Category Name is required'); return; }
    setCategoryFormLoading(true); setCategoryFormError('');
    try {
      const url = editingCategory ? `/api/expenses/categories/${editingCategory.id}` : '/api/expenses/categories';
      const res = await apiFetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryForm.name.trim(), description: categoryForm.description.trim() }),
      });
      if (!res.ok) { setCategoryFormError((await res.json()).error || 'Failed to save category'); return; }
      const msg = editingCategory ? 'Category updated successfully!' : 'New category added successfully!';
      setCategoryFormSuccess(msg);
      setToast({ message: msg, type: 'success' });
      resetCategoryForm();
      fetchData();
    } finally { setCategoryFormLoading(false); }
  };

  const deleteCategory = async (id: string) => {
    await apiFetch(`/api/expenses/categories/${id}`, { method: 'DELETE' });
    setDeletingCategoryId(null);
    fetchData();
  };

  const toggleCategoryStatus = async (cat: ExpenseCategory) => {
    await apiFetch(`/api/expenses/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: cat.status === 'active' ? 'inactive' : 'active' }),
    });
    fetchData();
  };

  const pageTitle = SUB_NAV.find((n) => n.id === activePage)?.label || 'Expenses';

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-9999 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-semibold ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <CheckCircle size={17} className="shrink-0" /> {toast.message}
        </div>
      )}

      <AppSidebar
        show={showSidebar}
        onClose={() => setShowSidebar(false)}
        expensesSlot={
          <>
            {SUB_NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActivePage(item.id); setShowSidebar(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm text-left ${
                  activePage === item.id
                    ? 'bg-orange-500 text-white font-semibold'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                {item.icon}<span>{item.label}</span>
              </button>
            ))}
            <Link
              to="/expenses-dashboard"
              onClick={() => setShowSidebar(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm text-left hover:bg-slate-800 text-slate-300"
            >
              <TrendingUp size={16} className="shrink-0" /><span>Dashboard</span>
            </Link>
          </>
        }
      />

      {/* ══ Content ══ */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
          <button onClick={() => setShowSidebar(true)} className="md:hidden text-slate-600 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100">
            <MenuIcon size={22} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shrink-0"><Receipt size={20} /></div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Expenses</p>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">{pageTitle}</h2>
            </div>
          </div>
          <p className="ml-auto text-xs text-slate-400 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        <main className="p-4 md:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── NEW EXPENSE ─────────────────────────────────────────── */}
              {activePage === 'new-expense' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800">Expense <span className="text-sm font-normal text-slate-500">Add / Update Expense</span></h3>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    {expenseFormError && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mb-5">
                        <AlertTriangle size={14} className="shrink-0" /> {expenseFormError}
                      </div>
                    )}
                    {expenseFormSuccess && (
                      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100 mb-5">
                        <CheckCircle size={14} className="shrink-0" /> {expenseFormSuccess}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <FormField label="Expense Date *">
                          <input type="date" value={expenseForm.expense_date}
                            onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                        <FormField label="Category *">
                          <select value={expenseForm.category_id}
                            onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white">
                            <option value="">-Select-</option>
                            {expenseCategories.filter((c) => c.status === 'active').map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label="Expense for *">
                          <input type="text" value={expenseForm.expense_for}
                            onChange={(e) => setExpenseForm({ ...expenseForm, expense_for: e.target.value })}
                            placeholder="What is this expense for?"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                        <FormField label="Amount *">
                          <input type="number" min="0" step="0.01" value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            placeholder="0.00"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                      </div>
                      <div className="space-y-4">
                        <FormField label="Reference No.">
                          <input type="text" value={expenseForm.reference_no}
                            onChange={(e) => setExpenseForm({ ...expenseForm, reference_no: e.target.value })}
                            placeholder="e.g. INV-001"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                        <FormField label="Image">
                          <input type="file" accept="image/*"
                            disabled={imageUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setImageUploading(true);
                              setExpenseFormError('');
                              try {
                                const formData = new FormData();
                                formData.append('image', file);
                                const res = await apiFetch('/api/expenses/upload-image', {
                                  method: 'POST',
                                  body: formData,
                                });
                                if (!res.ok) throw new Error('Upload failed');
                                const { url } = await res.json();
                                setExpenseForm(f => ({ ...f, image: url }));
                              } catch {
                                setExpenseFormError('Image upload failed. Please try again.');
                              } finally {
                                setImageUploading(false);
                              }
                            }}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                          {imageUploading && (
                            <p className="text-xs text-cyan-600 mt-1">Uploading image…</p>
                          )}
                          {expenseForm.image && !imageUploading && (
                            <div className="relative mt-2">
                              <img src={expenseForm.image.startsWith('/') ? `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}${expenseForm.image}` : expenseForm.image} alt="Expense" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                              <button type="button" onClick={() => setExpenseForm(f => ({ ...f, image: '' }))}
                                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700">
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </FormField>
                        <FormField label="Note">
                          <textarea value={expenseForm.note}
                            onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
                            placeholder="Additional notes…" rows={4}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none" />
                        </FormField>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-6 justify-center">
                      <button onClick={saveExpense} disabled={expenseFormLoading}
                        className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                        {expenseFormLoading ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => { resetExpenseForm(); setActivePage('expenses-list'); }}
                        className="px-8 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── EXPENSES LIST ───────────────────────────────────────── */}
              {activePage === 'expenses-list' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Expenses List <span className="text-sm font-normal text-slate-500">View / Search Expenses</span></h3>
                    <div className="flex items-center gap-2">
                      <button onClick={downloadPDF} disabled={filteredExpenses.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                        <Download size={15} /> Download PDF
                      </button>
                      <button onClick={() => { resetExpenseForm(); setActivePage('new-expense'); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700">
                        <Plus size={15} /> New Expense
                      </button>
                    </div>
                  </div>

                  {/* ── Search / Filter bar ── */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          value={searchCategory}
                          onChange={(e) => setSearchCategory(e.target.value)}
                          className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white text-slate-700"
                        >
                          <option value="">All Categories</option>
                          {expenseCategories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Reference No."
                          value={searchRefNo}
                          onChange={(e) => setSearchRefNo(e.target.value)}
                          className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                      </div>
                      <div>
                        <input
                          type="date"
                          value={searchDateFrom}
                          onChange={(e) => setSearchDateFrom(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                          title="Date From"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={searchDateTo}
                          onChange={(e) => setSearchDateTo(e.target.value)}
                          className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                          title="Date To"
                        />
                        {(searchCategory || searchRefNo || searchDateFrom || searchDateTo) && (
                          <button
                            onClick={() => { setSearchCategory(''); setSearchRefNo(''); setSearchDateFrom(''); setSearchDateTo(''); }}
                            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
                            title="Clear filters"
                          ><X size={15} /></button>
                        )}
                      </div>
                    </div>
                    {(searchCategory || searchRefNo || searchDateFrom || searchDateTo) && (
                      <p className="text-xs text-slate-500 mt-2">{filteredExpenses.length} of {expenses.length} record{expenses.length !== 1 ? 's' : ''} shown</p>
                    )}
                  </div>

                  {filteredExpenses.length === 0 ? (
                    expenses.length === 0
                      ? <EmptyState icon={<Receipt size={32} />} message="No expenses recorded yet."
                          action="Add First Expense" onAction={() => { resetExpenseForm(); setActivePage('new-expense'); }} />
                      : <EmptyState icon={<Search size={32} />} message="No expenses match your filters." />
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              {['Date', 'Category', 'Reference No.', 'Expense for', 'Amount', 'Image', 'Note', 'Created by', 'Actions'].map((h) => (
                                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {filteredExpenses.map((e) => (
                              <tr key={e.id} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{e.expense_date}</td>
                                <td className="px-4 py-3.5 font-semibold text-slate-800">{e.category_name || '—'}</td>
                                <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{e.reference_no || '—'}</td>
                                <td className="px-4 py-3.5 text-slate-700">{e.expense_for}</td>
                                <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3.5">
                                  {e.image
                                    ? (() => {
                                        const src = e.image.startsWith('/') ? `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}${e.image}` : e.image;
                                        return <img src={src} alt="expense" className="w-12 h-10 object-cover rounded-lg border border-slate-200 cursor-pointer" onClick={() => window.open(src, '_blank')} />;
                                      })()
                                    : <span className="text-slate-400">—</span>}
                                </td>
                                <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">{e.note || '—'}</td>
                                <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{e.created_by || '—'}</td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => { resetExpenseForm(e); setActivePage('new-expense'); }} title="Edit"
                                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"><Edit2 size={15} /></button>
                                    <button onClick={() => setDeletingExpenseId(e.id)} title="Delete"
                                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 border-t border-slate-200">
                            <tr>
                              <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Total</td>
                              <td className="px-4 py-3 font-bold text-slate-800">
                                {filteredExpenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td colSpan={4} />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── NEW CATEGORY ────────────────────────────────────────── */}
              {activePage === 'new-category' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800">Expense Category <span className="text-sm font-normal text-slate-500">Add / Update Category</span></h3>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-lg">
                    {categoryFormError && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mb-5">
                        <AlertTriangle size={14} className="shrink-0" /> {categoryFormError}
                      </div>
                    )}
                    {categoryFormSuccess && (
                      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100 mb-5">
                        <CheckCircle size={14} className="shrink-0" /> {categoryFormSuccess}
                      </div>
                    )}
                    <div className="space-y-4">
                      <FormField label="Category Name *">
                        <input type="text" value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          placeholder="e.g. Utilities, Salaries…"
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                      </FormField>
                      <FormField label="Description">
                        <textarea value={categoryForm.description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                          placeholder="Optional description" rows={3}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none" />
                      </FormField>
                    </div>
                    <div className="flex gap-3 pt-6 justify-center">
                      <button onClick={saveCategory} disabled={categoryFormLoading}
                        className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                        {categoryFormLoading ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => { resetCategoryForm(); setActivePage('categories-list'); }}
                        className="px-8 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CATEGORIES LIST ─────────────────────────────────────── */}
              {activePage === 'categories-list' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Expense Category List</h3>
                    <button onClick={() => { resetCategoryForm(); setActivePage('new-category'); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700">
                      <Plus size={15} /> New Category
                    </button>
                  </div>
                  {expenseCategories.length === 0 ? (
                    <EmptyState icon={<Tag size={32} />} message="No expense categories yet."
                      action="Add First Category" onAction={() => { resetCategoryForm(); setActivePage('new-category'); }} />
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            {['Category Name', 'Description', 'Status', 'Action'].map((h) => (
                              <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {expenseCategories.map((cat) => (
                            <tr key={cat.id} className="hover:bg-slate-50/70">
                              <td className="px-5 py-3.5 font-semibold text-slate-800">{cat.name}</td>
                              <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">{cat.description || '—'}</td>
                              <td className="px-5 py-3.5">
                                <button onClick={() => toggleCategoryStatus(cat)}
                                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cat.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                  {cat.status === 'active' ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => { resetCategoryForm(cat); setActivePage('new-category'); }} title="Edit"
                                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"><Edit2 size={15} /></button>
                                  <button onClick={() => setDeletingCategoryId(cat.id)} title="Delete"
                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ══ Modals ══ */}
      {deletingExpenseId && (
        <Modal title="Delete Expense" onClose={() => setDeletingExpenseId(null)}>
          <p className="text-slate-600 text-sm mb-5">Permanently delete this expense?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingExpenseId(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
            <button onClick={() => deleteExpense(deletingExpenseId)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Delete</button>
          </div>
        </Modal>
      )}
      {deletingCategoryId && (
        <Modal title="Delete Category" onClose={() => setDeletingCategoryId(null)}>
          <p className="text-slate-600 text-sm mb-5">Permanently delete this category?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingCategoryId(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
            <button onClick={() => deleteCategory(deletingCategoryId)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ icon, message, action, onAction }: { icon: React.ReactNode; message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
      <div className="text-slate-300 flex justify-center mb-3">{icon}</div>
      <p className="text-slate-500 font-medium mb-4">{message}</p>
      {action && onAction && (
        <button onClick={onAction} className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700">
          {action}
        </button>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
