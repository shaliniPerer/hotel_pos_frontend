import React, { useState, useEffect } from 'react';
import { X, Eye, ShoppingCart, CreditCard, Printer, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import PaymentModal from './PaymentModal';
import ReceiptModal from './ReceiptModal';

interface OrdersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'table' | 'room' | 'takeaway' | 'delivery';
  onEditOrder?: (order: any) => void;
  onOpenDetails?: () => void;
}

function typeToDeliveryMethod(type?: string): 'dine_in' | 'room_service' | 'takeaway' | 'delivery' {
  switch (type) {
    case 'table': return 'dine_in';
    case 'room': return 'room_service';
    case 'takeaway': return 'takeaway';
    case 'delivery': return 'delivery';
    default: return 'dine_in';
  }
}

export default function OrdersManagementModal({ isOpen, onClose, initialType, onEditOrder, onOpenDetails }: OrdersManagementModalProps) {
  const { orders, loadOrderIntoCart, apiFetch, fetchOrders } = useStore();
  const [deliveryMethod, setDeliveryMethod] = useState<'dine_in' | 'room_service' | 'takeaway' | 'delivery'>(
    typeToDeliveryMethod(initialType)
  );
  const [status, setStatus] = useState<'active' | 'finished' | 'void'>('active');
  const [payingOrder, setPayingOrder] = useState<any | null>(null);
  const [printOrder, setPrintOrder] = useState<any | null>(null);
  const [voidOrderId, setVoidOrderId] = useState<string | null>(null);
  const [voidPassword, setVoidPassword] = useState('');
  const [voidPasswordError, setVoidPasswordError] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);
  const [deleteVoidOrderId, setDeleteVoidOrderId] = useState<string | null>(null);
  const [deleteVoidPassword, setDeleteVoidPassword] = useState('');
  const [deleteVoidPasswordError, setDeleteVoidPasswordError] = useState('');
  const [deleteVoidLoading, setDeleteVoidLoading] = useState(false);
  const [deleteFinishedOrderId, setDeleteFinishedOrderId] = useState<string | null>(null);
  const [deleteFinishedPassword, setDeleteFinishedPassword] = useState('');
  const [deleteFinishedPasswordError, setDeleteFinishedPasswordError] = useState('');
  const [deleteFinishedLoading, setDeleteFinishedLoading] = useState(false);

  // Sync tab to match the order type that just triggered the modal
  useEffect(() => {
    if (isOpen && initialType) {
      setDeliveryMethod(typeToDeliveryMethod(initialType));
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const getOrderType = () => {
    switch (deliveryMethod) {
      case 'dine_in': return 'table';
      case 'room_service': return 'room';
      case 'takeaway': return 'takeaway';
      case 'delivery': return 'delivery';
    }
  };

  const getOrderStatus = () => {
    switch (status) {
      case 'active': return 'active';
      case 'finished': return 'completed';
      case 'void': return 'void';
    }
  };

  const displayOrders = orders.filter(order =>
    order.status === getOrderStatus() && order.type === getOrderType()
  );

  const handleEditOrder = (order: any) => {
    if (onEditOrder) onEditOrder(order);
    loadOrderIntoCart(order);
    onClose();
  };

  const handleVoidOrder = async (orderId: string) => {
    setVoidOrderId(orderId);
    setVoidPassword('');
    setVoidPasswordError('');
  };

  const handleDeleteOrder = (orderId: string) => {
    setDeleteFinishedOrderId(orderId);
    setDeleteFinishedPassword('');
    setDeleteFinishedPasswordError('');
  };

  const confirmDeleteFinishedOrder = async () => {
    if (deleteFinishedPassword !== 'unique') {
      setDeleteFinishedPasswordError('Incorrect password. Please try again.');
      return;
    }
    if (!deleteFinishedOrderId) return;
    setDeleteFinishedLoading(true);
    try {
      const res = await apiFetch(`/api/orders/${deleteFinishedOrderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await fetchOrders();
      setDeleteFinishedOrderId(null);
      setDeleteFinishedPassword('');
    } catch {
      setDeleteFinishedPasswordError('Failed to delete order. Please try again.');
    } finally {
      setDeleteFinishedLoading(false);
    }
  };

  const confirmVoidOrder = async () => {
    if (voidPassword !== '7788') {
      setVoidPasswordError('Incorrect password. Please try again.');
      return;
    }
    if (!voidOrderId) return;
    setVoidLoading(true);
    try {
      const res = await apiFetch(`/api/orders/${voidOrderId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to void order');
      await fetchOrders();
      setStatus('void');
      setVoidOrderId(null);
      setVoidPassword('');
    } catch (error) {
      console.error('Error voiding order:', error);
      setVoidPasswordError('Failed to void order. Please try again.');
    } finally {
      setVoidLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Orders Management</h2>
            <p className="text-slate-500 mt-1">Manage tables and current orders</p>
          </div>
          <div className="hidden sm:flex items-center gap-4 pr-8">
            <button
              onClick={() => { onClose(); onOpenDetails && onOpenDetails(); }}
              className="h-10 px-4 bg-white border border-slate-200 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-slate-50 text-slate-700 shadow-sm"
            >
              <Eye size={18} /> Open Orders Details
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50/50 flex-1">
          {/* Delivery Methods Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex flex-wrap mb-4">
            <button
              onClick={() => setDeliveryMethod('dine_in')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                deliveryMethod === 'dine_in' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Dine-In
            </button>
            <button
              onClick={() => setDeliveryMethod('room_service')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                deliveryMethod === 'room_service' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Room Service
            </button>
            <button
              onClick={() => setDeliveryMethod('takeaway')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                deliveryMethod === 'takeaway' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Take Away
            </button>
            <button
              onClick={() => setDeliveryMethod('delivery')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                deliveryMethod === 'delivery' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Delivery
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setStatus('active')}
              className={`px-5 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                status === 'active' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatus('finished')}
              className={`px-5 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                status === 'finished' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Finished
            </button>
            <button
              onClick={() => setStatus('void')}
              className={`px-5 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                status === 'void' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Void
            </button>
          </div>

          {/* Order Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {displayOrders.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500">
                No orders found for this category and status.
              </div>
            ) : (
            displayOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-200 border-4 border-white"></div>
                  
                  <div className="flex justify-between items-start mb-1 mt-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {order.type === 'table' ? `Table ${order.reference || '—'}` :
                         order.type === 'room'  ? `Room ${order.reference || '—'}` :
                         order.type === 'takeaway' ? `Takeaway` :
                         order.type === 'delivery' ? `Delivery` :
                         order.order_number}
                      </h3>
                      {(order.type === 'takeaway' || order.type === 'delivery') && order.reference && (
                        <p className="text-xs text-slate-500 mt-0.5">{order.reference}</p>
                      )}
                    </div>
                    <span className={`px-3 py-0.5 text-xs font-medium rounded-full ${
                      order.status === 'active' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'void' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Order: {order.order_number}</p>
                  
                  <div className="border-t border-slate-100 pt-4 mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Items:</span>
                      <span className="font-medium">{order.items?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-4">
                      <span className="text-slate-500">Time:</span>
                      <span className="font-medium">
                        {(() => {
                          const d = new Date(order.created_at);
                          return isNaN(d.getTime()) ? '—' :
                            d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                        })()}
                      </span>
                    </div>
                    
                    <div className="bg-slate-50/50 rounded-lg p-3 max-h-32 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 mb-2">
                        <div className="col-span-6">Item</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-4 text-right">Total</div>
                      </div>
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 text-sm items-center mb-1">
                          <div className="col-span-6 text-slate-700 truncate" title={item.product_name}>{item.product_name}</div>
                          <div className="col-span-2 text-center font-medium">{item.quantity}</div>
                          <div className="col-span-4 text-right font-medium">{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-100 pt-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">Total:</span>
                      <span className="font-bold text-slate-900">{(order.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-center gap-6 text-slate-600 pb-2">
                    {status === 'active' && (
                      <>
                        <button onClick={() => handleEditOrder(order)} className="hover:text-slate-900 transition-colors" title="Edit Order"><ShoppingCart size={20} /></button>
                        <button onClick={() => setPayingOrder(order)} className="hover:text-emerald-600 transition-colors" title="Payment"><CreditCard size={20} /></button>
                        <button onClick={() => setPrintOrder(order)} className="hover:text-slate-900 transition-colors" title="Print Bill"><Printer size={20} /></button>
                        <button onClick={() => handleVoidOrder(order.id)} className="hover:text-red-600 transition-colors" title="Delete/Void KOT"><Trash2 size={20} /></button>
                      </>
                    )}
                    {status === 'finished' && (
                      <>
                        <button onClick={() => setPrintOrder(order)} className="hover:text-slate-900 transition-colors" title="Print Bill"><Printer size={20} /></button>
                        <button onClick={() => handleDeleteOrder(order.id)} className="hover:text-red-600 transition-colors" title="Delete Record"><Trash2 size={20} /></button>
                      </>
                    )}
                    {status === 'void' && (
                      <>
                        <button onClick={() => setPrintOrder(order)} className="hover:text-slate-900 transition-colors" title="Print Bill"><Printer size={20} /></button>
                        <button onClick={() => { setDeleteVoidOrderId(order.id); setDeleteVoidPassword(''); setDeleteVoidPasswordError(''); }} className="hover:text-red-600 transition-colors" title="Delete Void Record"><Trash2 size={20} /></button>
                      </>
                    )}
                  </div>
                  
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-200 border-4 border-white"></div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {payingOrder && (
        <PaymentModal
          order={payingOrder}
          onClose={() => setPayingOrder(null)}
          onPaid={() => { setPayingOrder(null); setStatus('finished'); }}
        />
      )}

      {printOrder && (
        <ReceiptModal
          order={printOrder}
          payments={[
            {
              id: '1',
              method: printOrder.payment_method || 'cash',
              amount: printOrder.total || 0,
            }
          ]}
          onClose={() => setPrintOrder(null)}
        />
      )}

      {/* Delete Finished Password Modal */}
      {deleteFinishedOrderId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Delete Finished Order</h3>
              <button onClick={() => { setDeleteFinishedOrderId(null); setDeleteFinishedPassword(''); setDeleteFinishedPasswordError(''); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Enter the manager password to permanently delete this finished order. This cannot be undone.</p>
            <input
              type="password"
              value={deleteFinishedPassword}
              onChange={e => { setDeleteFinishedPassword(e.target.value); setDeleteFinishedPasswordError(''); }}
              onKeyDown={e => e.key === 'Enter' && confirmDeleteFinishedOrder()}
              placeholder="Enter password"
              autoFocus
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 mb-3 text-center text-2xl tracking-widest"
            />
            {deleteFinishedPasswordError && (
              <p className="text-sm text-red-600 font-medium mb-3">{deleteFinishedPasswordError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteFinishedOrderId(null); setDeleteFinishedPassword(''); setDeleteFinishedPasswordError(''); }}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFinishedOrder}
                disabled={deleteFinishedLoading || !deleteFinishedPassword}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:bg-slate-300 transition-colors"
              >
                {deleteFinishedLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Void Password Modal */}
      {deleteVoidOrderId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Delete Void Order</h3>
              <button onClick={() => { setDeleteVoidOrderId(null); setDeleteVoidPassword(''); setDeleteVoidPasswordError(''); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Enter the manager password to permanently delete this void order. This cannot be undone.</p>
            <input
              type="password"
              value={deleteVoidPassword}
              onChange={e => { setDeleteVoidPassword(e.target.value); setDeleteVoidPasswordError(''); }}
              onKeyDown={async e => {
                if (e.key === 'Enter') {
                  if (deleteVoidPassword !== 'unique') { setDeleteVoidPasswordError('Incorrect password. Please try again.'); return; }
                  setDeleteVoidLoading(true);
                  try {
                    const res = await apiFetch(`/api/orders/${deleteVoidOrderId}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error();
                    await fetchOrders();
                    setDeleteVoidOrderId(null);
                    setDeleteVoidPassword('');
                  } catch { setDeleteVoidPasswordError('Failed to delete order. Please try again.'); }
                  finally { setDeleteVoidLoading(false); }
                }
              }}
              placeholder="Enter password"
              autoFocus
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 mb-3 text-center text-2xl tracking-widest"
            />
            {deleteVoidPasswordError && (
              <p className="text-sm text-red-600 font-medium mb-3">{deleteVoidPasswordError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteVoidOrderId(null); setDeleteVoidPassword(''); setDeleteVoidPasswordError(''); }}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (deleteVoidPassword !== 'unique') { setDeleteVoidPasswordError('Incorrect password. Please try again.'); return; }
                  setDeleteVoidLoading(true);
                  try {
                    const res = await apiFetch(`/api/orders/${deleteVoidOrderId}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error();
                    await fetchOrders();
                    setDeleteVoidOrderId(null);
                    setDeleteVoidPassword('');
                  } catch { setDeleteVoidPasswordError('Failed to delete order. Please try again.'); }
                  finally { setDeleteVoidLoading(false); }
                }}
                disabled={deleteVoidLoading || !deleteVoidPassword}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:bg-slate-300 transition-colors"
              >
                {deleteVoidLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Password Modal */}
      {voidOrderId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Confirm Void KOT</h3>
              <button onClick={() => { setVoidOrderId(null); setVoidPassword(''); setVoidPasswordError(''); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Enter the manager password to void this order. This action cannot be undone.</p>
            <input
              type="password"
              value={voidPassword}
              onChange={e => { setVoidPassword(e.target.value); setVoidPasswordError(''); }}
              onKeyDown={e => e.key === 'Enter' && confirmVoidOrder()}
              placeholder="Enter password"
              autoFocus
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 mb-3 text-center text-2xl tracking-widest"
            />
            {voidPasswordError && (
              <p className="text-sm text-red-600 font-medium mb-3">{voidPasswordError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setVoidOrderId(null); setVoidPassword(''); setVoidPasswordError(''); }}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmVoidOrder}
                disabled={voidLoading || !voidPassword}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:bg-slate-300 transition-colors"
              >
                {voidLoading ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
