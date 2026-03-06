import React, { useState } from 'react';
import { X, Printer, Mail, AlertTriangle, Scissors } from 'lucide-react';
import { useStore } from '../store';

// ── Business constants — update to match your venue ─────────────────────────
const BIZ_NAME    = 'HOTELMATE';
const BIZ_ADDRESS = 'No. 1, Main Street, Colombo';
const BIZ_TEL     = '+94 77 000 0000';
const BIZ_EMAIL   = 'info@hotelmate.lk';
const BIZ_TAGLINE = 'HotelMate Restaurant';
// ────────────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  type: string;
  reference: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string;
  created_at: string;
  items?: OrderItem[];
}

interface RecordedPayment {
  id: string;
  method: string;
  amount: number;
  cardName?: string;
  cardNumber?: string;
}

interface Props {
  order: Order;
  payments: RecordedPayment[];
  onClose: () => void;
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'CASH',
  card: 'CARD',
  online_banking: 'ONLINE BANKING',
  check: 'CHECK',
};

function pad(str: string, len: number, right = false): string {
  const s = String(str);
  if (right) return s.padStart(len, ' ');
  return s.padEnd(len, ' ');
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh   = String(d.getHours()).padStart(2, '0');
    const min  = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  } catch { return iso; }
}

function tableLabel(type: string, reference: string): string {
  if (type === 'table')    return `Table: ${reference || '—'}`;
  if (type === 'room')     return `Room: ${reference || '—'}`;
  if (type === 'takeaway') return 'Takeaway';
  if (type === 'delivery') return `Delivery${reference ? ': ' + reference : ''}`;
  return '';
}

