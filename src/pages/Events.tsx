import React, { useEffect, useState, useRef } from 'react';
import { useStore, Category, Product } from '../store';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Plus, Trash2, Edit2, X, Calendar, Clock, Users, Phone, User,
  CheckCircle, AlertTriangle, Printer, ChevronDown, Menu as MenuIcon,
  CalendarDays, FileText, DollarSign, CreditCard, Banknote, Check, Ban,
  ShoppingCart, BedDouble
} from 'lucide-react';
import AppSidebar from '../components/AppSidebar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface EventFunction {
  id: string;
  name: string;
  type: 'place' | 'menu';
  price?: number;
  items: EventItem[];
  created_at: string;
  updated_at: string;
}

interface EventBooking {
  id: string;
  customer_name: string;
  customer_phone: string;
  event_date: string;
  event_time: string;
  pax: number;
  event_name?: string;
  event_place_id?: string;
  event_place_name?: string;
  event_place_price?: number;
  menu_price_per_person?: number;
  function_id: string;
  function_name: string;
  items: EventItem[];
  subtotal: number;
  service_charge?: number;
  total: number;
  advance_payment: number;
  balance: number;
  payment_method: string;
  payment_status: 'pending' | 'advance' | 'full';
  status: 'upcoming' | 'completed' | 'void';
  notes: string;
  created_at: string;
  updated_at: string;
}

// ─── PDF Print Helper ─────────────────────────────────────────────────────────

