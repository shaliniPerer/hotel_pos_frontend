import React, { useState } from 'react';
import { ChevronLeft, Receipt, Banknote, CreditCard, Landmark, FileCheck, PlusCircle, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import ReceiptModal from './ReceiptModal';

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

interface Props {
  order: Order;
  onClose: () => void;
  onPaid: () => void;
}

type PayMethod = 'cash' | 'card' | 'online_banking' | 'check';

interface RecordedPayment {
  id: string;
  method: PayMethod;
  amount: number;
  cardName?: string;
  cardNumber?: string;
}

const METHODS: { key: PayMethod; label: string; icon: React.ReactNode }[] = [
  { key: 'cash',           label: 'Cash',           icon: <Banknote size={18} /> },
  { key: 'card',           label: 'Card',           icon: <CreditCard size={18} /> },
  { key: 'online_banking', label: 'Online Banking', icon: <Landmark size={18} /> },
  { key: 'check',          label: 'Check',          icon: <FileCheck size={18} /> },
];

const METHOD_LABEL: Record<PayMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  online_banking: 'Online Banking',
  check: 'Check',
};

export default function PaymentModal({ order, onClose, onPaid }: Props) {
  const { apiFetch, fetchOrders } = useStore();

  const [currentMethod, setCurrentMethod] = useState<PayMethod>('cash');
  const [currentAmount, setCurrentAmount] = useState('');
  const [cardName,   setCardName]   = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [recorded,   setRecorded]   = useState<RecordedPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const subtotal = order.subtotal || 0;
  const tax      = order.tax      || 0;
  const discount = order.discount || 0;
  const total    = order.total    || 0;

  const totalRecorded = recorded.reduce((s, p) => s + p.amount, 0);
  const remaining     = Math.max(0, total - totalRecorded);
  const isFullyPaid   = totalRecorded >= total - 0.001;
  const cashChange    = totalRecorded > total ? totalRecorded - total : 0;

  const canRecord = () => {
    const amt = parseFloat(currentAmount);
    if (!amt || amt <= 0) return false;
    if (currentMethod === 'card' && (!cardName.trim() || !cardNumber.trim())) return false;
    return true;
  };

  const handleRecord = () => {
    const amt = parseFloat(currentAmount);
    if (!canRecord()) return;
    setRecorded(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        method: currentMethod,
        amount: amt,
        ...(currentMethod === 'card' ? { cardName: cardName.trim(), cardNumber: cardNumber.trim() } : {}),
      },
    ]);
    setCurrentAmount('');
    if (currentMethod === 'card') { setCardName(''); setCardNumber(''); }
  };

  const handleRemove = (id: string) => setRecorded(prev => prev.filter(p => p.id !== id));

  const handleCompletePayment = async () => {
    if (!isFullyPaid) return;
    setLoading(true);
    try {
      const methodSummary =
        recorded.length === 1
          ? recorded[0].method
          : recorded.map(p => METHOD_LABEL[p.method]).join('+');

      const res = await apiFetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          payment_method: methodSummary,
          payment_details: recorded.map(p => ({
            method: p.method,
            amount: p.amount,
            ...(p.cardName   ? { card_name:   p.cardName   } : {}),
            ...(p.cardNumber ? { card_number: p.cardNumber } : {}),
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      await fetchOrders();
      setShowReceipt(true);
    } catch (e: any) {
      alert('Payment failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (showReceipt) {
    return (
      <ReceiptModal
        order={order}
        payments={recorded}
        onClose={() => { setShowReceipt(false); onPaid(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900">Select Payment Method</h2>
              <p className="text-xs text-slate-400">Record payments · complete when fully paid</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600"><Receipt size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Order amounts */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span><span>{subtotal.toFixed(2)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tax</span><span>{tax.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Discount</span><span>−{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
              <span>Grand Total</span><span>LKR {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Balance strip */}
          <div className="px-4 py-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900">Total: LKR {total.toFixed(2)}</span>
            <span className="text-slate-500">
              Paid: {totalRecorded.toFixed(2)} |{' '}
              <span className={remaining > 0 ? 'text-red-500 font-semibold' : 'text-emerald-600 font-semibold'}>
                {remaining > 0 ? `Remaining: ${remaining.toFixed(2)}` : 'Fully Paid ✓'}
              </span>
            </span>
          </div>

          {/* Recorded payments list */}
          {recorded.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recorded Payments</p>
              <div className="space-y-1.5">
                {recorded.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                        {METHOD_LABEL[p.method]}
                      </span>
                      {p.cardName && (
                        <span className="text-xs text-slate-500 truncate">{p.cardName} · ****{p.cardNumber?.slice(-4)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-slate-900">LKR {p.amount.toFixed(2)}</span>
                      <button onClick={() => handleRemove(p.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {cashChange > 0 && (
                <p className="text-xs text-emerald-600 mt-1.5 font-medium">Change to return: LKR {cashChange.toFixed(2)}</p>
              )}
            </div>
          )}

          {/* Add payment section — hidden once fully paid */}
          {!isFullyPaid && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add Payment</p>

              {/* Method selector */}
              <div className="grid grid-cols-4 gap-2">
                {METHODS.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setCurrentMethod(key)}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border-2 transition-all text-xs font-medium ${
                      currentMethod === key
                        ? 'border-slate-800 bg-slate-50 text-slate-900'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {icon}
                    <span className="leading-tight text-center">{label}</span>
                  </button>
                ))}
              </div>

              {/* Card details */}
              {currentMethod === 'card' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Cardholder Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      placeholder="e.g. John Smith"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Card Number <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                      placeholder="Last 4 digits or full card number"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-800"
                      maxLength={16}
                    />
                    {cardNumber.length > 0 && cardNumber.length < 4 && (
                      <p className="text-xs text-red-400 mt-1">Enter at least 4 digits</p>
                    )}
                  </div>
                </div>
              )}

              {/* Amount input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Amount{' '}
                  <span className="text-slate-400 font-normal">(Remaining: LKR {remaining.toFixed(2)})</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={currentAmount}
                    onChange={e => setCurrentAmount(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRecord()}
                    placeholder={remaining.toFixed(2)}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
                  />
                  <button
                    onClick={() => setCurrentAmount(remaining.toFixed(2))}
                    className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-colors whitespace-nowrap"
                  >
                    Exact
                  </button>
                </div>
              </div>

              {/* Record button */}
              <button
                onClick={handleRecord}
                disabled={!canRecord()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <PlusCircle size={16} />
                Record Payment
              </button>
            </div>
          )}

          {/* Order summary */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Order Summary</p>
            <div className="bg-slate-50 rounded-xl p-3 max-h-28 overflow-y-auto space-y-1">
              {order.items?.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-slate-700 truncate flex-1 mr-2">{item.product_name} × {item.quantity}</span>
                  <span className="font-medium text-slate-900 shrink-0">{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Complete Payment footer */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 shrink-0">
          {!isFullyPaid && (
            <p className="text-center text-xs text-slate-400 mb-2">
              Record LKR {remaining.toFixed(2)} more to enable completion
            </p>
          )}
          <button
            onClick={handleCompletePayment}
            disabled={!isFullyPaid || loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Processing...' : isFullyPaid ? 'Complete Payment' : `Complete Payment (LKR ${remaining.toFixed(2)} remaining)`}
          </button>
        </div>

      </div>
    </div>
  );
}
