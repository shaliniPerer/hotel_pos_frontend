import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, ShoppingBag, Plus, Minus, Trash2, CreditCard, Banknote, BedDouble, Receipt, TrendingUp, Menu, Sun, Moon, Play, Settings, ListOrdered, ChevronLeft, ChevronRight, ChevronDown, ShoppingCart, Pizza, UtensilsCrossed, Package, Home, Truck, X, Landmark, FileCheck, FileText } from 'lucide-react';
import OrdersManagementModal from '../components/OrdersManagementModal';
import ReceiptModal from '../components/ReceiptModal';
import AddItemModal from '../components/AddItemModal';
import CategoriesModal from '../components/CategoriesModal';
import ManageItemsModal from '../components/ManageItemsModal';
import AttachItemModal from '../components/AttachItemModal';

const PizzaPlaceholder = () => (
  <svg viewBox="0 0 100 100" className="w-24 h-24 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M50 50 L95 50 A 45 45 0 1 1 50 5 Z" />
    <path d="M55 45 L55 0 A 45 45 0 0 1 100 45 Z" />
    <circle cx="30" cy="30" r="4" />
    <circle cx="70" cy="70" r="4" />
    <circle cx="30" cy="70" r="4" />
    <circle cx="75" cy="25" r="3" />
    <path d="M 40 60 Q 45 55 50 60 T 60 60" />
    <path d="M 20 50 Q 25 45 30 50 T 40 50" />
  </svg>
);