function printBookingPDF(booking: EventBooking) {
  const win = window.open('', '_blank', 'width=800,height=700');
  if (!win) return;

  const _now = new Date();
  const _pad = (n: number) => String(n).padStart(2, '0');
  const _hh = _now.getHours(); const _ampm = _hh >= 12 ? 'PM' : 'AM'; const _h12 = _hh % 12 || 12;
  const genTime = `${_pad(_now.getDate())}/${_pad(_now.getMonth()+1)}/${_now.getFullYear()} ${_pad(_h12)}.${_pad(_now.getMinutes())} ${_ampm}`;

  const itemRows = booking.items
    .map(
      (it, idx) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${idx+1}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">${it.name}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${it.price.toFixed(2)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${(it.price * it.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const paymentBadge =
    booking.payment_status === 'full'
      ? '<span style="color:#16a34a;font-weight:600;">FULLY PAID</span>'
      : booking.payment_status === 'advance'
      ? '<span style="color:#d97706;font-weight:600;">ADVANCE PAID</span>'
      : '<span style="color:#dc2626;font-weight:600;">PENDING</span>';

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Event Booking - ${booking.customer_name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 32px; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #0891b2; padding-bottom: 16px; }
    .biz-name { font-size: 22px; font-weight: 700; color: #0f172a; }
    .biz-info { font-size: 11px; color: #475569; margin-top: 3px; }
    .report-title { font-size: 16px; font-weight: 700; color: #0891b2; margin-top: 10px; }
    .sub { font-size: 11px; color: #64748b; margin-top: 4px; }
    .section { margin-bottom: 18px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field label { font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px; }
    .field span { font-size: 13px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f8fafc; }
    thead th { padding: 8px; text-align: left; font-size: 11px; color: #64748b; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    thead th:last-child, thead th:nth-child(3), thead th:nth-child(2) { text-align: right; }
    thead th:nth-child(2) { text-align: center; }
    .totals { margin-top: 12px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .total-row.grand { font-size: 15px; font-weight: 700; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 4px; }
    .total-row.balance { color: #dc2626; }
    .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="biz-name">The Tranquil</div>
    <div class="biz-info">No.194 / 1, Makola South, Makola, Sri Lanka</div>
    <div class="biz-info">+94 11 2 965 888 / +94 77 5 072 909</div>
    <div class="report-title">Event Booking Confirmation</div>
    <div class="sub">Generated: ${genTime}</div>
  </div>

  <div class="section">
    <div class="section-title">Customer Information</div>
    <div class="grid2">
      <div class="field"><label>Customer Name</label><span>${booking.customer_name}</span></div>
      <div class="field"><label>Phone Number</label><span>${booking.customer_phone || '—'}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Event Details</div>
    <div class="grid2">
      ${booking.event_name ? `<div class="field"><label>Event Name</label><span>${booking.event_name}</span></div>` : ''}
      ${booking.event_place_name ? `<div class="field"><label>Event Place</label><span>${booking.event_place_name}</span></div>` : ''}
      ${booking.function_name ? `<div class="field"><label>Function Menu</label><span>${booking.function_name}</span></div>` : ''}
      <div class="field"><label>PAX (Guests)</label><span>${booking.pax}</span></div>
      <div class="field"><label>Event Date</label><span>${booking.event_date}</span></div>
      <div class="field"><label>Event Time</label><span>${booking.event_time}</span></div>
    </div>
    ${booking.notes ? `<div class="field" style="margin-top:8px;"><label>Notes</label><span>${booking.notes}</span></div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Items</div>
    ${booking.items.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th style="text-align:center;width:36px;">#</th>
          <th>Item</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>` : ''}
    <div class="totals">
      ${(booking.event_place_price ?? 0) > 0 ? `<div class="total-row"><span>Event Place</span><span>LKR ${(booking.event_place_price ?? 0).toFixed(2)}</span></div>` : ''}
      ${booking.items.length > 0 ? `<div class="total-row"><span>Menu Subtotal</span><span>LKR ${(booking.subtotal - (booking.event_place_price ?? 0)).toFixed(2)}</span></div>` : ''}
      ${(booking.service_charge ?? 0) > 0 ? `<div class="total-row"><span>Service Charge (10%)</span><span>LKR ${(booking.service_charge ?? 0).toFixed(2)}</span></div>` : ''}
      <div class="total-row grand"><span>Total</span><span>LKR ${booking.total.toFixed(2)}</span></div>
      <div class="total-row" style="color:#0f172a;margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0;">
        <span>Payment Status</span><span>${paymentBadge}</span>
      </div>
      ${booking.payment_status !== 'full' ? `
      <div class="total-row"><span>Advance Payment</span><span>${booking.advance_payment.toFixed(2)}</span></div>
      <div class="total-row balance"><span>Balance Due</span><span>${booking.balance.toFixed(2)}</span></div>
      ` : ''}
      <div class="total-row"><span>Payment Method</span><span style="text-transform:capitalize;">${(booking.payment_method || '—').replace('_', ' ')}</span></div>
    </div>
  </div>

  <div class="footer">Digital Solutions by Click Inmo Pvt Ltd.<br><a href="https://clickinmo.com" target="_blank" style="color:#0891b2;text-decoration:underline;">https://clickinmo.com</a></div>
</body>
</html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Events() {
  const { user, logout, apiFetch, categories, products, fetchCategories, fetchProducts } = useStore();
  const navigate = useNavigate();

  // Sidebar
  const [showSidebar, setShowSidebar] = useState(false);

  // Data
  const [functions, setFunctions] = useState<EventFunction[]>([]);
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab: bookings | functions
  const [activeTab, setActiveTab] = useState<'bookings' | 'functions'>('bookings');

  // Booking filter
  const [statusFilter, setStatusFilter] = useState<'upcoming' | 'completed' | 'void'>('upcoming');

  // Modals
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<EventBooking | null>(null);
  const [showFunctionForm, setShowFunctionForm] = useState(false);
  const [showFunctionMenuForm, setShowFunctionMenuForm] = useState(false);
  const [editingFunction, setEditingFunction] = useState<EventFunction | null>(null);

  // Password confirm for void/delete
  const [voidBookingId, setVoidBookingId] = useState<string | null>(null);
  const [voidPassword, setVoidPassword] = useState('');
  const [voidError, setVoidError] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  const [deleteBookingId, setDeleteBookingId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [deleteFnId, setDeleteFnId] = useState<string | null>(null);

  // Pay balance modal
  const [payBalanceBooking, setPayBalanceBooking] = useState<EventBooking | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'online_banking' | 'check'>('cash');
  const [payLoading, setPayLoading] = useState(false);

  // View PDF modal
  const [viewingBooking, setViewingBooking] = useState<EventBooking | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [fnRes, bkRes] = await Promise.all([
        apiFetch('/api/events/functions'),
        apiFetch('/api/events/bookings'),
      ]);
      if (fnRes.ok) setFunctions(await fnRes.json());
      if (bkRes.ok) {
        const fetchedBookings: EventBooking[] = await bkRes.json();
        // Auto-complete bookings where event date has already passed
        const today = new Date().toISOString().split('T')[0];
        const toComplete = fetchedBookings.filter(
          (b) => b.status === 'upcoming' && b.event_date < today
        );
        if (toComplete.length > 0) {
          await Promise.all(
            toComplete.map((b) =>
              apiFetch(`/api/events/bookings/${b.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' }),
              })
            )
          );
          const refreshed = await apiFetch('/api/events/bookings');
          if (refreshed.ok) setBookings(await refreshed.json());
        } else {
          setBookings(fetchedBookings);
        }
      }
    } catch (e) {
      console.error('Events fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchCategories();
    fetchProducts();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const filteredBookings = bookings.filter((b) => b.status === statusFilter);

  const formatDate = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const statusColor = (s: string) => {
    if (s === 'upcoming') return 'bg-blue-100 text-blue-700';
    if (s === 'completed') return 'bg-green-100 text-green-700';
    if (s === 'void') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
  };

  const payStatusColor = (s: string) => {
    if (s === 'full') return 'bg-green-100 text-green-700';
    if (s === 'advance') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  // ── Void booking ─────────────────────────────────────────────────────────────

  const confirmVoid = async () => {
    if (voidPassword !== '7788') { setVoidError('Incorrect password.'); return; }
    if (!voidBookingId) return;
    setVoidLoading(true);
    try {
      await apiFetch(`/api/events/bookings/${voidBookingId}/void`, { method: 'POST' });
      await fetchAll();
      setVoidBookingId(null); setVoidPassword('');
    } catch { setVoidError('Failed to void booking.'); }
    finally { setVoidLoading(false); }
  };

  // ── Delete booking ───────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (deletePassword !== 'unique') { setDeleteError('Incorrect password.'); return; }
    if (!deleteBookingId) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/api/events/bookings/${deleteBookingId}`, { method: 'DELETE' });
      await fetchAll();
      setDeleteBookingId(null); setDeletePassword('');
    } catch { setDeleteError('Failed to delete booking.'); }
    finally { setDeleteLoading(false); }
  };

  // ── Pay balance ──────────────────────────────────────────────────────────────

  const confirmPay = async () => {
    if (!payBalanceBooking) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) return;
    setPayLoading(true);
    try {
      const newAdvance = payBalanceBooking.advance_payment + amount;
      const newBalance = Math.max(0, payBalanceBooking.total - newAdvance);
      const newStatus: EventBooking['payment_status'] = newBalance <= 0 ? 'full' : 'advance';
      await apiFetch(`/api/events/bookings/${payBalanceBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advance_payment: newAdvance,
          balance: newBalance,
          payment_status: newStatus,
          payment_method: payMethod,
        }),
      });
      await fetchAll();
      setPayBalanceBooking(null); setPayAmount('');
    } catch (e) { console.error(e); }
    finally { setPayLoading(false); }
  };

  // ── Delete function ──────────────────────────────────────────────────────────

  const handleDeleteFunction = async (id: string) => {
    if (!window.confirm('Delete this event function? This cannot be undone.')) return;
    await apiFetch(`/api/events/functions/${id}`, { method: 'DELETE' });
    await fetchAll();
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <AppSidebar show={showSidebar} onClose={() => setShowSidebar(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Sticky header ── */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-sm shrink-0">
          <button
            onClick={() => setShowSidebar(true)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <MenuIcon className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 text-violet-600 rounded-xl shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Event Management System</p>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">Event Management</h2>
            </div>
          </div>
          <p className="ml-auto text-xs text-slate-400 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        {/* ── Tabs & Actions ── */}
        <div className="px-4 pt-4 pb-0 flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'bookings' ? 'bg-violet-500 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Bookings
            </button>
            <button
              onClick={() => setActiveTab('functions')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'functions' ? 'bg-violet-500 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Event Functions
            </button>
          </div>
          <div className="ml-auto">
            {activeTab === 'bookings' ? (
              <button
                onClick={() => { setEditingBooking(null); setShowBookingForm(true); }}
                className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow transition-colors"
              >
                <Plus className="w-4 h-4" /> New Booking
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditingFunction(null); setShowFunctionForm(true); }}
                  className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Event Place
                </button>
                <button
                  onClick={() => { setEditingFunction(null); setShowFunctionMenuForm(true); }}
                  className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Function Menu
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-60 text-slate-400">Loading...</div>
        ) : activeTab === 'bookings' ? (
          <BookingsTab
            bookings={filteredBookings}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            formatDate={formatDate}
            statusColor={statusColor}
            payStatusColor={payStatusColor}
            onEdit={(b) => { setEditingBooking(b); setShowBookingForm(true); }}
            onVoid={(id) => { setVoidBookingId(id); setVoidPassword(''); setVoidError(''); }}
            onDelete={(id) => { setDeleteBookingId(id); setDeletePassword(''); setDeleteError(''); }}
            onPrint={printBookingPDF}
            onView={(b) => setViewingBooking(b)}
            onPayBalance={(b) => { setPayBalanceBooking(b); setPayAmount(String(b.balance)); setPayMethod('cash'); }}
          />
        ) : (
          <FunctionsTab
            functions={functions}
            onEdit={(fn) => {
              if (fn.type === 'menu') {
                setEditingFunction(fn); setShowFunctionMenuForm(true);
              } else {
                setEditingFunction(fn); setShowFunctionForm(true);
              }
            }}
            onDelete={(id) => handleDeleteFunction(id)}
          />
        )}
      </main>

      {/* ── Booking Form Modal ── */}
      {showBookingForm && (
        <BookingFormModal
          booking={editingBooking}
          functions={functions}
          apiFetch={apiFetch}
          onClose={() => setShowBookingForm(false)}
          onSaved={(saved) => {
            setBookings((prev) => {
              const exists = prev.find(b => b.id === saved.id);
              return exists
                ? prev.map(b => b.id === saved.id ? saved : b)
                : [saved, ...prev];
            });
            setShowBookingForm(false);
          }}
        />
      )}

      {/* ── Function Form Modal ── */}
      {showFunctionForm && (
        <FunctionFormModal
          fn={editingFunction}
          fnType="place"
          apiFetch={apiFetch}
          onClose={() => setShowFunctionForm(false)}
          onSaved={() => { fetchAll(); setShowFunctionForm(false); }}
        />
      )}

      {showFunctionMenuForm && (
        <FunctionFormModal
          fn={editingFunction}
          fnType="menu"
          apiFetch={apiFetch}
          onClose={() => setShowFunctionMenuForm(false)}
          onSaved={() => { fetchAll(); setShowFunctionMenuForm(false); }}
        />
      )}

      {/* ── Void Password Modal ── */}
      {voidBookingId && (
        <PasswordModal
          title="Void Booking"
          description="Enter manager password to void this booking."
          password={voidPassword}
          setPassword={setVoidPassword}
          error={voidError}
          loading={voidLoading}
          onConfirm={confirmVoid}
          onCancel={() => setVoidBookingId(null)}
          confirmLabel="Void Booking"
          confirmClass="bg-red-500 hover:bg-red-600 text-white"
        />
      )}

      {/* ── Delete Password Modal ── */}
      {deleteBookingId && (
        <PasswordModal
          title="Delete Booking"
          description="Enter admin password to permanently delete this booking."
          password={deletePassword}
          setPassword={setDeletePassword}
          error={deleteError}
          loading={deleteLoading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteBookingId(null)}
          confirmLabel="Delete"
          confirmClass="bg-red-600 hover:bg-red-700 text-white"
        />
      )}

      {/* ── Pay Balance Modal ── */}
      {payBalanceBooking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-1">Pay Balance</h3>
            <p className="text-sm text-slate-500 mb-4">
              Balance: <span className="font-bold text-red-600">{payBalanceBooking.balance.toFixed(2)}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="online_banking">Online Banking</option>
                  <option value="check">Check</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setPayBalanceBooking(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button
                onClick={confirmPay}
                disabled={payLoading}
                className="flex-1 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {payLoading ? 'Saving...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking View / PDF Modal ── */}
      {viewingBooking && (
        <BookingViewModal
          booking={viewingBooking}
          statusColor={statusColor}
          payStatusColor={payStatusColor}
          formatDate={formatDate}
          onClose={() => setViewingBooking(null)}
          onPrint={() => printBookingPDF(viewingBooking)}
          onVoid={(id) => { setViewingBooking(null); setVoidBookingId(id); setVoidPassword(''); setVoidError(''); }}
          onDelete={(id) => { setViewingBooking(null); setDeleteBookingId(id); setDeletePassword(''); setDeleteError(''); }}
        />
      )}
      </div>
    </div>
  );
}

// ─── Booking View Modal ───────────────────────────────────────────────────────

function BookingViewModal({
  booking, statusColor, payStatusColor, formatDate, onClose, onPrint, onVoid, onDelete,
}: {
  booking: EventBooking;
  statusColor: (s: string) => string;
  payStatusColor: (s: string) => string;
  formatDate: (d: string) => string;
  onClose: () => void;
  onPrint: () => void;
  onVoid: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white px-6 py-5 rounded-t-2xl flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold">Booking Details</h2>
            <p className="text-violet-200 text-sm mt-0.5">ID: {booking.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-slate-400 uppercase tracking-wide">Customer</p><p className="font-semibold text-slate-800 mt-0.5">{booking.customer_name}</p></div>
            <div><p className="text-xs text-slate-400 uppercase tracking-wide">Phone</p><p className="font-semibold text-slate-800 mt-0.5">{booking.customer_phone || '—'}</p></div>
            <div><p className="text-xs text-slate-400 uppercase tracking-wide">Event Date</p><p className="font-semibold text-slate-800 mt-0.5">{formatDate(booking.event_date)}</p></div>
            <div><p className="text-xs text-slate-400 uppercase tracking-wide">Event Time</p><p className="font-semibold text-slate-800 mt-0.5">{booking.event_time}</p></div>
            <div><p className="text-xs text-slate-400 uppercase tracking-wide">PAX</p><p className="font-semibold text-slate-800 mt-0.5">{booking.pax} persons</p></div>
            {booking.event_name && <div className="col-span-2"><p className="text-xs text-slate-400 uppercase tracking-wide">Event Name</p><p className="font-semibold text-slate-800 mt-0.5">{booking.event_name}</p></div>}
            {booking.event_place_name && <div><p className="text-xs text-slate-400 uppercase tracking-wide">Event Place</p><p className="font-semibold text-slate-800 mt-0.5">{booking.event_place_name}</p></div>}
            {booking.function_name && <div><p className="text-xs text-slate-400 uppercase tracking-wide">Function Menu</p><p className="font-semibold text-slate-800 mt-0.5">{booking.function_name}</p></div>}
            <div><p className="text-xs text-slate-400 uppercase tracking-wide">Status</p>
              <p className="mt-0.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(booking.status)}`}>{booking.status}</span></p>
            </div>
            <div><p className="text-xs text-slate-400 uppercase tracking-wide">Payment</p>
              <p className="mt-0.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${payStatusColor(booking.payment_status)}`}>{booking.payment_status === 'full' ? 'Fully Paid' : booking.payment_status === 'advance' ? 'Advance' : 'Pending'}</span></p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-2 pb-1 border-b border-slate-200">Items</h3>
            <table className="w-full text-sm">
              <thead><tr className="bg-violet-50"><th className="px-3 py-2 text-left text-xs font-semibold text-violet-700">Item</th><th className="px-3 py-2 text-center text-xs font-semibold text-violet-700">Qty</th><th className="px-3 py-2 text-right text-xs font-semibold text-violet-700">Price</th><th className="px-3 py-2 text-right text-xs font-semibold text-violet-700">Total</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {booking.items.map((it, i) => (
                  <tr key={i}><td className="px-3 py-2 text-slate-700">{it.name}</td><td className="px-3 py-2 text-center text-slate-600">{it.quantity}</td><td className="px-3 py-2 text-right text-slate-600">LKR {it.price.toFixed(2)}</td><td className="px-3 py-2 text-right font-medium text-slate-800">LKR {(it.price * it.quantity).toFixed(2)}</td></tr>
                ))}
                {booking.items.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400 text-xs">No items</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            {(booking.event_place_price ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Event Place</span>
                <span className="font-medium">LKR {(booking.event_place_price ?? 0).toFixed(2)}</span>
              </div>
            )}
            {booking.subtotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Menu Subtotal</span>
                <span className="font-medium">LKR {(booking.subtotal - (booking.event_place_price ?? 0)).toFixed(2)}</span>
              </div>
            )}
            {(booking.service_charge ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Service Charge (10%)</span>
                <span className="font-medium">LKR {(booking.service_charge ?? 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t pt-2 border-slate-200">
              <span className="text-slate-700">Total</span>
              <span className="text-slate-800">LKR {booking.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Advance Paid</span><span className="font-medium text-emerald-600">LKR {(booking.advance_payment || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-sm font-bold border-t pt-2 border-slate-200">
              <span className="text-violet-700">Balance Due</span><span className="text-violet-700">LKR {(booking.balance || 0).toFixed(2)}</span>
            </div>
            <div className="text-xs text-slate-400 pt-1">
              Payment Method: <span className="capitalize">{(booking.payment_method || '—').replace('_', ' ')}</span>
            </div>
          </div>

          {booking.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
              <p className="text-sm text-amber-800">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 px-6 py-4 rounded-b-2xl bg-slate-50 shrink-0 flex flex-wrap gap-2">
          <button onClick={onPrint} className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium text-sm transition-colors">
            <Printer className="w-4 h-4" /> Print PDF
          </button>
          {booking.status === 'upcoming' && (
            <button onClick={() => onVoid(booking.id)} className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium text-sm border border-red-200 transition-colors">
              <Ban className="w-4 h-4" /> Void
            </button>
          )}
          {(booking.status === 'void' || booking.status === 'completed') && (
            <button onClick={() => onDelete(booking.id)} className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium text-sm border border-red-200 transition-colors">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
          <button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl font-medium text-sm border border-slate-200 transition-colors ml-auto">
            <X className="w-4 h-4" /> Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bookings Tab ─────────────────────────────────────────────────────────────

function BookingsTab({
  bookings, statusFilter, setStatusFilter,
  formatDate, statusColor, payStatusColor,
  onEdit, onVoid, onDelete, onPrint, onView, onPayBalance,
}: {
  bookings: EventBooking[];
  statusFilter: 'upcoming' | 'completed' | 'void';
  setStatusFilter: (s: 'upcoming' | 'completed' | 'void') => void;
  formatDate: (d: string) => string;
  statusColor: (s: string) => string;
  payStatusColor: (s: string) => string;
  onEdit: (b: EventBooking) => void;
  onVoid: (id: string) => void;
  onDelete: (id: string) => void;
  onPrint: (b: EventBooking) => void;
  onView: (b: EventBooking) => void;
  onPayBalance: (b: EventBooking) => void;
}) {
  return (
    <div>
      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['upcoming', 'completed', 'void'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${statusFilter === s ? 'bg-violet-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          No {statusFilter} bookings found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between p-4 pb-3">
                <div>
                  <div className="font-bold text-slate-800 text-base">{b.customer_name}</div>
                  {b.customer_phone && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Phone className="w-3 h-3" /> {b.customer_phone}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(b.status)}`}>
                    {b.status}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${payStatusColor(b.payment_status)}`}>
                    {b.payment_status === 'full' ? 'Fully Paid' : b.payment_status === 'advance' ? 'Advance' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="px-4 pb-3 grid grid-cols-2 gap-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-violet-400" /> {formatDate(b.event_date)}</div>
                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-violet-400" /> {b.event_time}</div>
                <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-violet-400" /> {b.pax} Pax</div>
                {(b.event_name || b.event_place_name) && <div className="flex items-center gap-1.5 col-span-2 truncate"><CalendarDays className="w-3.5 h-3.5 text-violet-400 shrink-0" /> <span className="truncate">{b.event_name || b.event_place_name}</span></div>}
              </div>

              {/* Financials */}
              <div className="mx-4 mb-3 bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-bold">{b.total.toFixed(2)}</span></div>
                {b.payment_status !== 'full' && (
                  <>
                    <div className="flex justify-between"><span className="text-slate-500">Advance</span><span className="text-green-600 font-semibold">{b.advance_payment.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Balance</span><span className="text-red-600 font-bold">{b.balance.toFixed(2)}</span></div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 p-3 flex flex-wrap gap-1.5 mt-auto">
                <button onClick={() => onView(b)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 text-xs font-semibold transition-colors">
                  <FileText className="w-3.5 h-3.5" /> View
                </button>
                <button onClick={() => onPrint(b)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                {b.status === 'upcoming' && (
                  <>
                    <button onClick={() => onEdit(b)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-colors">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    {b.payment_status !== 'full' && (
                      <button onClick={() => onPayBalance(b)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 text-xs font-semibold transition-colors">
                        <DollarSign className="w-3.5 h-3.5" /> Pay
                      </button>
                    )}
                    <button onClick={() => onVoid(b.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold transition-colors">
                      <Ban className="w-3.5 h-3.5" /> Void
                    </button>
                  </>
                )}
                {(b.status === 'void' || b.status === 'completed') && (
                  <button onClick={() => onDelete(b.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Functions Tab ────────────────────────────────────────────────────────────

function FunctionsTab({
  functions, onEdit, onDelete,
}: {
  functions: EventFunction[];
  onEdit: (fn: EventFunction) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      {functions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          No event functions yet. Create one to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {functions.map((fn) => (
            <div key={fn.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between p-4 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{fn.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${fn.type === 'menu' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}`}>
                    {fn.type === 'menu' ? 'Function Menu' : 'Event Place'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(fn)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(fn.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="px-4 pb-4">
                {fn.type === 'place' ? (
                  <p className="text-xs text-slate-600 font-semibold">Price: LKR {fn.price?.toFixed(2) ?? '0.00'}</p>
                ) : fn.items.length === 0 ? (
                  <p className="text-xs text-slate-400">No items added.</p>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-indigo-700 mb-2">
                      Price/person: LKR {fn.price?.toFixed(2) ?? '0.00'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {fn.items.map((it) => (
                        <span key={it.id} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{it.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Booking Form Modal ───────────────────────────────────────────────────────

function BookingFormModal({
  booking, functions, apiFetch, onClose, onSaved,
}: {
  booking: EventBooking | null;
  functions: EventFunction[];
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onSaved: (saved: EventBooking) => void;
}) {
  const isEdit = !!booking;

  const [customerName, setCustomerName] = useState(booking?.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(booking?.customer_phone || '');
  const [eventDate, setEventDate] = useState(booking?.event_date || '');
  const [eventTime, setEventTime] = useState(booking?.event_time || '');
  const [pax, setPax] = useState(String(booking?.pax || 1));
  const [eventName, setEventName] = useState(booking?.event_name || '');
  const [selectedPlaceId, setSelectedPlaceId] = useState(booking?.event_place_id || '');
  const [selectedPlaceName, setSelectedPlaceName] = useState(booking?.event_place_name || '');
  const [selectedPlacePrice, setSelectedPlacePrice] = useState(booking?.event_place_price ?? 0);
  const [selectedMenuId, setSelectedMenuId] = useState(booking?.function_id || '');
  const [selectedMenuName, setSelectedMenuName] = useState(booking?.function_name || '');
  const [menuPrice, setMenuPrice] = useState<number>(
    booking?.menu_price_per_person ?? functions.find((f) => f.id === booking?.function_id)?.price ?? 0
  );
  const [items, setItems] = useState<EventItem[]>(booking?.items || []);
  const [paymentType, setPaymentType] = useState<'full' | 'advance'>(
    booking ? (booking.payment_status === 'full' ? 'full' : 'advance') : 'full'
  );
  const [advanceAmount, setAdvanceAmount] = useState(String(booking?.advance_payment || ''));
  const [paymentMethod, setPaymentMethod] = useState(booking?.payment_method || 'cash');
  const [notes, setNotes] = useState(booking?.notes || '');
  const [conflict, setConflict] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const paxNum = parseInt(pax) || 1;
  const menuSubtotal = selectedMenuId ? (menuPrice * paxNum) : 0;
  const menuServiceCharge = menuSubtotal * 0.1;
  const subtotal = selectedPlacePrice + menuSubtotal;
  const serviceCharge = menuServiceCharge;
  const total = subtotal + serviceCharge;
  const advance = paymentType === 'full' ? total : parseFloat(advanceAmount) || 0;
  const balance = Math.max(0, total - advance);

  // Handle event place selection
  const handlePlaceChange = (id: string) => {
    setSelectedPlaceId(id);
    const place = functions.find((f) => f.id === id);
    setSelectedPlaceName(place?.name || '');
    setSelectedPlacePrice(place?.price ?? 0);
  };

  // Handle function menu selection — store price and item names
  const handleMenuChange = (id: string) => {
    setSelectedMenuId(id);
    if (!id) { setSelectedMenuName(''); setMenuPrice(0); setItems([]); return; }
    const menu = functions.find((f) => f.id === id);
    if (menu) {
      setSelectedMenuName(menu.name);
      setMenuPrice(menu.price ?? 0);
      setItems(menu.items);
    }
  };

  // When pax changes nothing extra needed — paxNum is derived from `pax` state directly

  // Check date/time conflict
  useEffect(() => {
    if (!eventDate || !eventTime) return;
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ date: eventDate, time: eventTime });
        if (booking?.id) params.set('excludeId', booking.id);
        const res = await apiFetch(`/api/events/bookings/check-conflict?${params}`);
        if (res.ok) {
          const data = await res.json();
          setConflict(data.conflict);
          setConflictDetails(data.conflicts || []);
        }
      } catch { /* ignore */ }
    }, 500);
    return () => clearTimeout(timeout);
  }, [eventDate, eventTime]);

  const handleSave = async () => {
    if (!customerName.trim()) { setError('Customer name is required.'); return; }
    if (!eventDate) { setError('Event date is required.'); return; }
    if (!eventTime) { setError('Event time is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        event_date: eventDate,
        event_time: eventTime,
        pax: parseInt(pax) || 1,
        event_name: eventName.trim(),
        event_place_id: selectedPlaceId,
        event_place_name: selectedPlaceName,
        event_place_price: selectedPlacePrice,
        function_id: selectedMenuId,
        function_name: selectedMenuName,
        menu_price_per_person: menuPrice,
        items,
        subtotal,
        service_charge: serviceCharge,
        total,
        advance_payment: paymentType === 'full' ? total : advance,
        balance: paymentType === 'full' ? 0 : balance,
        payment_method: paymentMethod,
        payment_status: paymentType === 'full' ? 'full' : (advance > 0 ? 'advance' : 'pending'),
        notes,
      };
      let res: Response;
      if (isEdit) {
        res = await apiFetch(`/api/events/bookings/${booking!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch('/api/events/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as any).error || `Server error ${res.status}`);
      }
      const saved: EventBooking = await res.json();
      onSaved(saved);
    } catch (e: any) {
      setError(e.message || 'Failed to save booking. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-lg text-slate-800">{isEdit ? 'Edit Booking' : 'New Event Booking'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 custom-scrollbar p-5 space-y-5">
          {/* Conflict warning */}
          {conflict && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Date/Time Conflict</p>
                <p className="text-xs mt-0.5">
                  {conflictDetails.map((c) => c.customer_name).join(', ')} already booked on this date & time.
                </p>
              </div>
            </div>
          )}

          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Customer Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            </div>
          </div>

          {/* Date / Time / Pax */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Event Date *</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${conflict ? 'border-amber-400' : 'border-slate-200'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Event Time *</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${conflict ? 'border-amber-400' : 'border-slate-200'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">PAX (Guests)</label>
              <input
                type="number"
                min="1"
                value={pax}
                onChange={(e) => setPax(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>

          {/* Event Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Event Name</label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Wedding Reception, Birthday Party..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Event Place */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Event Place</label>
            <select
              value={selectedPlaceId}
              onChange={(e) => handlePlaceChange(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">— Select a place —</option>
              {functions.filter((f) => f.type === 'place').map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}{f.price ? ` — LKR ${f.price.toFixed(2)}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Function Menu */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Function Menu</label>
            <select
              value={selectedMenuId}
              onChange={(e) => handleMenuChange(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">— Select a menu —</option>
              {functions.filter((f) => f.type === 'menu').map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Price Summary */}
          {(selectedPlaceId || selectedMenuId) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Price Summary</p>
              {selectedPlaceId && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Event Place — <span className="font-medium text-slate-700">{selectedPlaceName}</span></span>
                  <span className="font-semibold text-slate-800">LKR {selectedPlacePrice.toFixed(2)}</span>
                </div>
              )}
          {selectedMenuId && (
            <>
              <div className="flex justify-between">
                <div>
                  <span className="text-slate-600">Function Menu — <span className="font-medium text-slate-700">{selectedMenuName}</span></span>
                  <div className="text-xs text-slate-500 mt-0.5">{menuPrice.toFixed(2)} × {paxNum} pax</div>
                  {items.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {items.map((it) => (
                        <span key={it.id} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">{it.name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="font-semibold text-slate-800 shrink-0 ml-3">LKR {menuSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Service Charge (10%)</span>
                <span>LKR {menuServiceCharge.toFixed(2)}</span>
              </div>
            </>
          )}
              <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-slate-200 text-base">
                <span>Total</span>
                <span className="text-violet-700">LKR {total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Payment */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Payment</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setPaymentType('full')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${paymentType === 'full' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <CheckCircle className="w-4 h-4" /> Full Payment
              </button>
              <button
                onClick={() => setPaymentType('advance')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${paymentType === 'advance' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <DollarSign className="w-4 h-4" /> Advance
              </button>
            </div>

            {paymentType === 'advance' && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Advance Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Balance</label>
                  <div className="w-full border border-slate-100 bg-slate-50 rounded-xl px-3 py-2 text-sm font-bold text-red-600">{balance.toFixed(2)}</div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-500 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="online_banking">Online Banking</option>
                <option value="check">Check</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any special notes..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold shadow disabled:opacity-60"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Booking' : 'Create Booking'}
          </button>
        </div>
      </div>

    </div>
  );
}

// ─── Function Form Modal ──────────────────────────────────────────────────────

function FunctionFormModal({
  fn, fnType, apiFetch, onClose, onSaved,
}: {
  fn: EventFunction | null;
  fnType: 'place' | 'menu';
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!fn;
  const isMenu = fnType === 'menu';
  const isPlace = fnType === 'place';
  const [name, setName] = useState(fn?.name || '');
  const [price, setPrice] = useState(String(fn?.price ?? ''));
  const [items, setItems] = useState<EventItem[]>(fn?.items || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addItem = () => {
    setItems((prev) => [...prev, { id: `i-${Date.now()}`, name: '', price: 0, quantity: 1 }]);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const updateItem = (id: string, field: 'name' | 'price', value: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, [field]: field === 'price' ? parseFloat(value) || 0 : value } : it
      )
    );
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Function name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = isPlace
        ? { name: name.trim(), price: parseFloat(price) || 0, items: [], type: 'place' as const }
        : { name: name.trim(), price: parseFloat(price) || 0, items: items.map((it) => ({ ...it, price: 0 })), type: 'menu' as const };
      if (isEdit) {
        await apiFetch(`/api/events/functions/${fn!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/events/functions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch { setError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-lg text-slate-800">
            {isEdit ? (isPlace ? 'Edit Event Place' : 'Edit Function Menu') : (isPlace ? 'New Event Place' : 'New Function Menu')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{isPlace ? 'Place Name *' : 'Function Menu Name *'}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isPlace ? 'e.g. Grand Ballroom, Garden Terrace' : 'e.g. VIP Package A'}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {isPlace ? (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Price (LKR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Price per Person (LKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-500">Item List</label>
                  <button onClick={addItem} className="flex items-center gap-1 text-xs text-violet-600 font-semibold hover:text-violet-700">
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                {items.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-xl">No items yet.</div>
                ) : (
                  <div className="space-y-2">
                    {items.map((it) => (
                      <div key={it.id} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
                        <input
                          value={it.name}
                          onChange={(e) => updateItem(it.id, 'name', e.target.value)}
                          placeholder="Item name"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                        />
                        <button onClick={() => removeItem(it.id)} className="text-red-400 hover:text-red-600 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold shadow disabled:opacity-60"
          >
            {saving ? 'Saving...' : isEdit ? (isPlace ? 'Update Place' : 'Update Menu') : (isPlace ? 'Create Place' : 'Create Menu')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Password Modal ───────────────────────────────────────────────────────────

function PasswordModal({
  title, description, password, setPassword, error, loading,
  onConfirm, onCancel, confirmLabel, confirmClass,
}: {
  title: string;
  description: string;
  password: string;
  setPassword: (v: string) => void;
  error: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  confirmClass: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-lg text-slate-800 mb-1">{title}</h3>
        <p className="text-sm text-slate-500 mb-4">{description}</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
          placeholder="Enter password"
          autoFocus
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 mb-2"
        />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2 mt-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60 ${confirmClass}`}>
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