// ── Print window ─────────────────────────────────────────────────────────────
function buildPrintHtml(order: Order, payments: RecordedPayment[], staffName: string): string {
  const DASH = '- '.repeat(23);
  const subtotal  = order.subtotal || 0;
  const tax       = order.tax      || 0;
  const discount  = order.discount || 0;
  const total     = order.total    || 0;

  const itemRows = (order.items || []).map(item => {
    const lineTotal = (item.price * item.quantity).toFixed(2);
    return `
      <div style="margin-bottom:4px">
        <div>${item.product_name}</div>
        <div style="display:flex;justify-content:space-between;padding-left:4px">
          <span></span>
          <span>${String(item.quantity).padStart(3)} &nbsp; ${item.price.toFixed(2).padStart(8)} &nbsp; ${lineTotal.padStart(8)}</span>
        </div>
      </div>`;
  }).join('');

  const paymentRows = payments.map(p => {
    const label = METHOD_LABEL[p.method] || p.method.toUpperCase();
    const suffix = (p.method === 'card' && p.cardNumber) ? ` (****${p.cardNumber.slice(-4)})` : '';
    return `<div style="display:flex;justify-content:space-between;margin-bottom:2px">
      <span>${label}${suffix}</span>
      <span>${p.amount.toFixed(2)} LKR</span>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Receipt</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      width: 72mm;
      margin: 0 auto;
      padding: 8px 4px;
    }
    .center { text-align: center; }
    .bold   { font-weight: bold; }
    .large  { font-size: 15px; letter-spacing: 1px; }
    .dash   { color: #555; margin: 5px 0; word-break: break-all; }
    .row    { display: flex; justify-content: space-between; margin-bottom: 2px; }
    @media print { @page { margin: 0; } body { width: 80mm; } }
  </style>
</head>
<body>
  <div class="center bold large">${BIZ_NAME}</div>
  <div class="center">${BIZ_ADDRESS}</div>
  <div class="center">Tel: ${BIZ_TEL}</div>
  <div class="center">Email: ${BIZ_EMAIL}</div>
  <div class="center">${BIZ_TAGLINE}</div>

  <div class="dash">${DASH}</div>

  <div>Receipt: ${order.order_number}</div>
  <div>${formatDate(order.created_at)}</div>
  <div>Staff: ${staffName}</div>
  <div>${tableLabel(order.type, order.reference)}</div>

  <div class="dash">${DASH}</div>
  <div class="bold">SALE</div>
  <div class="dash">${DASH}</div>

  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
    <span>ITEM</span>
    <span>QTY &nbsp;&nbsp; PRICE &nbsp;&nbsp; TOTAL</span>
  </div>
  <div class="dash">${DASH}</div>

  ${itemRows}

  <div class="dash">${DASH}</div>

  <div class="row"><span>SUBTOTAL</span><span>${subtotal.toFixed(2)}</span></div>
  ${tax > 0 ? `<div class="row"><span>SERVICE CHARGE</span><span>${tax.toFixed(2)}</span></div>` : ''}
  ${discount > 0 ? `<div class="row"><span>DISCOUNT</span><span>-${discount.toFixed(2)}</span></div>` : ''}

  <div class="dash">${DASH}</div>
  <div class="row bold"><span>GRAND TOTAL</span><span>${total.toFixed(2)}</span></div>
  <div class="dash">${DASH}</div>

  ${paymentRows}

  <div style="margin-top:8px">Signature: ___________________________</div>

  <div class="dash" style="margin-top:10px">${DASH}</div>
  <div class="center bold" style="margin: 6px 0">THANK YOU</div>
  <div class="center" style="font-size:11px">POS Center: ${BIZ_TAGLINE} • Cashier: ${staffName}</div>
  <div class="center" style="font-size:11px">Closed by: ${staffName}</div>
  <div class="dash">${DASH}</div>
  <div class="center" style="margin-top:4px; font-size:11px">&#9986; CUT HERE</div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReceiptModal({ order, payments, onClose }: Props) {
  const { user } = useStore();
  const [printed, setPrinted] = useState(false);
  const [activeTab, setActiveTab] = useState<'print' | 'email'>('print');

  const staffName = user?.name || 'Staff';

  const subtotal = order.subtotal || 0;
  const tax      = order.tax      || 0;
  const discount = order.discount || 0;
  const total    = order.total    || 0;

  const handlePrint = () => {
    const html = buildPrintHtml(order, payments, staffName);
    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) { alert('Please allow popups to print the receipt.'); return; }
    win.document.write(html);
    win.document.close();
    setPrinted(true);
  };

  const DASH = '- '.repeat(22);

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col z-[70] overflow-y-auto">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <h2 className="text-base font-semibold text-gray-900">Receipt</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Amber warning */}
      <div className="bg-white border-b border-gray-200 px-5 py-2 shrink-0">
        <p className="text-amber-500 text-sm font-medium">Please print the bill before closing</p>
      </div>

      {/* Tab row */}
      <div className="bg-white border-b border-gray-200 px-5 flex gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('print')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'print'
              ? 'border-gray-800 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-1.5"><Printer size={14} /> Print</span>
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'email'
              ? 'border-gray-800 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-1.5"><Mail size={14} /> Email</span>
        </button>
      </div>

      {/* Receipt paper */}
      <div className="flex-1 flex justify-center px-4 py-6">
        <div
          className="bg-white shadow-md rounded-sm"
          style={{ width: '320px', fontFamily: "'Courier New', Courier, monospace", fontSize: '12px', padding: '16px' }}
        >
          {/* Business header */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', letterSpacing: '1px' }}>{BIZ_NAME}</div>
            <div>{BIZ_ADDRESS}</div>
            <div>Tel: {BIZ_TEL}</div>
            <div>Email: {BIZ_EMAIL}</div>
            <div>{BIZ_TAGLINE}</div>
          </div>

          <div style={{ color: '#777', marginBottom: '6px', wordBreak: 'break-all' }}>{DASH}</div>

          {/* Order meta */}
          <div>Receipt: {order.order_number}</div>
          <div>{formatDate(order.created_at)}</div>
          <div>Staff: {staffName}</div>
          <div>{tableLabel(order.type, order.reference)}</div>

          <div style={{ color: '#777', margin: '6px 0', wordBreak: 'break-all' }}>{DASH}</div>

          {/* SALE header */}
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>SALE</div>
          <div style={{ color: '#777', marginBottom: '4px', wordBreak: 'break-all' }}>{DASH}</div>

          {/* Column headers */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>ITEM</span>
            <span>QTY &nbsp; PRICE &nbsp; TOTAL</span>
          </div>
          <div style={{ color: '#777', marginBottom: '4px', wordBreak: 'break-all' }}>{DASH}</div>

          {/* Items */}
          {(order.items || []).map(item => (
            <div key={item.id} style={{ marginBottom: '5px' }}>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product_name}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingLeft: '8px', gap: '12px' }}>
                <span style={{ minWidth: '24px', textAlign: 'right' }}>{item.quantity}</span>
                <span style={{ minWidth: '60px', textAlign: 'right' }}>{item.price.toFixed(2)}</span>
                <span style={{ minWidth: '60px', textAlign: 'right' }}>{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}

          <div style={{ color: '#777', margin: '6px 0', wordBreak: 'break-all' }}>{DASH}</div>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>SUBTOTAL</span><span>{subtotal.toFixed(2)}</span>
          </div>
          {tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>SERVICE CHARGE</span><span>{tax.toFixed(2)}</span>
            </div>
          )}
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>DISCOUNT</span><span>-{discount.toFixed(2)}</span>
            </div>
          )}

          <div style={{ color: '#777', margin: '6px 0', wordBreak: 'break-all' }}>{DASH}</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
            <span>GRAND TOTAL</span><span>{total.toFixed(2)}</span>
          </div>

          <div style={{ color: '#777', margin: '6px 0', wordBreak: 'break-all' }}>{DASH}</div>

          {/* Payments */}
          {payments.map(p => {
            const label = METHOD_LABEL[p.method] || p.method.toUpperCase();
            const suffix = p.method === 'card' && p.cardNumber ? ` (****${p.cardNumber.slice(-4)})` : '';
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>{label}{suffix}</span>
                <span>{p.amount.toFixed(2)} LKR</span>
              </div>
            );
          })}

          <div style={{ marginTop: '10px', marginBottom: '8px' }}>Signature: ___________________________</div>

          <div style={{ color: '#777', margin: '6px 0', wordBreak: 'break-all' }}>{DASH}</div>

          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', margin: '8px 0' }}>THANK YOU</div>
          <div style={{ textAlign: 'center', fontSize: '11px' }}>POS Center: {BIZ_TAGLINE} • Cashier: {staffName}</div>
          <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: '6px' }}>Closed by: {staffName}</div>

          <div style={{ color: '#777', margin: '6px 0', wordBreak: 'break-all' }}>{DASH}</div>

          <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Scissors size={12} /> CUT HERE
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="bg-white border-t border-gray-200 px-5 py-4 space-y-3 shrink-0">
        <p className="text-xs text-gray-400">Tip: set paper width to 80mm in the print dialog.</p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Please print the bill before closing. The print dialog will open in the new window.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="w-full py-3 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Print
        </button>

        {!printed && (
          <p className="text-center text-xs text-gray-400">Please print the bill first</p>
        )}
      </div>

    </div>
  );
}
