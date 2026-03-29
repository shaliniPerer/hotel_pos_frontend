import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, FileText, Download, Printer, X, TrendingUp, Menu as MenuIcon,
} from 'lucide-react';
import AppSidebar from '../components/AppSidebar';

interface EventItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface EventBooking {
  id: string;
  customer_name: string;
  customer_phone: string;
  event_date: string;
  event_time: string;
  pax: number;
  function_id: string;
  function_name: string;
  items: EventItem[];
  subtotal: number;
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

function printBookingPDF(booking: EventBooking) {
  const win = window.open('', '_blank', 'width=800,height=700');
  if (!win) return;
  const itemRows = booking.items
    .map(it => `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;">${it.name}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${it.price.toFixed(2)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${(it.price * it.quantity).toFixed(2)}</td>
    </tr>`)
    .join('');
  const paymentBadge =
    booking.payment_status === 'full'
      ? '<span style="color:#16a34a;font-weight:600;">FULLY PAID</span>'
      : booking.payment_status === 'advance'
      ? '<span style="color:#d97706;font-weight:600;">ADVANCE PAID</span>'
      : '<span style="color:#dc2626;font-weight:600;">PENDING</span>';
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Event Booking - ${booking.customer_name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;padding:32px;}
    .header{text-align:center;margin-bottom:24px;border-bottom:2px solid #7c3aed;padding-bottom:16px;}
    .header h1{font-size:22px;font-weight:700;color:#7c3aed;}
    .header p{color:#64748b;font-size:12px;margin-top:4px;}
    .section{margin-bottom:18px;}
    .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#7c3aed;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .field label{font-size:10px;color:#94a3b8;display:block;margin-bottom:2px;}
    .field span{font-size:13px;font-weight:600;}
    table{width:100%;border-collapse:collapse;}
    thead tr{background:#f8fafc;}
    thead th{padding:8px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;}
    .totals{margin-top:12px;}
    .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;}
    .total-row.grand{font-size:15px;font-weight:700;border-top:2px solid #7c3aed;padding-top:8px;margin-top:4px;}
    .total-row.balance{color:#dc2626;}
    .footer{margin-top:32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px;}
  </style>
  </head><body>
  <div class="header"><h1>HotelMate POS</h1><p>Event Booking Confirmation</p></div>
  <div class="section"><div class="section-title">Customer Information</div>
    <div class="grid2">
      <div class="field"><label>Customer Name</label><span>${booking.customer_name}</span></div>
      <div class="field"><label>Phone Number</label><span>${booking.customer_phone || '—'}</span></div>
    </div>
  </div>
  <div class="section"><div class="section-title">Event Details</div>
    <div class="grid2">
      <div class="field"><label>Function</label><span>${booking.function_name || '—'}</span></div>
      <div class="field"><label>PAX (Guests)</label><span>${booking.pax}</span></div>
      <div class="field"><label>Event Date</label><span>${booking.event_date}</span></div>
      <div class="field"><label>Event Time</label><span>${booking.event_time}</span></div>
    </div>
    ${booking.notes ? `<div class="field" style="margin-top:8px;"><label>Notes</label><span>${booking.notes}</span></div>` : ''}
  </div>
  <div class="section"><div class="section-title">Items</div>
    <table><thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
    <tbody>${itemRows}</tbody></table>
    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>${booking.subtotal.toFixed(2)}</span></div>
      <div class="total-row grand"><span>Total</span><span>${booking.total.toFixed(2)}</span></div>
      <div class="total-row" style="color:#0f172a;margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0;">
        <span>Payment Status</span><span>${paymentBadge}</span>
      </div>
      ${booking.payment_status !== 'full' ? `
      <div class="total-row"><span>Advance Payment</span><span>${booking.advance_payment.toFixed(2)}</span></div>
      <div class="total-row balance"><span>Balance Due</span><span>${booking.balance.toFixed(2)}</span></div>
      ` : ''}
      <div class="total-row"><span>Payment Method</span><span style="text-transform:capitalize;">${(booking.payment_method || '—').replace('_',' ')}</span></div>
    </div>
  </div>
  <div class="footer">Thank you for choosing HotelMate. We look forward to making your event special!</div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

export default function EventsDashboard() {
  const { user, logout, apiFetch } = useStore();
  const navigate = useNavigate();

  const [showSidebar, setShowSidebar] = useState(false);
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed' | 'void'>('all');
  const [viewingBooking, setViewingBooking] = useState<EventBooking | null>(null);

  useEffect(() => {
    if (user?.role === 'cashier') { navigate('/'); return; }
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/events/bookings');
      if (res.ok) setBookings(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = statusFilter === 'all' ? bookings : bookings.filter(b => b.status === statusFilter);
  const upcoming  = bookings.filter(b => b.status === 'upcoming');
  const completed = bookings.filter(b => b.status === 'completed');
  const totalRevenue   = completed.reduce((s, b) => s + (b.total || 0), 0);
  const advanceTotal   = bookings.reduce((s, b) => s + (b.advance_payment || 0), 0);
  const balancePending = upcoming.reduce((s, b) => s + (b.balance || 0), 0);

  const statusColor = (s: string) => {
    if (s === 'upcoming')  return 'bg-violet-100 text-violet-700';
    if (s === 'completed') return 'bg-emerald-100 text-emerald-700';
    return 'bg-red-100 text-red-700';
  };

  const payStatusColor = (s: string) => {
    if (s === 'full')    return 'bg-emerald-100 text-emerald-700';
    if (s === 'advance') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const downloadCSV = () => {
    const data = filtered.map(b => ({
      customer_name: b.customer_name, phone: b.customer_phone,
      event_date: b.event_date, event_time: b.event_time,
      function_name: b.function_name, pax: b.pax,
      total: b.total, advance: b.advance_payment,
      balance: b.balance, payment_status: b.payment_status, status: b.status,
    }));
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(r => headers.map(h => (r as any)[h]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'event_bookings.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const win = window.open('', '_blank', 'width=1000,height=750');
    if (!win) return;
    const rows = filtered.map(b => `<tr>
      <td>${b.customer_name}</td>
      <td>${b.customer_phone}</td>
      <td>${b.event_date} ${b.event_time}</td>
      <td>${b.function_name}</td>
      <td style="text-align:center">${b.pax}</td>
      <td style="text-align:right">LKR ${b.total.toFixed(2)}</td>
      <td style="text-align:right">LKR ${(b.balance||0).toFixed(2)}</td>
      <td><span class="badge ${b.status}">${b.status}</span></td>
    </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Event Bookings Report</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#1e293b;font-size:12px;}
      .header{text-align:center;border-bottom:3px solid #7c3aed;padding-bottom:16px;margin-bottom:20px;}
      .title{font-size:22px;font-weight:700;color:#7c3aed;}.sub{font-size:12px;color:#64748b;margin-top:3px;}
      .summary{display:flex;gap:12px;margin-bottom:16px;}
      .card{flex:1;border-radius:8px;padding:10px 14px;}
      table{width:100%;border-collapse:collapse;}
      th{background:#7c3aed;color:white;padding:8px 10px;text-align:left;font-size:11px;}
      td{padding:7px 10px;border-bottom:1px solid #f1f5f9;}
      .badge{padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;}
      .badge.upcoming{background:#ede9fe;color:#6d28d9;}.badge.completed{background:#d1fae5;color:#065f46;}.badge.void{background:#fee2e2;color:#991b1b;}
      .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:10px;}
    </style></head><body>
    <div class="header"><div class="title">HotelMate POS</div><div class="sub">Event Bookings Dashboard Report</div><div class="sub">Generated: ${new Date().toLocaleString()}</div></div>
    <div class="summary">
      <div class="card" style="background:#f5f3ff;border:1px solid #ddd6fe"><div style="font-size:10px;color:#7c3aed;font-weight:700;text-transform:uppercase">Upcoming</div><div style="font-size:18px;font-weight:700;color:#6d28d9">${upcoming.length}</div></div>
      <div class="card" style="background:#f0fdf4;border:1px solid #bbf7d0"><div style="font-size:10px;color:#16a34a;font-weight:700;text-transform:uppercase">Revenue</div><div style="font-size:18px;font-weight:700;color:#15803d">LKR ${totalRevenue.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
      <div class="card" style="background:#f0f9ff;border:1px solid #bae6fd"><div style="font-size:10px;color:#0284c7;font-weight:700;text-transform:uppercase">Advance Collected</div><div style="font-size:18px;font-weight:700;color:#0369a1">LKR ${advanceTotal.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
      <div class="card" style="background:#fffbeb;border:1px solid #fde68a"><div style="font-size:10px;color:#d97706;font-weight:700;text-transform:uppercase">Balance Pending</div><div style="font-size:18px;font-weight:700;color:#b45309">LKR ${balancePending.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
    </div>
    <table><thead><tr><th>Customer</th><th>Phone</th><th>Date &amp; Time</th><th>Function</th><th>PAX</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="footer">HotelMate POS — Event Bookings — ${filtered.length} records</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
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
            <div className="p-2 bg-violet-100 text-violet-600 rounded-xl shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Event Management System</p>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">Event Dashboard</h2>
            </div>
          </div>
          <p className="ml-auto text-xs text-slate-400 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-60 text-slate-400">Loading...</div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-violet-500 mb-1">Upcoming Events</p>
                  <p className="text-2xl font-bold text-violet-700">{upcoming.length}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-700">LKR {totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-500 mb-1">Advance Collected</p>
                  <p className="text-2xl font-bold text-cyan-700">LKR {advanceTotal.toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Balance Pending</p>
                  <p className="text-2xl font-bold text-amber-700">LKR {balancePending.toLocaleString()}</p>
                </div>
              </div>

              {/* Filter + Actions */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {(['all', 'upcoming', 'completed', 'void'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                      statusFilter === s ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={downloadPDF}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors">
                    <FileText className="w-3.5 h-3.5" /> Download PDF
                  </button>
                  <button onClick={downloadCSV}
                    className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download CSV
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-violet-600 text-white">
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Phone</th>
                      <th className="px-4 py-3 font-semibold">Date &amp; Time</th>
                      <th className="px-4 py-3 font-semibold">Function</th>
                      <th className="px-4 py-3 font-semibold text-center">PAX</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                      <th className="px-4 py-3 font-semibold text-right">Balance</th>
                      <th className="px-4 py-3 font-semibold text-center">Status</th>
                      <th className="px-4 py-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{b.customer_name}</td>
                        <td className="px-4 py-3 text-slate-600">{b.customer_phone}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {b.event_date}<br /><span className="text-xs text-slate-400">{b.event_time}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{b.function_name}</td>
                        <td className="px-4 py-3 text-center text-slate-700">{b.pax}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">LKR {b.total.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-600">LKR {(b.balance || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(b.status)}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setViewingBooking(b)}
                              className="p-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg transition-colors" title="View Details">
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => printBookingPDF(b)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors" title="Print PDF">
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 py-10 text-center text-slate-500">No bookings found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Booking View Modal */}
      {viewingBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-violet-600 text-white p-5 rounded-t-2xl flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold">Event Booking Details</h2>
                <p className="text-violet-200 text-sm mt-0.5">ID: {viewingBooking.id}</p>
              </div>
              <button onClick={() => setViewingBooking(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs text-slate-500 uppercase tracking-wide">Customer</span><p className="font-semibold text-slate-800 mt-0.5">{viewingBooking.customer_name}</p></div>
                <div><span className="text-xs text-slate-500 uppercase tracking-wide">Phone</span><p className="font-semibold text-slate-800 mt-0.5">{viewingBooking.customer_phone}</p></div>
                <div><span className="text-xs text-slate-500 uppercase tracking-wide">Event Date</span><p className="font-semibold text-slate-800 mt-0.5">{formatDate(viewingBooking.event_date)}</p></div>
                <div><span className="text-xs text-slate-500 uppercase tracking-wide">Event Time</span><p className="font-semibold text-slate-800 mt-0.5">{viewingBooking.event_time}</p></div>
                <div><span className="text-xs text-slate-500 uppercase tracking-wide">PAX</span><p className="font-semibold text-slate-800 mt-0.5">{viewingBooking.pax} persons</p></div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Status</span>
                  <p className="mt-0.5">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor(viewingBooking.status)}`}>{viewingBooking.status}</span>
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-violet-700 uppercase tracking-wide mb-2 pb-1 border-b border-slate-200">Function: {viewingBooking.function_name}</h3>
                <table className="w-full text-sm">
                  <thead><tr className="bg-violet-50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-violet-700">Item</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-violet-700">Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-violet-700">Price</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-violet-700">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingBooking.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">LKR {item.price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-medium">LKR {(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="font-medium">LKR {viewingBooking.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Advance Paid</span><span className="font-medium text-emerald-600">LKR {(viewingBooking.advance_payment || 0).toFixed(2)}</span></div>
                <div className="flex justify-between text-base border-t pt-2 border-slate-200"><span className="font-bold text-violet-700">Balance Due</span><span className="font-bold text-violet-700">LKR {(viewingBooking.balance || 0).toFixed(2)}</span></div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Payment: <span className="capitalize">{(viewingBooking.payment_method || '—').replace('_', ' ')}</span></span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${payStatusColor(viewingBooking.payment_status)}`}>{viewingBooking.payment_status}</span>
                </div>
              </div>
              {viewingBooking.notes && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-sm text-amber-800"><span className="font-semibold">Notes:</span> {viewingBooking.notes}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4 bg-slate-50 rounded-b-2xl border-t">
              <button onClick={() => printBookingPDF(viewingBooking)}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors text-sm">
                <Printer className="w-4 h-4" /> Print PDF
              </button>
              <button onClick={() => setViewingBooking(null)}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium transition-colors text-sm">
                <X className="w-4 h-4" /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
