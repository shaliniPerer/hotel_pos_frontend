import React, { useState, useEffect } from 'react';
import { X, Eye, PlaySquare, ShoppingCart, CreditCard, Printer } from 'lucide-react';
import { useStore } from '../store';
import PaymentModal from './PaymentModal';

interface OrdersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'table' | 'room' | 'takeaway' | 'delivery';
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

export default function OrdersManagementModal({ isOpen, onClose, initialType }: OrdersManagementModalProps) {
  const { orders, loadOrderIntoCart } = useStore();
  const [deliveryMethod, setDeliveryMethod] = useState<'dine_in' | 'room_service' | 'takeaway' | 'delivery'>(
    typeToDeliveryMethod(initialType)
  );
  const [status, setStatus] = useState<'active' | 'finished' | 'void'>('active');
  const [payingOrder, setPayingOrder] = useState<any | null>(null);

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
    loadOrderIntoCart(order);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
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
          <div className="flex items-center gap-4 pr-8">
            <button className="h-10 px-4 bg-white border border-slate-200 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-slate-50 text-slate-700 shadow-sm">
              <Eye size={18} /> Open Orders Details
            </button>
            <button className="w-10 h-10 bg-cyan-200 text-cyan-800 rounded-full flex items-center justify-center hover:bg-cyan-300 transition-colors">
              <PlaySquare size={18} fill="currentColor" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50/50 flex-1">
          {/* Legend */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm font-medium text-slate-700">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium text-slate-700">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium text-slate-700">Reserved</span>
            </div>
          </div>

          {/* Delivery Methods Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex mb-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                      'bg-red-100 text-red-700'
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
                        <div className="col-span-4 text-right">Price</div>
                      </div>
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 text-sm items-center mb-1">
                          <div className="col-span-6 text-slate-700 truncate" title={item.product_name}>{item.product_name}</div>
                          <div className="col-span-2 text-center font-medium">{item.quantity}</div>
                          <div className="col-span-4 text-right font-medium">{(item.price || 0).toFixed(2)}</div>
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
                    <button onClick={() => handleEditOrder(order)} className="hover:text-slate-900 transition-colors" title="Edit Order"><ShoppingCart size={20} /></button>
                    <button onClick={() => setPayingOrder(order)} className="hover:text-emerald-600 transition-colors" title="Payment"><CreditCard size={20} /></button>
                    <button className="hover:text-slate-900 transition-colors" title="Print KOT"><Printer size={20} /></button>
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
    </div>
  );
}
