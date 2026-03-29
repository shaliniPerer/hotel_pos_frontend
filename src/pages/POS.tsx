import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, ShoppingBag, Plus, Minus, Trash2, CreditCard, Banknote, BedDouble, Receipt, TrendingUp, Menu, Sun, Moon, Play, Settings, ListOrdered, ChevronLeft, ChevronRight, ChevronDown, ShoppingCart, Pizza, UtensilsCrossed, Package, Home, Truck, X, Landmark, FileCheck } from 'lucide-react';
import OrdersManagementModal from '../components/OrdersManagementModal';
import ReceiptModal from '../components/ReceiptModal';
import AddItemModal from '../components/AddItemModal';
import CategoriesModal from '../components/CategoriesModal';
import ManageItemsModal from '../components/ManageItemsModal';
import AttachItemModal from '../components/AttachItemModal';
import AppSidebar from '../components/AppSidebar';

const PizzaPlaceholder = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
  const [showSidebar, setShowSidebar] = useState(false);
  const [showKOTBillsModal, setShowKOTBillsModal] = useState(false);
  const [selectedKOTOrder, setSelectedKOTOrder] = useState<any | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showManageItemsModal, setShowManageItemsModal] = useState(false);
  const [showAttachItemModal, setShowAttachItemModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);

  const scrollCategories = (dir: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' });
    }
  };
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [completedPayments, setCompletedPayments] = useState<any[]>([]);
  const [originalOrderItems, setOriginalOrderItems] = useState<any[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

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
    // keep activeCategory as null so "All" is selected by default
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
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase() === q;
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
    if (isSavingRef.current) return null;
    isSavingRef.current = true;
    setIsSavingOrder(true);
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
    } finally {
      isSavingRef.current = false;
      setIsSavingOrder(false);
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
      <div className={`flex h-screen font-sans overflow-hidden print:hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <AppSidebar show={showSidebar} onClose={() => setShowSidebar(false)} />

        <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Nav */}
      <header className={`h-14 flex items-center justify-between px-4 shrink-0 ${isDarkMode ? 'bg-slate-800 border-b border-slate-700' : 'bg-white border-b border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSidebar(true)}
            className={`md:hidden p-1 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'}`}
          >
            <Menu size={22} />
          </button>
          <div className="flex flex-col">
            <h1 className={`text-[15px] font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Point of Sale</h1>
            <span className="text-[9px] bg-cyan-400 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wider w-fit mt-0.5">The Tranquil</span>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className={`hidden sm:flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
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
            <button onClick={handleLogout} className="hover:text-red-600 ml-2"><LogOut size={24} /></button>
          </div>
        </div>
      </header>

      <div className={`flex flex-1 overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50/50'}`}>
        {/* Left Panel */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
            <h2 className={`text-base sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>The Tranquil Restaurant</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  clearCart();
                  setActiveOrderId(null);
                  setOriginalOrderItems([]);
                  setActiveCategory(null);
                  setSearchQuery('');
                  setIsCartOpen(false);
                }}
                className={`h-10 px-3 sm:px-5 rounded-lg flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-medium shadow-sm ${isDarkMode ? 'bg-cyan-700 hover:bg-cyan-600 text-white' : 'bg-cyan-600 hover:bg-cyan-700 text-white'}`}
              >
                <Plus size={18} /> New Order
              </button>
              <button onClick={() => { fetchOrders(); setShowOrdersManagementModal(true); }} className={`h-10 px-3 sm:px-5 rounded-lg flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-medium shadow-sm ${isDarkMode ? 'bg-slate-700 border border-slate-600 hover:bg-slate-600 text-slate-200' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}><ListOrdered size={18} /> <span className="hidden sm:inline">Orders Management</span><span className="sm:hidden">Orders</span></button>
              {/* Action dropdown */}
              <div className="relative" ref={actionMenuRef}>
                <button
                  onClick={() => setShowActionMenu(v => !v)}
                  className="h-10 px-3 sm:px-5 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 text-sm sm:text-base font-medium hover:bg-slate-50 text-slate-700 shadow-sm"
                >
                  <Settings size={18} /> <span className="hidden sm:inline">Action</span> <ChevronDown size={14} className={`transition-transform ${showActionMenu ? 'rotate-180' : ''}`} />
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
          <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
              <input type="text" placeholder="Search..." className={`w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm text-base ${isDarkMode ? 'bg-slate-700 border border-slate-600 text-white placeholder-slate-400' : 'bg-white border border-slate-200 text-slate-900'}`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => scrollCategories('left')} className={`p-2 rounded-lg shadow-sm shrink-0 ${isDarkMode ? 'bg-slate-700 border border-slate-600 hover:bg-slate-600 text-slate-200' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'}`}><ChevronLeft size={18} /></button>
              <div ref={categoryScrollRef} className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveCategory(null)} className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${!activeCategory ? (isDarkMode ? 'bg-slate-600 border-b-[3px] border-cyan-400 text-white' : 'bg-slate-100 border-b-[3px] border-slate-800 text-slate-900') : (isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-transparent' : 'bg-white text-slate-500 hover:bg-slate-50 border border-transparent')}`}>All</button>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === cat.id ? (isDarkMode ? 'bg-slate-600 border-b-[3px] border-cyan-400 text-white' : 'bg-slate-100 border-b-[3px] border-slate-800 text-slate-900') : (isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-transparent' : 'bg-white text-slate-500 hover:bg-slate-50 border border-transparent')}`}>{cat.name}</button>
                ))}
              </div>
              <button onClick={() => scrollCategories('right')} className={`p-2 rounded-lg shadow-sm shrink-0 ${isDarkMode ? 'bg-slate-700 border border-slate-600 hover:bg-slate-600 text-slate-200' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'}`}><ChevronRight size={18} /></button>
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
                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 sm:p-6 transition-colors h-full min-h-40 sm:min-h-90 ${isDarkMode ? 'border-slate-600 bg-slate-800 hover:bg-slate-700' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                <Plus size={48} className={isDarkMode ? 'text-slate-500 mb-3' : 'text-slate-400 mb-3'} />
                <span className={`font-bold text-lg ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>+ Add</span>
              </button>
              {filteredProducts.map(product => (
                <div key={product.id} className={`border rounded-xl p-3 sm:p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow h-full min-h-50 sm:min-h-65 ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                  <div className={`w-full h-20 sm:h-24 rounded-lg mb-3 flex items-center justify-center overflow-hidden border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
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
          <div className={`fixed inset-0 z-40 flex flex-col md:relative md:inset-auto md:z-auto md:w-95 md:border md:m-6 md:ml-0 md:rounded-xl md:shadow-sm md:shrink-0 ${isDarkMode ? 'bg-slate-800 md:border-slate-700' : 'bg-white md:border-slate-200'}`}>
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}><ShoppingCart size={22} /> Cart</h2>
              <div className="flex items-center gap-2">
                <button onClick={clearCart} className={`px-3 py-1.5 border rounded-lg text-xs font-medium ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>Clear Cart</button>
                <button onClick={() => setIsCartOpen(false)} className={`md:hidden p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'}`}><X size={20} /></button>
              </div>
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
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className={isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-black'}><Minus size={14} /></button>
                        <span className="font-bold text-[13px] w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className={isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-black'}><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className={`ml-1 ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p className={`text-[13px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.price.toFixed(2)} &times; {item.quantity}</p>
                  

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
              disabled={cart.length === 0 || isSavingOrder} 
              onClick={async () => {
                if (activeOrderId) {
                  // Editing existing order — skip delivery modal, save & show KOT directly
                 
                  const saved = await handleSaveOrder(orderType, orderReference);
                  if (saved) {
                    setCurrentOrderNumber(saved.order_number ? `KOT-${String(saved.order_number).padStart(3, '0')}` : `KOT-${orderReference}`);
                    // Reset KOT Bills modal so it doesn't bleed through
                    setShowKOTBillsModal(false);
                    setSelectedKOTOrder(null);
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
        </div>{/* end flex-col flex-1 inner wrapper */}
    </div>

      {/* Delivery Method Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                      <input
                        type="text"
                        inputMode="numeric"
                        value={tableNo}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setTableNo(v.replace(/^0+/, '') );
                        }}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">No. of Pax</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={pax}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setPax(v.replace(/^0+/, ''));
                        }}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
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
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Room No</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={roomNo}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setRoomNo(v.replace(/^0+/, ''));
                        }}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Running Rooms</label>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const occupiedRooms = orders
                            .filter(o => o.type === 'room' && o.status === 'active')
                            .map(o => o.reference);
                          return occupiedRooms.length === 0
                            ? <span className="text-sm text-slate-400">No rooms occupied</span>
                            : occupiedRooms.map((rm, i) => (
                              <span key={i} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm">{rm}</span>
                            ));
                        })()}
                      </div>
                    </div>

                    {roomNo && orders.some(o => o.type === 'room' && o.status === 'active' && o.reference === roomNo) && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium">
                        ⚠ Room {roomNo} already has an active order. Please finish or void the existing order first.
                      </div>
                    )}
                  </>
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

                  // Block if room is already occupied
                  if (type === 'room' && orders.some(o => o.type === 'room' && o.status === 'active' && o.reference === roomNo)) {
                    return;
                  }

                  setOrderType(type as any, reference);
                  // Clear stale original items so the KOT always shows full items for a new order
                  setOriginalOrderItems([]);
                  const saved = await handleSaveOrder(type, reference);
                  if (saved) {
                    setCurrentOrderNumber(saved.order_number ? `KOT-${String(saved.order_number).padStart(3, '0')}` : `KOT-${reference}`);
                    // Reset KOT Bills modal so it doesn't bleed through
                    setShowKOTBillsModal(false);
                    setSelectedKOTOrder(null);
                    setShowDeliveryModal(false);
                    setShowKOTModal(true);
                  }
                }}
                disabled={isSavingOrder || (deliveryMethod === 'dine_in' && !!tableNo && orders.some(o => o.type === 'table' && o.status === 'active' && o.reference === tableNo)) || (deliveryMethod === 'room_service' && !!roomNo && orders.some(o => o.type === 'room' && o.status === 'active' && o.reference === roomNo))}
                className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isSavingOrder ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KOT Modal */}
      {showKOTModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:bg-transparent print:backdrop-blur-none print:p-0">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-auto print:max-w-none">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center print:hidden">
              <h2 className="text-lg font-bold text-slate-800">KOT - {currentOrderNumber}</h2>
              <button onClick={() => { setShowKOTModal(false); }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 bg-slate-100 overflow-y-auto custom-scrollbar flex justify-center items-start print:bg-white print:p-0 print:overflow-visible">
              {/* Receipt Preview */}
              <div id="kot-receipt" className="bg-white shadow-md print:shadow-none print:w-full mx-auto" style={{ width: '80mm', maxWidth: '100%', fontFamily: 'Arial, sans-serif', fontSize: '13px', padding: '20px' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '22px', letterSpacing: '4px', marginBottom: '4px' }}>KOT</div>
                  <div style={{ fontSize: '13px' }}>The Tranquil Restaurant</div>
                </div>
                <div style={{ borderBottom: '1px dashed #000', marginBottom: '8px' }}></div>
                {/* Order info */}
                <div style={{ marginBottom: '8px', lineHeight: '1.6' }}>
                  <div>Order No: {currentOrderNumber}</div>
                  <div>{new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')}</div>
                  <div>Staff: {user?.name || 'Admin'}</div>
                  {deliveryMethod === 'dine_in' && <div>Table: {tableNo}</div>}
                  {deliveryMethod === 'dine_in' && pax && <div>Pax: {pax}</div>}
                  {deliveryMethod === 'room_service' && <div>Room: {roomNo}</div>}
                  {deliveryMethod === 'takeaway' && <div>Takeaway: {phone}</div>}
                  {deliveryMethod === 'delivery' && <div>Delivery: {phone}</div>}
                </div>
                <div style={{ borderBottom: '1px dashed #000', marginBottom: '8px' }}></div>
                {/* Column headers */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>
                  <span>ITEM</span>
                  <span>QTY</span>
                </div>
                <div style={{ borderBottom: '1px dashed #000', marginBottom: '8px' }}></div>
                {/* Items */}
                <div style={{ marginBottom: '10px' }}>
                  {(() => {
                    const isEditing = !!activeOrderId && originalOrderItems.length > 0;

                    if (!isEditing) {
                      // New order — show all cart items
                      return cart.map(item => (
                        <div key={item.id} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>{item.code || item.id.slice(0,4).toUpperCase()}</span>
                            <span style={{ fontSize: '15px' }}>{item.quantity}</span>
                          </div>
                          <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{item.name}</div>
                          {item.note && <div style={{ fontSize: '12px', fontStyle: 'italic', paddingLeft: '8px' }}>Note: {item.note}</div>}
                        </div>
                      ));
                    }

                    // Updating existing order — show only changes
                    const addedItems: React.ReactNode[] = [];
                    const removedLines: React.ReactNode[] = [];

                    cart.forEach(item => {
                      const orig = originalOrderItems.find((o: any) => o.product_id === item.id);
                      if (!orig) {
                        // Brand new item
                        addedItems.push(
                          <div key={item.id} style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                              <span>{item.code || item.id.slice(0,4).toUpperCase()}</span>
                              <span style={{ fontSize: '15px' }}>{item.quantity}</span>
                            </div>
                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{item.name}</div>
                            {item.note && <div style={{ fontSize: '12px', fontStyle: 'italic', paddingLeft: '8px' }}>Note: {item.note}</div>}
                          </div>
                        );
                      } else if (item.quantity > orig.quantity) {
                        // Quantity increased — show only the additional qty
                        const diff = item.quantity - orig.quantity;
                        addedItems.push(
                          <div key={item.id} style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                              <span>{item.code || item.id.slice(0,4).toUpperCase()}</span>
                              <span style={{ fontSize: '15px' }}>+{diff}</span>
                            </div>
                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{item.name}</div>
                            {item.note && <div style={{ fontSize: '12px', fontStyle: 'italic', paddingLeft: '8px' }}>Note: {item.note}</div>}
                          </div>
                        );
                      } else if (item.quantity < orig.quantity) {
                        // Quantity decreased
                        const diff = orig.quantity - item.quantity;
                        removedLines.push(
                          <div key={item.id} style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                              <span>{item.code || item.id.slice(0,4).toUpperCase()}</span>
                              <span style={{ fontSize: '15px' }}>-{diff}</span>
                            </div>
                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{item.name}</div>
                            <div style={{ fontSize: '12px', fontStyle: 'italic', paddingLeft: '8px' }}>** Reduce Qty **</div>
                          </div>
                        );
                      }
                    });

                    // Items fully removed from cart
                    originalOrderItems.forEach((orig: any) => {
                      if (!cart.some(item => item.id === orig.product_id)) {
                        removedLines.push(
                          <div key={orig.product_id} style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                              <span>{orig.code || orig.product_id?.slice(0,4).toUpperCase()}</span>
                              <span style={{ fontSize: '15px' }}>-{orig.quantity}</span>
                            </div>
                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{orig.product_name}</div>
                            <div style={{ fontSize: '12px', fontStyle: 'italic', paddingLeft: '8px' }}>** Remove This Item **</div>
                          </div>
                        );
                      }
                    });

                    return (
                      <>
                        {addedItems}
                        {removedLines.length > 0 && (
                          <>
                            {addedItems.length > 0 && <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>}
                            {removedLines}
                          </>
                        )}
                        {addedItems.length === 0 && removedLines.length === 0 && (
                          // No diff — show all items as a reprint so the KOT is never blank
                          cart.map(item => (
                            <div key={item.id} style={{ marginBottom: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                <span>{item.code || item.id.slice(0,4).toUpperCase()}</span>
                                <span style={{ fontSize: '15px' }}>{item.quantity}</span>
                              </div>
                              <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{item.name}</div>
                              {item.note && <div style={{ fontSize: '12px', fontStyle: 'italic', paddingLeft: '8px' }}>Note: {item.note}</div>}
                            </div>
                          ))
                        )}
                      </>
                    );
                  })()}
                </div>
                <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }}></div>
                <div style={{ borderBottom: '1px dashed #000' }}></div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white print:hidden">
              <p className="text-xs text-slate-500 hidden sm:block max-w-[60%]">
                For 80mm receipt printer: in the print dialog choose your receipt printer and set <strong>Paper size</strong> to <strong>80mm</strong> or Receipt so the layout prints correctly.
              </p>
              <div className="flex gap-3 sm:justify-end">
                <button
                  onClick={() => { window.print(); }}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#141414] text-white rounded-lg font-medium hover:bg-black transition-colors"
                >
                  Print
                </button>
                <button
                  onClick={() => { setShowKOTModal(false); }}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KOT Bills Modal */}
      {showKOTBillsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {selectedKOTOrder && (
                  <button onClick={() => setSelectedKOTOrder(null)} className="text-slate-400 hover:text-slate-700">
                    <ChevronLeft size={22} />
                  </button>
                )}
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedKOTOrder ? `KOT — ${selectedKOTOrder.order_number}` : 'KOT Bills'}
                  </h2>
                  {!selectedKOTOrder && <p className="text-sm text-slate-500 mt-0.5">All kitchen order tickets</p>}
                </div>
              </div>
              <button onClick={() => { setShowKOTBillsModal(false); setSelectedKOTOrder(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            {/* Body — list view */}
            {!selectedKOTOrder && (
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                {orders.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">No KOT bills found</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {[...orders]
                      .filter(o => o.status === 'active')
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map(order => {
                        const typeLabel: Record<string, string> = {
                          table: 'Dine-In', room: 'Room', takeaway: 'Takeaway', delivery: 'Delivery'
                        };
                        const refLabel: Record<string, string> = {
                          table: 'Table', room: 'Room', takeaway: 'Takeaway', delivery: 'Delivery'
                        };
                        const statusColor: Record<string, string> = {
                          active: 'bg-green-100 text-green-700',
                          completed: 'bg-blue-100 text-blue-700',
                          void: 'bg-red-100 text-red-700',
                        };
                        const dateStr = new Date(order.created_at).toLocaleString('en-GB', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        }).replace(',', '');
                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedKOTOrder(order)}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 shadow-sm cursor-pointer hover:border-slate-400 hover:shadow-md transition-all"
                          >
                            <div className="text-base font-bold text-slate-900 tracking-wide">{order.order_number}</div>
                            <div className="text-xs text-slate-500">{dateStr}</div>
                            <div className="text-xs font-semibold text-slate-800">
                              {typeLabel[order.type] || order.type}
                              {order.reference ? ` · ${refLabel[order.type] || ''} ${order.reference}`.trim() : ''}
                            </div>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full self-start ${statusColor[order.status] || 'bg-slate-100 text-slate-600'}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Body — KOT bill detail view */}
            {selectedKOTOrder && (
              <div className="p-6 bg-slate-100 overflow-y-auto custom-scrollbar flex-1 flex justify-center items-start">
                <div id="kot-bills-receipt" className="bg-white shadow-md print:shadow-none print:w-full mx-auto" style={{ width: '80mm', maxWidth: '100%', fontFamily: 'Arial, sans-serif', fontSize: '13px', padding: '20px' }}>
                  {/* Header */}
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '22px', letterSpacing: '4px', marginBottom: '4px' }}>KOT</div>
                    <div style={{ fontSize: '13px' }}>The Tranquil Restaurant</div>
                  </div>
                  <div style={{ borderBottom: '1px dashed #000', marginBottom: '8px' }}></div>
                  {/* Order info */}
                  <div style={{ marginBottom: '8px', lineHeight: '1.6' }}>
                    <div>Order No: {selectedKOTOrder.order_number}</div>
                    <div>{new Date(selectedKOTOrder.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')}</div>
                    {selectedKOTOrder.type === 'table' && <div>Table: {selectedKOTOrder.reference}</div>}
                    {selectedKOTOrder.type === 'room' && <div>Room: {selectedKOTOrder.reference}</div>}
                    {selectedKOTOrder.type === 'takeaway' && <div>Takeaway: {selectedKOTOrder.reference}</div>}
                    {selectedKOTOrder.type === 'delivery' && <div>Delivery: {selectedKOTOrder.reference}</div>}
                  </div>
                  <div style={{ borderBottom: '1px dashed #000', marginBottom: '8px' }}></div>
                  {/* Column headers */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>
                    <span>ITEM</span>
                    <span>QTY</span>
                  </div>
                  <div style={{ borderBottom: '1px dashed #000', marginBottom: '8px' }}></div>
                  {/* Items */}
                  <div style={{ marginBottom: '10px' }}>
                    {(selectedKOTOrder.items || []).map((item: any) => (
                      <div key={item.id} style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span>{item.product_id?.slice(0, 4).toUpperCase()}</span>
                          <span style={{ fontSize: '15px' }}>{item.quantity}</span>
                        </div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{item.product_name}</div>
                      </div>
                    ))}
                    {(!selectedKOTOrder.items || selectedKOTOrder.items.length === 0) && (
                      <div style={{ textAlign: 'center', color: '#666' }}>No items</div>
                    )}
                  </div>
                  <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }}></div>
                  <div style={{ borderBottom: '1px dashed #000' }}></div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white">
              {selectedKOTOrder ? (
                <>
                  <button
                    onClick={() => setSelectedKOTOrder(null)}
                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-black transition-colors"
                  >
                    Print
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setShowKOTBillsModal(false); setSelectedKOTOrder(null); }}
                  className="ml-auto px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-black transition-colors"
                >
                  Close
                </button>
              )}
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
        onOpenDetails={() => { fetchOrders(); setShowOrdersManagementModal(false); setShowKOTBillsModal(true); }}
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