export default function POS() {
  const { 
    user, token, categories, products, cart, orderType, orderReference, discount, activeOrderId,
    fetchCategories, fetchProducts, fetchOrders, initSocket, addToCart, removeFromCart, updateQuantity,
    updateCartItemNote, clearCart, setOrderType, setDiscount, logout, setActiveOrderId, apiFetch, orders
  } = useStore();
  
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showKOTModal, setShowKOTModal] = useState(false);
  const [showOrdersManagementModal, setShowOrdersManagementModal] = useState(false);
  const [currentOrderNumber, setCurrentOrderNumber] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'dine_in' | 'takeaway' | 'room_service' | 'delivery'>('dine_in');
  const [tableNo, setTableNo] = useState('');
  const [pax, setPax] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online_banking' | 'check'>('cash');
  const [paidAmount, setPaidAmount] = useState('');

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showManageItemsModal, setShowManageItemsModal] = useState(false);
  const [showAttachItemModal, setShowAttachItemModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [completedPayments, setCompletedPayments] = useState<any[]>([]);
  const [originalOrderItems, setOriginalOrderItems] = useState<any[]>([]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setShowActionMenu(false);
      }
    }
    if (showActionMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionMenu]);

  useEffect(() => {
    // TEMP: login disabled
    // if (!token) {
    //   navigate('/login');
    //   return;
    // }
    
    fetchCategories();
    fetchProducts();
    fetchOrders();
    initSocket();
  }, [token]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories]);

  const handleAddToCart = (product: any) => {
    addToCart(product);
    setIsCartOpen(true);
  };

  const handleEditNote = (productId: string, currentNote: string = '') => {
    setEditingNoteId(productId);
    setNoteText(currentNote);
  };

  const handleSaveNote = (productId: string) => {
    updateCartItemNote(productId, noteText);
    setEditingNoteId(null);
    setNoteText('');
  };

  const handleCancelNote = () => {
    setEditingNoteId(null);
    setNoteText('');
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory ? p.category_id === activeCategory : true;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isVisible = p.visible !== false;
    return matchesCategory && matchesSearch && isVisible;
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax - discount;

  const handleCheckout = async () => {
    try {
      const url = activeOrderId ? `/api/orders/${activeOrderId}` : '/api/orders';
      const method = activeOrderId ? 'PUT' : 'POST';
      
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: orderType,
          reference: orderReference,
          items: cart.map(item => ({ product_id: item.id, product_name: item.name, quantity: item.quantity, price: item.price })),
          subtotal,
          tax,
          discount,
          total,
          payment_method: paymentMethod,
          paid_amount: paymentMethod === 'cash' && paidAmount ? parseFloat(paidAmount) : total,
          status: 'completed'
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const orderData = await res.json();
      const paidAmt = paymentMethod === 'cash' && paidAmount ? parseFloat(paidAmount) : total;
      setCompletedPayments([{ id: '1', method: paymentMethod, amount: paidAmt }]);
      generateReceipt(orderData);
      clearCart();
      setActiveOrderId(null);
      setOriginalOrderItems([]);
      setShowPaymentModal(false);
    } catch (error: any) {
      console.error('Checkout failed', error);
      alert('Failed to complete order: ' + error.message);
    }
  };

  const handleSaveOrder = async (type: string, reference: string) => {
    try {
      const url = activeOrderId ? `/api/orders/${activeOrderId}` : '/api/orders';
      const method = activeOrderId ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          reference,
          items: cart.map(item => ({ product_id: item.id, product_name: item.name, quantity: item.quantity, price: item.price })),
          subtotal,
          tax,
          discount,
          total,
          payment_method: paymentMethod,
          status: 'active'
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const orderData = await res.json();
      setActiveOrderId(orderData.id);
      await fetchOrders();
      return orderData;
    } catch (error: any) {
      console.error('Save order failed', error);
      alert('Failed to save order: ' + error.message);
      return null;
    }
  };

  const generateReceipt = (order: any) => {
    setCompletedOrder(order);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <div className={`flex flex-col h-screen font-sans overflow-hidden print:hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
        {/* Top Nav */}
      <header className={`h-14 flex items-center justify-between px-4 shrink-0 ${isDarkMode ? 'bg-slate-800 border-b border-slate-700' : 'bg-white border-b border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className={`text-[15px] font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Point of Sale</h1>
            <span className="text-[9px] bg-cyan-400 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wider w-fit mt-0.5">The Tranquil</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            System Date: {new Date().toISOString().split('T')[0]}
          </div>
          <div className={`flex items-center gap-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            <div className="relative">
              <button onClick={() => setIsCartOpen(!isCartOpen)} className={isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}><ShoppingCart size={24} /></button>
              {cart.length > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 ${isDarkMode ? 'border-slate-800' : 'border-white'}`}>{cart.length}</span>
              )}
            </div>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className={isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            {user?.role !== 'cashier' && (
              <>
                <button onClick={() => navigate('/dashboard')} className="hover:text-indigo-600 ml-2" title="Dashboard & Analytics"><TrendingUp size={24} /></button>
              </>
            )}
            <button onClick={handleLogout} className="hover:text-red-600 ml-2"><LogOut size={24} /></button>
          </div>
        </div>
      </header>

      <div className={`flex flex-1 overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50/50'}`}>
        {/* Left Panel */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>The Tranquil Restaurant</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  clearCart();
                  setActiveOrderId(null);
                  setOriginalOrderItems([]);
                  setActiveCategory(categories.length > 0 ? categories[0].id : null);
                  setSearchQuery('');
                  setIsCartOpen(false);
                }}
                className={`h-11 px-5 rounded-lg flex items-center gap-2 text-base font-medium shadow-sm ${isDarkMode ? 'bg-cyan-700 hover:bg-cyan-600 text-white' : 'bg-cyan-600 hover:bg-cyan-700 text-white'}`}
              >
                <Plus size={20} /> New Order
              </button>
              <button onClick={() => { fetchOrders(); setShowOrdersManagementModal(true); }} className={`h-11 px-5 rounded-lg flex items-center gap-2 text-base font-medium shadow-sm ${isDarkMode ? 'bg-slate-700 border border-slate-600 hover:bg-slate-600 text-slate-200' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}><ListOrdered size={20} /> Orders Management</button>
              {/* Action dropdown */}
              <div className="relative" ref={actionMenuRef}>
                <button
                  onClick={() => setShowActionMenu(v => !v)}
                  className="h-11 px-5 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 text-base font-medium hover:bg-slate-50 text-slate-700 shadow-sm"
                >
                  <Settings size={20} /> Action <ChevronDown size={16} className={`transition-transform ${showActionMenu ? 'rotate-180' : ''}`} />
                </button>
                {showActionMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <button
                      onClick={() => { setShowManageItemsModal(true); setShowActionMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 border-b border-slate-100"
                    >
                      <Settings size={15} className="text-slate-400" />
                      Manage Items
                    </button>
                    <button
                      onClick={() => { setShowAttachItemModal(true); setShowActionMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                    >
                      <ListOrdered size={15} className="text-slate-400" />
                      Attach Item to Outlet
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search & Categories */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
              <input type="text" placeholder="Search..." className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm text-sm ${isDarkMode ? 'bg-slate-700 border border-slate-600 text-white placeholder-slate-400' : 'bg-white border border-slate-200 text-slate-900'}`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            
            <div className="flex items-center gap-2">
              <button className={`p-2 rounded-lg shadow-sm ${isDarkMode ? 'bg-slate-700 border border-slate-600 hover:bg-slate-600 text-slate-200' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'}`}><ChevronLeft size={18} /></button>
              <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveCategory(null)} className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${!activeCategory ? (isDarkMode ? 'bg-slate-600 border-b-[3px] border-cyan-400 text-white' : 'bg-slate-100 border-b-[3px] border-slate-800 text-slate-900') : (isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-transparent' : 'bg-white text-slate-500 hover:bg-slate-50 border border-transparent')}`}>All</button>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === cat.id ? (isDarkMode ? 'bg-slate-600 border-b-[3px] border-cyan-400 text-white' : 'bg-slate-100 border-b-[3px] border-slate-800 text-slate-900') : (isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-transparent' : 'bg-white text-slate-500 hover:bg-slate-50 border border-transparent')}`}>{cat.name}</button>
                ))}
              </div>
              <button className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm"><ChevronRight size={18} /></button>
              <button
                onClick={() => setShowCategoriesModal(true)}
                title="Manage Categories"
                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-cyan-50 hover:border-cyan-300 text-slate-600 hover:text-cyan-600 shadow-sm transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-2 pb-4 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              <button
                onClick={() => setShowAddItemModal(true)}
                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-colors h-full min-h-[360px] ${isDarkMode ? 'border-slate-600 bg-slate-800 hover:bg-slate-700' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                <Plus size={48} className={isDarkMode ? 'text-slate-500 mb-3' : 'text-slate-400 mb-3'} />
                <span className={`font-bold text-lg ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>+ Add</span>
              </button>
              {filteredProducts.map(product => (
                <div key={product.id} className={`border rounded-xl p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow h-full min-h-[260px] ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                  <div className={`w-full aspect-square rounded-lg mb-3 flex items-center justify-center overflow-hidden border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                    ) : (
                      <PizzaPlaceholder />
                    )}
                  </div>
                  <h3 className={`font-bold text-[13px] leading-tight mb-1 line-clamp-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{product.name}</h3>
                  <p className={`text-[11px] mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>code - {product.code || product.id.slice(0,4).toUpperCase()}</p>
                  <p className={`font-bold text-base mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{product.price.toFixed(2)}</p>
                  <button onClick={() => handleAddToCart(product)} className={`mt-auto w-full py-3 border rounded-lg flex items-center justify-center gap-2 text-base font-semibold ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-200' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                    <Plus size={20} /> Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Cart */}
        {isCartOpen && (
          <div className={`w-[380px] border flex flex-col m-6 ml-0 rounded-xl shadow-sm shrink-0 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}><ShoppingCart size={22} /> Cart</h2>
              <button onClick={clearCart} className={`px-3 py-1.5 border rounded-lg text-xs font-medium ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>Clear Cart</button>
            </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center space-y-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <ShoppingCart size={48} className="opacity-20" />
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className={`border rounded-lg p-3.5 ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`font-bold text-[13px] pr-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{item.name}</h4>
                    <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={() => handleEditNote(item.id, item.note || '')}
                        className={`${editingNoteId === item.id ? 'text-blue-500' : ''} ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <FileText size={14} />
                      </button>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className={isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-black'}><Minus size={14} /></button>
                        <span className="font-bold text-[13px] w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className={isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-black'}><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className={`ml-1 ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p className={`text-[13px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.price.toFixed(2)} &times; {item.quantity}</p>
                  
                  {editingNoteId === item.id ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add note (e.g., No onions)"
                        className={`flex-1 px-2 py-1 text-xs rounded border ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-slate-300'}`}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveNote(item.id)}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelNote}
                        className={`px-2 py-1 text-xs rounded ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : item.note ? (
                    <p className={`text-xs italic mt-2 pl-2 border-l-2 border-blue-400 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.note}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className={`p-6 border-t rounded-b-xl ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white'}`}>
            <div className="space-y-3 mb-6">
              <div className={`flex justify-between text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>Subtotal</span>
                <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{subtotal.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>Service Charge (10%)</span>
                <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{tax.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-500 text-sm">
                  <span>Discount</span>
                  <span className="font-medium">-{discount.toFixed(2)}</span>
                </div>
              )}
              <div className={`flex justify-between items-center pt-3 mt-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <span className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Total</span>
                <span className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{total.toFixed(2)}</span>
              </div>
            </div>
            <button 
              disabled={cart.length === 0} 
              onClick={async () => {
                if (activeOrderId) {
                  // Editing existing order — skip delivery modal, save & show KOT directly
                  const saved = await handleSaveOrder(orderType, orderReference);
                  if (saved) {
                    setCurrentOrderNumber(saved.order_number ? `KOT-${String(saved.order_number).padStart(3, '0')}` : `KOT-${orderReference}`);
                    setShowKOTModal(true);
                  }
                } else {
                  setShowDeliveryModal(true);
                }
              }} 
              className="w-full py-3.5 bg-[#141414] text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
            >
              <CreditCard size={18} /> {activeOrderId ? 'Update KOT' : 'Checkout'}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>

      {/* Delivery Method Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Select Delivery Method</h2>
                <p className="text-sm text-slate-500 mt-1">Choose how you want to deliver this order</p>
              </div>
              <button onClick={() => setShowDeliveryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setDeliveryMethod('dine_in')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors ${deliveryMethod === 'dine_in' ? 'border-slate-900 bg-white' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <UtensilsCrossed size={28} className={deliveryMethod === 'dine_in' ? 'text-slate-900' : 'text-slate-600'} />
                  <span className={`font-medium ${deliveryMethod === 'dine_in' ? 'text-slate-900' : 'text-slate-600'}`}>Dine In</span>
                </button>
                <button
                  onClick={() => setDeliveryMethod('takeaway')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors ${deliveryMethod === 'takeaway' ? 'border-slate-900 bg-white' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <Package size={28} className={deliveryMethod === 'takeaway' ? 'text-slate-900' : 'text-slate-600'} />
                  <span className={`font-medium ${deliveryMethod === 'takeaway' ? 'text-slate-900' : 'text-slate-600'}`}>Takeaway</span>
                </button>
                <button
                  onClick={() => setDeliveryMethod('room_service')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors ${deliveryMethod === 'room_service' ? 'border-slate-900 bg-white' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <Home size={28} className={deliveryMethod === 'room_service' ? 'text-slate-900' : 'text-slate-600'} />
                  <span className={`font-medium ${deliveryMethod === 'room_service' ? 'text-slate-900' : 'text-slate-600'}`}>Room Service</span>
                </button>
                <button
                  onClick={() => setDeliveryMethod('delivery')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors ${deliveryMethod === 'delivery' ? 'border-slate-900 bg-white' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <Truck size={28} className={deliveryMethod === 'delivery' ? 'text-slate-900' : 'text-slate-600'} />
                  <span className={`font-medium ${deliveryMethod === 'delivery' ? 'text-slate-900' : 'text-slate-600'}`}>Delivery Service</span>
                </button>
              </div>

              {/* Dynamic Form Fields */}
              <div className="space-y-4">
                {deliveryMethod === 'dine_in' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Table No</label>
                      <input type="text" value={tableNo} onChange={e => setTableNo(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">No. of Pax</label>
                      <input type="number" value={pax} onChange={e => setPax(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Cart - use - for reduce on table (-1, -2...)</label>
                      <div className="space-y-2">
                        {cart.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                            <span className="text-sm font-medium">{item.name}</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1">
                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded"><Minus size={14} /></button>
                                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded"><Plus size={14} /></button>
                              </div>
                              <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Running Tables</label>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const occupiedTables = orders
                            .filter(o => o.type === 'table' && o.status === 'active')
                            .map(o => o.reference);
                          return occupiedTables.length === 0
                            ? <span className="text-sm text-slate-400">No tables occupied</span>
                            : occupiedTables.map((tbl, i) => (
                              <span key={i} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm">{tbl}</span>
                            ));
                        })()}
                      </div>
                    </div>

                    {tableNo && orders.some(o => o.type === 'table' && o.status === 'active' && o.reference === tableNo) && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium">
                        ⚠ Table {tableNo} is already occupied. Please choose a different table or finish/void the existing order first.
                      </div>
                    )}
                  </>
                )}

                {deliveryMethod === 'takeaway' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
                  </div>
                )}

                {deliveryMethod === 'room_service' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Room No</label>
                    <input type="text" value={roomNo} onChange={e => setRoomNo(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
                  </div>
                )}

                {deliveryMethod === 'delivery' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                      <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Customer Address</label>
                      <input type="text" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={async () => {
                  const type = deliveryMethod === 'dine_in' ? 'table' :
                    deliveryMethod === 'room_service' ? 'room' :
                    deliveryMethod === 'takeaway' ? 'takeaway' : 'delivery';
                  const reference = deliveryMethod === 'dine_in' ? tableNo :
                    deliveryMethod === 'room_service' ? roomNo :
                    deliveryMethod === 'takeaway' ? phone :
                    `${phone} - ${customerName} - ${customerAddress}`;

                  // Block if table is already occupied
                  if (type === 'table' && orders.some(o => o.type === 'table' && o.status === 'active' && o.reference === tableNo)) {
                    return;
                  }

                  setOrderType(type as any, reference);
                  const saved = await handleSaveOrder(type, reference);
                  if (saved) {
                    setCurrentOrderNumber(saved.order_number ? `KOT-${String(saved.order_number).padStart(3, '0')}` : `KOT-${reference}`);
                    setShowDeliveryModal(false);
                    setShowKOTModal(true);
                  }
                }}
                disabled={deliveryMethod === 'dine_in' && !!tableNo && orders.some(o => o.type === 'table' && o.status === 'active' && o.reference === tableNo)}
                className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KOT Modal */}
      {showKOTModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 print:bg-transparent print:backdrop-blur-none">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-auto print:max-w-none">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center print:hidden">
              <h2 className="text-lg font-bold text-slate-800">KOT - {currentOrderNumber}</h2>
              <button onClick={async () => { await fetchOrders(); setShowKOTModal(false); setShowOrdersManagementModal(true); }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 bg-slate-100 overflow-y-auto custom-scrollbar flex justify-center print:bg-white print:p-0 print:overflow-visible">
              {/* Receipt Preview */}
              <div id="kot-receipt" className="bg-white p-6 shadow-md w-[300px] font-mono text-sm text-black print:shadow-none print:w-full print:p-0">
                <div className="text-center mb-4">
                  <h1 className="text-3xl font-bold mb-2 tracking-widest">KOT</h1>
                  <p>The Tranquil Restaurant</p>
                </div>
                <div className="border-b border-dashed border-black mb-2"></div>
                <div className="mb-2 space-y-1">
                  <p>Order No: {currentOrderNumber}</p>
                  <p>{new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')}</p>
                  <p>Staff: {user?.name || 'Admin'}</p>
                  {deliveryMethod === 'dine_in' && <p>Table: {tableNo}</p>}
                  {deliveryMethod === 'room_service' && <p>Room: {roomNo}</p>}
                  {deliveryMethod === 'takeaway' && <p>Takeaway: {phone}</p>}
                  {deliveryMethod === 'delivery' && <p>Delivery: {phone}</p>}
                </div>
                <div className="border-b border-dashed border-black mb-2"></div>
                <div className="flex justify-between mb-2">
                  <span>ITEM</span>
                  <span>QTY</span>
                </div>
                <div className="border-b border-dashed border-black mb-2"></div>
                <div className="space-y-3 mb-4">
                  {(() => {
                    const isEditing = !!activeOrderId && originalOrderItems.length > 0;
                    const removedItems = isEditing
                      ? originalOrderItems.filter(orig => !cart.some(item => item.id === orig.product_id))
                      : [];
                    return (
                      <>
                        {cart.map(item => {
                          const isNew = isEditing && !originalOrderItems.some(orig => orig.product_id === item.id);
                          return (
                            <div key={item.id}>
                              <div className="flex justify-between">
                                <span className="font-bold">{item.code || item.id.slice(0,4).toUpperCase()}</span>
                                <span className="font-bold text-lg">{item.quantity}</span>
                              </div>
                              <div className="font-bold uppercase">{item.name}</div>
                              {isNew && (
                                <div className="text-xs italic mt-1 pl-2">** Newly Added Item **</div>
                              )}
                              {item.note && (
                                <div className="text-xs italic mt-1 pl-2">Note: {item.note}</div>
                              )}
                            </div>
                          );
                        })}
                        {removedItems.length > 0 && (
                          <>
                            <div className="border-b border-dashed border-black my-2"></div>
                            {removedItems.map((orig: any, idx: number) => (
                              <div key={idx}>
                                <div className="flex justify-between">
                                  <span className="font-bold">{orig.code || orig.product_id?.slice(0,4).toUpperCase()}</span>
                                  <span className="font-bold text-lg">{orig.quantity}</span>
                                </div>
                                <div className="font-bold uppercase">{orig.product_name}</div>
                                <div className="text-xs italic mt-1 pl-2">** Remove This Item **</div>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="border-b border-dashed border-black mb-1"></div>
                <div className="border-b border-dashed border-black mb-2"></div>
                <div className="text-center text-xs flex items-center justify-center gap-2">
                  <span>✂</span> CUT HERE
                </div>
                <div className="border-b border-dashed border-black mt-2"></div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white print:hidden">
              <p className="text-xs text-slate-500 max-w-[60%]">
                For 80mm receipt printer: in the print dialog choose your receipt printer and set <strong>Paper size</strong> to <strong>80mm</strong> or Receipt so the layout prints correctly.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { window.print(); }}
                  className="px-6 py-2.5 bg-[#141414] text-white rounded-lg font-medium hover:bg-black transition-colors"
                >
                  Print
                </button>
                <button
                  onClick={async () => { await fetchOrders(); setShowKOTModal(false); setShowOrdersManagementModal(true); }}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-base font-bold text-slate-900">Select Payment Method</h2>
              </div>
              <button className="text-slate-400 hover:text-slate-600"><Receipt size={18} /></button>
            </div>

            {/* Amounts */}
            <div className="px-5 pt-4 pb-3 space-y-1">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900">
                <span>Grand Total</span>
                <span>{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Total strip */}
            <div className="mx-5 mb-4 px-4 py-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">Total: LKR {total.toFixed(2)}</span>
              <span className="text-xs text-slate-500">
                {paidAmount && parseFloat(paidAmount) >= total ? (
                  <>
                    Paid: {parseFloat(paidAmount).toFixed(2)}
                    {' | '}
                    <span className="text-emerald-600 font-semibold">Change: {(parseFloat(paidAmount) - total).toFixed(2)}</span>
                  </>
                ) : (
                  <>
                    Paid: {paidAmount ? Math.max(0, parseFloat(paidAmount) || 0).toFixed(2) : '0.00'}
                    {' | '}Remaining: {paidAmount ? Math.max(0, total - (parseFloat(paidAmount) || 0)).toFixed(2) : total.toFixed(2)}
                  </>
                )}
              </span>
            </div>

            {/* Payment method grid */}
            <div className="px-5 mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'cash',           label: 'Cash',           icon: <Banknote size={20} /> },
                  { key: 'card',           label: 'Card',           icon: <CreditCard size={20} /> },
                  { key: 'online_banking', label: 'Online Banking', icon: <Landmark size={20} /> },
                  { key: 'check',          label: 'Check',          icon: <FileCheck size={20} /> },
                ] as const).map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setPaymentMethod(key)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      paymentMethod === key
                        ? 'border-slate-800 bg-slate-50 text-slate-900'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    {icon}
                    <span className="text-xs leading-tight text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Paid amount (cash) */}
            {paymentMethod === 'cash' && (
              <div className="px-5 mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Amount Received</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value)}
                  placeholder={total.toFixed(2)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
                {paidAmount && parseFloat(paidAmount) >= total && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm text-emerald-700 font-bold">
                      Change to Return: LKR {(parseFloat(paidAmount) - total).toFixed(2)}
                    </p>
                  </div>
                )}
                {paidAmount && parseFloat(paidAmount) < total && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    Insufficient amount. Still need: LKR {(total - parseFloat(paidAmount)).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Complete Payment */}
            <div className="px-5 pb-5">
              <button
                onClick={handleCheckout}
                className="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors"
              >
                Complete Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <OrdersManagementModal 
        isOpen={showOrdersManagementModal} 
        onClose={() => setShowOrdersManagementModal(false)}
        initialType={orderType}
        onEditOrder={(order) => setOriginalOrderItems(order.items || [])}
        onOpenDetails={() => navigate('/dashboard', { state: { tab: 'kot', dateFilter: 'today' } })}
      />

      {showAddItemModal && (
        <AddItemModal
          onClose={() => setShowAddItemModal(false)}
          onSaved={() => {/* products already added to store in addProduct */}}
        />
      )}

      {showCategoriesModal && (
        <CategoriesModal onClose={() => setShowCategoriesModal(false)} />
      )}

      {showManageItemsModal && (
        <ManageItemsModal onClose={() => setShowManageItemsModal(false)} />
      )}

      {showAttachItemModal && (
        <AttachItemModal onClose={() => setShowAttachItemModal(false)} />
      )}

      {completedOrder && (
        <ReceiptModal
          order={completedOrder}
          payments={completedPayments}
          showPaymentDetails={true}
          onClose={() => setCompletedOrder(null)}
        />
      )}
    </>
  );
}
