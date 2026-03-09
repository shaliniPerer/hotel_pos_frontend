import React, { useState } from 'react';
import { X, Printer, AlertTriangle, Scissors } from 'lucide-react';
import { useStore } from '../store';

// ── Business constants — update to match your venue ─────────────────────────
const BIZ_NAME    = 'The Tranquil Hotel & Restaurant';
const BIZ_ADDRESS = 'No.194 / 1, Makola South, Makola, Sri Lanka';
const BIZ_TEL     = '+94 11 2 965 888 / +94 77 5 072 909';
const BIZ_EMAIL   = 'info@tranquilhotel.com';
const BIZ_TAGLINE = 'Love our food and service ?';
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
  paid_amount?: number;
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
  showPaymentDetails?: boolean;
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'CASH',
  card: 'CARD',
  online_banking: 'ONLINE BANKING',
  check: 'CHECK',
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch { return iso; }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    let hh = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${String(hh).padStart(2, '0')}.${min} ${ampm}`;
  } catch { return iso; }
}

// ── Print window ─────────────────────────────────────────────────────────────
function buildPrintHtml(order: Order, payments: RecordedPayment[], staffName: string, printTime: Date, showPaymentDetails: boolean): string {
  const subtotal  = order.subtotal || 0;
  const tax       = order.tax      || 0;
  const discount  = order.discount || 0;
  const total     = order.total    || 0;
  const paidAmount = order.paid_amount || 0;
  const change = paidAmount > total ? paidAmount - total : 0;

  const itemRows = (order.items || []).map((item, index) => {
    const lineTotal = (item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const priceFormatted = item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `
      <div style="display: grid; grid-template-columns: 50px 1fr 70px 100px 100px; gap: 10px; padding: 12px 0; border-bottom: 1px solid #ddd; align-items: start;">
        <div style="text-align: center;">${String(index + 1).padStart(2, '0')}</div>
        <div>${item.product_name}</div>
        <div style="text-align: center;">${item.quantity}</div>
        <div style="text-align: right;">${priceFormatted}</div>
        <div style="text-align: right;">${lineTotal}</div>
      </div>`;
  }).join('');

  const tableRef = order.type === 'table' ? order.reference || '—' : '—';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Receipt - ${order.order_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      padding: 30px;
      max-width: 600px;
      margin: 0 auto;
      background: white;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 12px;
      line-height: 1.3;
    }
    .header p {
      font-size: 14px;
      margin: 4px 0;
      line-height: 1.5;
    }
    .info-section {
      margin: 20px 0;
      font-size: 14px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .receipt-title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 25px 0;
    }
    .items-header {
      display: grid;
      grid-template-columns: 50px 1fr 70px 100px 100px;
      gap: 10px;
      padding: 12px 0;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      font-weight: bold;
      font-size: 14px;
      margin-top: 20px;
    }
    .items-header div:first-child { text-align: center; }
    .items-header div:nth-child(3) { text-align: center; }
    .items-header div:nth-child(4) { text-align: right; }
    .items-header div:nth-child(5) { text-align: right; }
    .items-container {
      font-size: 14px;
    }
    .totals-section {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #000;
    }
    .total-row {
      display: flex;
      justify-content: flex-end;
      gap: 100px;
      padding: 8px 0;
      font-size: 14px;
    }
    .total-row.grand {
      font-weight: bold;
      font-size: 15px;
      padding-top: 12px;
      border-top: 1px solid #000;
      margin-top: 8px;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
    }
    .footer p {
      margin: 10px 0;
      font-size: 14px;
    }
    .qr-placeholder {
      width: 150px;
      height: 150px;
      margin: 20px auto;
      border: 2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #666;
    }
    @media print {
      body { padding: 20px; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>The Tranquil Hotel & Restaurant</h1>
    <p>No.194 / 1, Makola South, Makola, Sri Lanka</p>
    <p>+94 11 2 965 888 / +94 77 5 072 909</p>
  </div>

  <div class="info-section">
    <div class="info-row">
      <span>Date : ${formatDate(printTime.toISOString())}</span>
      <span>Table : ${tableRef}</span>
    </div>
    <div class="info-row">
      <span>Time : ${formatTime(printTime.toISOString())}</span>
      <span>Staff : ${staffName}</span>
    </div>
  </div>

  <div class="receipt-title">Receipt - ${order.order_number}</div>

  <div class="items-header">
    <div>No</div>
    <div>Item</div>
    <div>Qty</div>
    <div>Price</div>
    <div>Total</div>
  </div>

  <div class="items-container">
    ${itemRows}
  </div>

  <div class="totals-section">
    <div class="total-row">
      <span>Subtotal</span>
      <span>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
    ${tax > 0 ? `
    <div class="total-row">
      <span>Service Charge (10%)</span>
      <span>${tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>` : ''}
    ${discount > 0 ? `
    <div class="total-row">
      <span>Discount</span>
      <span>-${discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>` : ''}
    <div class="total-row grand">
      <span>Grand Total</span>
      <span>LKR ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  </div>

  ${showPaymentDetails ? `
  <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #ddd;">
    <div style="display: flex; justify-content: flex-end; gap: 80px; padding: 6px 0; font-size: 14px; font-weight: bold;">
      <span>Amount Paid (LKR)</span>
      <span>${payments.reduce((s, p) => s + p.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
    <div style="border-top: 1px solid #eee; margin-top: 10px; padding-top: 10px;">
      <div style="text-align: center; font-weight: bold; font-size: 13px; margin-bottom: 8px;">Payment Method</div>
      ${payments.map(p => `
      <div style="display: flex; justify-content: center; gap: 12px; padding: 3px 0; font-size: 13px;">
        <span style="width: 120px; text-align: right;">${p.method === 'cash' ? 'CASH' : p.method === 'card' ? 'CARD' : p.method === 'online_banking' ? 'ONLINE BANKING' : p.method.toUpperCase()}${p.cardNumber ? ' (****' + p.cardNumber + ')' : ''}</span>
        <span style="width: 40px; text-align: center;">LKR</span>
        <span style="width: 100px; text-align: right;">${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>`).join('')}
    </div>
  </div>` : ''}

  <div class="footer">
    <p><strong>Love our food and service ❤️</strong></p>
    <p>Please scan QR code to review us on Google</p>
    <img src="${window.location.origin}/QR.jpeg" alt="QR Code" style="width:150px;height:150px;margin:15px auto;display:block;" />
    <p><strong>Thank you for choosing us!</strong></p>
    <p>See you again!</p>
    <p style="margin-top:20px;font-size:11px;color:#888;">Powered by clickinmo.com</p>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReceiptModal({ order, payments, onClose, showPaymentDetails = false }: Props) {
  const { user } = useStore();
  const [printed, setPrinted] = useState(false);
  const [printedAt, setPrintedAt] = useState<Date>(new Date());

  const staffName = user?.name || 'Staff';

  const subtotal = order.subtotal || 0;
  const tax      = order.tax      || 0;
  const discount = order.discount || 0;
  const total    = order.total    || 0;
  const paidAmt  = order.paid_amount && order.paid_amount > 0 ? order.paid_amount : (payments[0]?.amount || total);
  const change   = paidAmt > total ? paidAmt - total : 0;

  const handlePrint = () => {
    const now = new Date();
    setPrintedAt(now);
    const html = buildPrintHtml(order, payments, staffName, now, showPaymentDetails);
    const win = window.open('', '_blank', 'width=650,height=900');
    if (!win) { alert('Please allow popups to print the receipt.'); return; }
    win.document.write(html);
    win.document.close();
    setPrinted(true);
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col z-[70] overflow-y-auto">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <Printer size={15} />
            Print Receipt
          </button>
          <h2 className="text-base font-semibold text-gray-900">Receipt</h2>
        </div>
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

      {/* Receipt paper */}
      <div className="flex-1 flex justify-center px-4 py-6 bg-gray-50">
        <div
          className="bg-white shadow-lg rounded-sm"
          style={{ width: '500px', fontFamily: 'Arial, sans-serif', fontSize: '14px', padding: '30px' }}
        >
          {/* Business header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '20px', marginBottom: '10px', lineHeight: '1.3' }}>{BIZ_NAME}</div>
            <div style={{ fontSize: '13px', marginBottom: '3px' }}>{BIZ_ADDRESS}</div>
            <div style={{ fontSize: '13px' }}>{BIZ_TEL}</div>
          </div>

          {/* Receipt info */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
              <span>Date : {formatDate(printedAt.toISOString())}</span>
              <span>Table : {order.type === 'table' ? order.reference || '—' : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Time : {formatTime(printedAt.toISOString())}</span>
              <span>Staff : {staffName}</span>
            </div>
          </div>

          {/* Receipt title */}
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '17px', margin: '20px 0' }}>
            Receipt - {order.order_number}
          </div>

          {/* Items header */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '40px 1fr 60px 90px 90px', 
            gap: '8px',
            padding: '10px 0',
            borderTop: '1px solid #000',
            borderBottom: '1px solid #000',
            fontWeight: 'bold',
            fontSize: '13px',
            marginTop: '15px'
          }}>
            <div style={{ textAlign: 'center' }}>No</div>
            <div>Item</div>
            <div style={{ textAlign: 'center' }}>Qty</div>
            <div style={{ textAlign: 'right' }}>Price</div>
            <div style={{ textAlign: 'right' }}>Total</div>
          </div>

          {/* Items */}
          <div>
            {(order.items || []).map((item, index) => (
              <div 
                key={item.id}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '40px 1fr 60px 90px 90px', 
                  gap: '8px',
                  padding: '10px 0',
                  borderBottom: '1px solid #ddd',
                  fontSize: '13px',
                  alignItems: 'start'
                }}
              >
                <div style={{ textAlign: 'center' }}>{String(index + 1).padStart(2, '0')}</div>
                <div>{item.product_name}</div>
                <div style={{ textAlign: 'center' }}>{item.quantity}</div>
                <div style={{ textAlign: 'right' }}>{item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div style={{ textAlign: 'right' }}>{(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #000' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '80px', padding: '6px 0', fontSize: '13px' }}>
              <span>Subtotal</span>
              <span>{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {tax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '80px', padding: '6px 0', fontSize: '13px' }}>
                <span>Service Charge (10%)</span>
                <span>{tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '80px', padding: '6px 0', fontSize: '13px' }}>
                <span>Discount</span>
                <span>-{discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              gap: '80px',
              padding: '10px 0 6px 0', 
              fontSize: '14px', 
              fontWeight: 'bold',
              borderTop: '1px solid #000',
              marginTop: '8px'
            }}>
              <span>Grand Total</span>
              <span>LKR {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Amount Paid & Payment Method */}
          {showPaymentDetails && (
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '80px', padding: '6px 0', fontSize: '14px', fontWeight: 'bold' }}>
              <span>Amount Paid (LKR)</span>
              <span>{payments.reduce((s, p) => s + p.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '10px' }}>
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>Payment Method</div>
              {payments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '3px 0', fontSize: '13px' }}>
                  <span style={{ width: '120px', textAlign: 'right' }}>
                    {METHOD_LABEL[p.method] || p.method.toUpperCase()}{p.cardNumber ? ` (****${p.cardNumber})` : ''}
                  </span>
                  <span style={{ width: '40px', textAlign: 'center' }}>LKR</span>
                  <span style={{ width: '100px', textAlign: 'right' }}>{p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>
          )}
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>{BIZ_TAGLINE}</p>
            <p style={{ fontSize: '12px', marginBottom: '15px' }}>Please scan QR code to review us on Google</p>
            <img src="/QR.jpeg" alt="QR Code" style={{ width: '120px', height: '120px', margin: '15px auto', display: 'block' }} />
            <p style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '15px' }}>Thank you for choosing us!</p>
            <p style={{ fontSize: '12px', marginTop: '5px' }}>See you again!</p>
            <p style={{ fontSize: '11px', color: '#888', marginTop: '20px' }}>Powered by clickinmo.com</p>
          </div>
        </div>
      </div>

    </div>
  );
}
