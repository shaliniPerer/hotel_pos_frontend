import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  ShoppingCart, LogOut, TrendingUp, DollarSign, 
  ReceiptText, BarChart3, Calendar, Download, FileText, CreditCard, ChefHat, ChevronDown, Menu, X,
  CalendarDays, Phone, Clock, Users, Printer, Ban, Trash2
} from 'lucide-react';
import PieChart from '../components/PieChart';

type DateFilter = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom';

interface ItemSalesData {
  product_name: string;
  quantity: number;
  total_amount: number;
}

interface PaymentData {
  payment_method: string;
  order_count: number;
  total_amount: number;
}

interface KOTData {
  order_id: string;
  order_number: string;
  table_no?: string;
  room_no?: string;
  items: Array<{ product_name: string; quantity: number }>;
  created_at: string;
  status: string;
}

interface CategorySalesData {
  name: string;
  color: string;
  itemCount: number;
  totalValue: number;
}

interface EventBooking {
  id: string;
  customer_name: string;
  customer_phone: string;
  event_date: string;
  event_time: string;
  pax: number;
  function_name: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  total: number;
  advance_payment: number;
  balance: number;
  payment_method: string;
  payment_status: 'pending' | 'advance' | 'full';
  status: 'upcoming' | 'completed' | 'void';
  notes: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, token, logout, products, categories, fetchProducts, fetchCategories, apiFetch } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showSidebar, setShowSidebar] = useState(false);
  // Real-time stats
  const [totalSales, setTotalSales] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);

  // Analytics data
  const navState = (location.state as any) || {};
  const [activeTab, setActiveTab] = useState<'item_sales' | 'payments' | 'kot' | 'events'>(navState.tab || 'item_sales');
  const [dateFilter, setDateFilter] = useState<DateFilter>(navState.dateFilter || 'today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [itemSales, setItemSales] = useState<ItemSalesData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [kotOrders, setKotOrders] = useState<KOTData[]>([]);
  const [eventBookings, setEventBookings] = useState<EventBooking[]>([]);
  const [eventStatusFilter, setEventStatusFilter] = useState<'all' | 'upcoming' | 'completed' | 'void'>('all');
  const [viewingEventBooking, setViewingEventBooking] = useState<EventBooking | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'cashier') {
      navigate('/');
      return;
    }
    
    fetchProducts();
    fetchCategories();
    fetchDashboardStats();
    fetchReportData();
    fetchEventBookings();
  }, [token, user]);

  useEffect(() => {
    if (token) {
      fetchReportData();
    }
  }, [dateFilter, startDate, endDate, activeTab]);

  const fetchEventBookings = async () => {
    try {
      const res = await apiFetch('/api/events/bookings');
      if (res.ok) setEventBookings(await res.json());
    } catch (e) {
      console.error('Failed to fetch event bookings:', e);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await apiFetch('/api/orders');
      if (res.ok) {
        const orders = await res.json();
        
        const today = new Date().toISOString().split('T')[0];
        
        // Calculate totals
        const completed = orders.filter((o: any) => o.status === 'completed');
        const pending = orders.filter((o: any) => o.status === 'pending');
        const todayCompletedOrders = completed.filter((o: any) => o.created_at?.split('T')[0] === today);
        
        setTotalOrders(orders.length);
        setCompletedOrders(completed.length);
        setPendingOrders(pending.length);
        setTodayOrders(todayCompletedOrders.length);
        
        const totalSalesAmount = completed.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        const todaySalesAmount = todayCompletedOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        
        setTotalSales(totalSalesAmount);
        setTodaySales(todaySalesAmount);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  };

  const getDateRange = (filter: DateFilter): { start: string; end: string } => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    switch (filter) {
      case 'today':
        return { start: today, end: today };
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        return { start: yesterdayStr, end: yesterdayStr };
      }
      case 'this_week': {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - now.getDay());
        return { start: weekStart.toISOString().split('T')[0], end: today };
      }
      case 'this_month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart.toISOString().split('T')[0], end: today };
      }
      case 'last_month': {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return { 
          start: lastMonthStart.toISOString().split('T')[0], 
          end: lastMonthEnd.toISOString().split('T')[0] 
        };
      }
      case 'custom':
        return { start: startDate, end: endDate };
      default:
        return { start: today, end: today };
    }
  };

  const fetchReportData = async () => {
    if (!token) return;
    
    setLoading(true);
    const { start, end } = getDateRange(dateFilter);
    
    if (dateFilter === 'custom' && (!startDate || !endDate)) {
      setLoading(false);
      return;
    }

    try {
      if (activeTab === 'item_sales') {
        const res = await apiFetch(`/api/reports/item-sales?start_date=${start}&end_date=${end}`);
        if (res.ok) {
          const data = await res.json();
          setItemSales(data);
        }
      } else if (activeTab === 'payments') {
        const res = await apiFetch(`/api/reports/payments?start_date=${start}&end_date=${end}`);
        if (res.ok) {
          const data = await res.json();
          setPayments(data);
        }
      } else if (activeTab === 'kot') {
        const res = await apiFetch(`/api/reports/kot?start_date=${start}&end_date=${end}`);
        if (res.ok) {
          const data = await res.json();
          setKotOrders(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Calculate category sales data from item sales
  const categorySalesData: CategorySalesData[] = categories.map(category => {
    const categoryProducts = products.filter(p => p.category_id === category.id);
    const productNames = categoryProducts.map(p => p.name);
    
    const categorySales = itemSales.filter(sale => 
      productNames.some(name => sale.product_name.includes(name))
    );
    
    const totalValue = categorySales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const itemCount = categorySales.length;
    
    return {
      name: category.name,
      color: category.color,
      itemCount,
      totalValue,
    };
  }).filter(c => c.totalValue > 0);

  const maxCategoryValue = Math.max(...categorySalesData.map(c => c.totalValue), 1);
  const chartHeight = 300;

  // Pie chart data
  const itemSalesPieData = itemSales.slice(0, 5).map((item, idx) => {
    const colors = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return {
      label: item.product_name,
      value: item.total_amount,
      color: colors[idx % colors.length],
    };
  });

  const paymentsPieData = payments.map((payment, idx) => {
    const colors = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    return {
      label: payment.payment_method,
      value: payment.total_amount,
      color: colors[idx % colors.length],
    };
  });

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Mobile Sidebar Backdrop */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${
        showSidebar ? 'flex' : 'hidden'
      } md:flex flex-col w-64 bg-slate-900 text-slate-300 fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-auto shrink-0`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white leading-tight">
            The Tranquil Restaurant
          </h1>
          <button onClick={() => setShowSidebar(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 rounded-xl transition-colors">
            <ShoppingCart size={20} />
            <span className="font-medium">POS Terminal</span>
          </Link>
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-cyan-600 text-white rounded-xl transition-colors">
            <TrendingUp size={20} />
            <span className="font-medium">Dashboard & Analytics</span>
          </Link>
          <Link to="/events" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 rounded-xl transition-colors">
            <Calendar size={20} />
            <span className="font-medium">Event Management</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-6 flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(true)}
            className="md:hidden text-slate-600 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100"
          >
            <Menu size={22} />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Dashboard & Analytics</h2>
            <p className="text-slate-500 text-xs md:text-sm mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </header>

        <main className="p-4 md:p-8">
          {/* Stats Cards - 6 Cards in 1 row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-cyan-100 text-cyan-600 rounded-xl">
                  <DollarSign size={18} />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase">Total Sales</p>
                  <p className="text-sm md:text-lg font-bold text-slate-800">LKR {totalSales.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                  <DollarSign size={18} />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase">Today's Sales</p>
                  <p className="text-sm md:text-lg font-bold text-slate-800">LKR {todaySales.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-slate-100 text-slate-600 rounded-xl">
                  <ReceiptText size={18} />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase">Total Orders</p>
                  <p className="text-sm md:text-lg font-bold text-slate-800">{totalOrders}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-cyan-100 text-cyan-600 rounded-xl">
                  <ReceiptText size={18} />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase">Today Orders</p>
                  <p className="text-sm md:text-lg font-bold text-slate-800">{todayOrders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-amber-100 text-amber-600 rounded-xl">
                  <ReceiptText size={18} />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase">Pending</p>
                  <p className="text-sm md:text-lg font-bold text-slate-800">{pendingOrders}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                  <ReceiptText size={18} />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase">Completed</p>
                  <p className="text-sm md:text-lg font-bold text-slate-800">{completedOrders}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Food Categories Bar Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 md:mb-8 p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 uppercase">Sales by Food Categories</h3>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-slate-600">
                  {categorySalesData.length > 0 
                    ? `${categorySalesData.length} Categories` 
                    : 'No data'}
                </span>
              </div>
            </div>
            
            {categorySalesData.length > 0 ? (
              <div className="relative" style={{ height: `${chartHeight}px` }}>
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-slate-500 w-16">
                  <span>{maxCategoryValue.toLocaleString()}</span>
                  <span>{(maxCategoryValue * 0.8).toLocaleString()}</span>
                  <span>{(maxCategoryValue * 0.6).toLocaleString()}</span>
                  <span>{(maxCategoryValue * 0.4).toLocaleString()}</span>
                  <span>{(maxCategoryValue * 0.2).toLocaleString()}</span>
                  <span>0</span>
                </div>
                
                <div className="ml-20 h-full flex items-end justify-around gap-3">
                  {categorySalesData.map((category, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 max-w-30">
                      <div className="w-full flex items-end justify-center" style={{ height: `${chartHeight - 50}px` }}>
                        <div
                          className="hover:opacity-80 transition-all rounded-t cursor-pointer"
                          style={{ 
                            height: `${(category.totalValue / maxCategoryValue) * 100}%`,
                            width: '100%',
                            maxWidth: '80px',
                            backgroundColor: category.color || '#06b6d4',
                            minHeight: category.totalValue > 0 ? '5px' : '0'
                          }}
                          title={`${category.name}\nValue: LKR ${category.totalValue.toLocaleString()}`}
                        ></div>
                      </div>
                      <div className="text-xs text-slate-700 font-medium text-center leading-tight">
                        {category.name}
                      </div>
                      <div className="text-xs font-semibold text-cyan-600">
                        LKR {category.totalValue.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <BarChart3 size={48} className="mb-3 opacity-30" />
                <p className="text-sm">No sales data available for selected date range</p>
              </div>
            )}
          </div>

          {/* Analytics Reports Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-8">
            <div className="border-b border-slate-100 px-6 py-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-lg font-bold text-slate-800 uppercase">Sales Reports</h3>
                
                {/* Date Filter */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Calendar size={16} />
                      <span className="capitalize">{dateFilter.replace('_', ' ')}</span>
                      <ChevronDown size={16} />
                    </button>
                    
                    {showDatePicker && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-10">
                        <button
                          onClick={() => { setDateFilter('today'); setShowDatePicker(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-sm"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => { setDateFilter('yesterday'); setShowDatePicker(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-sm"
                        >
                          Yesterday
                        </button>
                        <button
                          onClick={() => { setDateFilter('this_week'); setShowDatePicker(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-sm"
                        >
                          This Week
                        </button>
                        <button
                          onClick={() => { setDateFilter('this_month'); setShowDatePicker(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-sm"
                        >
                          This Month
                        </button>
                        <button
                          onClick={() => { setDateFilter('last_month'); setShowDatePicker(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-sm"
                        >
                          Last Month
                        </button>
                        <div className="border-t border-slate-200 my-2"></div>
                        <button
                          onClick={() => { setDateFilter('custom'); setShowDatePicker(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-sm"
                        >
                          Custom Range
                        </button>
                        
                        {dateFilter === 'custom' && (
                          <div className="mt-2 p-2 space-y-2">
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                            />
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => setActiveTab('item_sales')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'item_sales'
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText size={16} />
                  Item Sales
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'payments'
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CreditCard size={16} />
                  Payments
                </button>
                <button
                  onClick={() => setActiveTab('kot')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'kot'
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ChefHat size={16} />
                  Kitchen (KOT)
                </button>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'events'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CalendarDays size={16} />
                  Event Bookings
                </button>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
              ) : (
                <>
                  {/* Item Sales Report */}
                  {activeTab === 'item_sales' && (
                    <>
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={() => downloadCSV(itemSales, 'item_sales.csv')}
                          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Download size={16} />
                          Download CSV
                        </button>
                      </div>
                      
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-cyan-600 text-white text-sm">
                              <th className="px-6 py-4 font-semibold">Product Name</th>
                              <th className="px-6 py-4 font-semibold text-right">Quantity</th>
                              <th className="px-6 py-4 font-semibold text-right">Total Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {itemSales.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-800">{item.product_name}</td>
                                <td className="px-6 py-4 text-sm text-slate-800 text-right">{item.quantity}</td>
                                <td className="px-6 py-4 text-sm text-slate-800 text-right">LKR {item.total_amount.toFixed(2)}</td>
                              </tr>
                            ))}
                            {itemSales.length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No data available</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {itemSalesPieData.length > 0 && (
                        <div className="flex justify-center">
                          <PieChart data={itemSalesPieData} title="Top 5 Items by Sales" />
                        </div>
                      )}
                    </>
                  )}

                  {/* Payments Report */}
                  {activeTab === 'payments' && (
                    <>
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={() => downloadCSV(payments, 'payments.csv')}
                          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Download size={16} />
                          Download CSV
                        </button>
                      </div>
                      
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-cyan-600 text-white text-sm">
                              <th className="px-6 py-4 font-semibold">Payment Method</th>
                              <th className="px-6 py-4 font-semibold text-right">Order Count</th>
                              <th className="px-6 py-4 font-semibold text-right">Total Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {payments.map((payment, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-800 capitalize">{payment.payment_method}</td>
                                <td className="px-6 py-4 text-sm text-slate-800 text-right">{payment.order_count}</td>
                                <td className="px-6 py-4 text-sm text-slate-800 text-right">LKR {payment.total_amount.toFixed(2)}</td>
                              </tr>
                            ))}
                            {payments.length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No data available</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {paymentsPieData.length > 0 && (
                        <div className="flex justify-center">
                          <PieChart data={paymentsPieData} title="Payment Methods Distribution" />
                        </div>
                      )}
                    </>
                  )}

                  {/* Event Bookings */}
                  {activeTab === 'events' && (() => {
                    const filtered = eventStatusFilter === 'all'
                      ? eventBookings
                      : eventBookings.filter(b => b.status === eventStatusFilter);
                    const upcoming = eventBookings.filter(b => b.status === 'upcoming');
                    const advanceTotal = eventBookings.reduce((s, b) => s + (b.advance_payment || 0), 0);
                    const balanceTotal = upcoming.reduce((s, b) => s + (b.balance || 0), 0);

                    const printPDF = (b: EventBooking) => {
                      const win = window.open('', '_blank', 'width=800,height=900');
                      if (!win) return;
                      win.document.write(`<!DOCTYPE html><html><head><title>Event Booking - ${b.customer_name}</title>
                      <style>
                        body{font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:30px;color:#1e293b;}
                        .header{text-align:center;border-bottom:3px solid #7c3aed;padding-bottom:20px;margin-bottom:24px;}
                        .hotel-name{font-size:28px;font-weight:700;color:#7c3aed;margin-bottom:4px;}
                        .doc-title{font-size:16px;color:#64748b;margin-top:8px;}
                        .section{margin-bottom:20px;}
                        .section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7c3aed;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:12px;}
                        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
                        .field label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;}
                        .field p{font-size:14px;font-weight:600;color:#1e293b;margin:2px 0 0;}
                        table{width:100%;border-collapse:collapse;font-size:13px;}
                        th{background:#7c3aed;color:white;padding:10px;text-align:left;}
                        td{padding:9px 10px;border-bottom:1px solid #f1f5f9;}
                        tr:last-child td{border-bottom:none;}
                        .totals{background:#f8fafc;border-radius:8px;padding:16px;}
                        .total-row{display:flex;justify-content:space-between;padding:4px 0;}
                        .total-row.grand{font-size:16px;font-weight:700;color:#7c3aed;border-top:2px solid #7c3aed;margin-top:8px;padding-top:8px;}
                        .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;}
                        .badge.upcoming{background:#ede9fe;color:#6d28d9;}
                        .badge.completed{background:#d1fae5;color:#065f46;}
                        .badge.void{background:#fee2e2;color:#991b1b;}
                        @media print{body{padding:15px;}}
                      </style></head><body>
                      <div class="header">
                        <div class="hotel-name">HotelMate</div>
                        <div class="doc-title">EVENT BOOKING CONFIRMATION</div>
                        <div style="font-size:12px;color:#94a3b8;margin-top:6px;">Booking ID: ${b.id} &nbsp;|&nbsp; ${new Date(b.created_at).toLocaleDateString()}</div>
                      </div>
                      <div class="section">
                        <div class="section-title">Customer Details</div>
                        <div class="grid">
                          <div class="field"><label>Customer Name</label><p>${b.customer_name}</p></div>
                          <div class="field"><label>Phone</label><p>${b.customer_phone}</p></div>
                          <div class="field"><label>Event Date</label><p>${b.event_date}</p></div>
                          <div class="field"><label>Event Time</label><p>${b.event_time}</p></div>
                          <div class="field"><label>PAX</label><p>${b.pax} persons</p></div>
                          <div class="field"><label>Status</label><p><span class="badge ${b.status}">${b.status.charAt(0).toUpperCase()+b.status.slice(1)}</span></p></div>
                        </div>
                      </div>
                      <div class="section">
                        <div class="section-title">Function Package: ${b.function_name}</div>
                        <table><thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
                        <tbody>${b.items.map(item=>`<tr><td>${item.name}</td><td>${item.quantity}</td><td style="text-align:right">LKR ${item.price.toFixed(2)}</td><td style="text-align:right">LKR ${(item.price*item.quantity).toFixed(2)}</td></tr>`).join('')}</tbody></table>
                      </div>
                      <div class="section totals">
                        <div class="total-row"><span>Subtotal</span><span>LKR ${b.total.toFixed(2)}</span></div>
                        <div class="total-row"><span>Advance Paid</span><span style="color:#059669">LKR ${(b.advance_payment||0).toFixed(2)}</span></div>
                        <div class="total-row grand"><span>Balance Due</span><span>LKR ${(b.balance||0).toFixed(2)}</span></div>
                        <div class="total-row" style="margin-top:8px;font-size:12px;color:#64748b"><span>Payment Method</span><span>${b.payment_method}</span></div>
                        <div class="total-row" style="font-size:12px;color:#64748b"><span>Payment Status</span><span>${b.payment_status}</span></div>
                      </div>
                      ${b.notes ? `<div class="section"><div class="section-title">Notes</div><p style="font-size:14px;color:#475569">${b.notes}</p></div>` : ''}
                      <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:30px;border-top:1px solid #e2e8f0;padding-top:16px;">Thank you for choosing HotelMate &mdash; Generated ${new Date().toLocaleString()}</div>
                      </body></html>`);
                      win.document.close();
                      setTimeout(() => win.print(), 400);
                    };

                    return (
                      <>
                        {/* Event Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-violet-700">{upcoming.length}</div>
                            <div className="text-sm text-violet-600 mt-1">Upcoming Events</div>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-emerald-700">LKR {advanceTotal.toLocaleString()}</div>
                            <div className="text-sm text-emerald-600 mt-1">Advance Collected</div>
                          </div>
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-amber-700">LKR {balanceTotal.toLocaleString()}</div>
                            <div className="text-sm text-amber-600 mt-1">Balance Pending</div>
                          </div>
                        </div>

                        {/* Status Filter */}
                        <div className="flex gap-2 mb-4 flex-wrap">
                          {(['all','upcoming','completed','void'] as const).map(s => (
                            <button key={s} onClick={() => setEventStatusFilter(s)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${eventStatusFilter === s ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                              {s.charAt(0).toUpperCase()+s.slice(1)}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              const csvData = filtered.map(b => ({
                                customer_name: b.customer_name, phone: b.customer_phone,
                                event_date: b.event_date, event_time: b.event_time,
                                function_name: b.function_name, pax: b.pax,
                                total: b.total, advance: b.advance_payment,
                                balance: b.balance, payment_status: b.payment_status, status: b.status
                              }));
                              downloadCSV(csvData, 'event_bookings.csv');
                            }}
                            className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <Download size={14} /> Download CSV
                          </button>
                        </div>

                        {/* Bookings Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-violet-600 text-white text-sm">
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
                                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{b.customer_name}</td>
                                  <td className="px-4 py-3 text-sm text-slate-600">{b.customer_phone}</td>
                                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{b.event_date}<br/><span className="text-xs text-slate-400">{b.event_time}</span></td>
                                  <td className="px-4 py-3 text-sm text-slate-700">{b.function_name}</td>
                                  <td className="px-4 py-3 text-sm text-slate-700 text-center">{b.pax}</td>
                                  <td className="px-4 py-3 text-sm text-slate-800 text-right font-medium">LKR {b.total.toLocaleString()}</td>
                                  <td className="px-4 py-3 text-sm text-right font-semibold text-amber-600">LKR {(b.balance||0).toLocaleString()}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      b.status === 'upcoming' ? 'bg-violet-100 text-violet-700' :
                                      b.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                      'bg-red-100 text-red-700'}`}>
                                      {b.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => setViewingEventBooking(b)}
                                        className="p-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg transition-colors" title="View PDF">
                                        <FileText size={14} />
                                      </button>
                                      <button onClick={() => printPDF(b)}
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors" title="Print">
                                        <Printer size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {filtered.length === 0 && (
                                <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-500">No event bookings found</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Booking View Modal */}
                        {viewingEventBooking && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                              <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white p-6 rounded-t-2xl">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h2 className="text-xl font-bold">Event Booking Details</h2>
                                    <p className="text-violet-200 text-sm mt-1">ID: {viewingEventBooking.id}</p>
                                  </div>
                                  <button onClick={() => setViewingEventBooking(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={20} /></button>
                                </div>
                              </div>
                              <div className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                  <div><span className="text-xs text-slate-500 uppercase tracking-wide">Customer</span><p className="font-semibold text-slate-800 mt-0.5">{viewingEventBooking.customer_name}</p></div>
                                  <div><span className="text-xs text-slate-500 uppercase tracking-wide">Phone</span><p className="font-semibold text-slate-800 mt-0.5">{viewingEventBooking.customer_phone}</p></div>
                                  <div><span className="text-xs text-slate-500 uppercase tracking-wide">Event Date</span><p className="font-semibold text-slate-800 mt-0.5">{viewingEventBooking.event_date}</p></div>
                                  <div><span className="text-xs text-slate-500 uppercase tracking-wide">Event Time</span><p className="font-semibold text-slate-800 mt-0.5">{viewingEventBooking.event_time}</p></div>
                                  <div><span className="text-xs text-slate-500 uppercase tracking-wide">PAX</span><p className="font-semibold text-slate-800 mt-0.5">{viewingEventBooking.pax} persons</p></div>
                                  <div><span className="text-xs text-slate-500 uppercase tracking-wide">Status</span>
                                    <p className="mt-0.5"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${viewingEventBooking.status === 'upcoming' ? 'bg-violet-100 text-violet-700' : viewingEventBooking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{viewingEventBooking.status}</span></p>
                                  </div>
                                </div>
                                <div>
                                  <h3 className="text-sm font-semibold text-violet-700 uppercase tracking-wide mb-2 pb-1 border-b border-slate-200">Function: {viewingEventBooking.function_name}</h3>
                                  <table className="w-full text-sm"><thead><tr className="bg-violet-50"><th className="px-3 py-2 text-left text-xs font-semibold text-violet-700">Item</th><th className="px-3 py-2 text-center text-xs font-semibold text-violet-700">Qty</th><th className="px-3 py-2 text-right text-xs font-semibold text-violet-700">Price</th><th className="px-3 py-2 text-right text-xs font-semibold text-violet-700">Total</th></tr></thead>
                                  <tbody className="divide-y divide-slate-100">{viewingEventBooking.items.map((item,i) => (<tr key={i}><td className="px-3 py-2">{item.name}</td><td className="px-3 py-2 text-center">{item.quantity}</td><td className="px-3 py-2 text-right">LKR {item.price.toFixed(2)}</td><td className="px-3 py-2 text-right font-medium">LKR {(item.price*item.quantity).toFixed(2)}</td></tr>))}</tbody></table>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                  <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="font-medium">LKR {viewingEventBooking.total.toFixed(2)}</span></div>
                                  <div className="flex justify-between text-sm"><span className="text-slate-600">Advance Paid</span><span className="font-medium text-emerald-600">LKR {(viewingEventBooking.advance_payment||0).toFixed(2)}</span></div>
                                  <div className="flex justify-between text-base border-t pt-2 border-slate-200"><span className="font-bold text-violet-700">Balance Due</span><span className="font-bold text-violet-700">LKR {(viewingEventBooking.balance||0).toFixed(2)}</span></div>
                                  <div className="flex justify-between text-xs text-slate-500"><span>Payment: {viewingEventBooking.payment_method}</span><span className="capitalize">{viewingEventBooking.payment_status}</span></div>
                                </div>
                                {viewingEventBooking.notes && <div className="bg-amber-50 rounded-xl p-3"><p className="text-sm text-amber-800"><span className="font-semibold">Notes:</span> {viewingEventBooking.notes}</p></div>}
                              </div>
                              <div className="flex gap-3 p-5 bg-slate-50 rounded-b-2xl border-t">
                                <button onClick={() => { printPDF(viewingEventBooking); }} className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors">
                                  <Printer size={16} /> Print PDF
                                </button>
                                <button onClick={() => setViewingEventBooking(null)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium transition-colors">
                                  <X size={16} /> Close
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* KOT Report */}
                  {activeTab === 'kot' && (
                    <>
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={() => {
                            const flatData = kotOrders.flatMap(order => 
                              order.items.map(item => ({
                                order_number: order.order_number,
                                table_no: order.table_no || '',
                                room_no: order.room_no || '',
                                product_name: item.product_name,
                                quantity: item.quantity,
                                status: order.status,
                                created_at: order.created_at
                              }))
                            );
                            downloadCSV(flatData, 'kot.csv');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Download size={16} />
                          Download CSV
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {kotOrders.map((order) => (
                          <div key={order.order_id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <span className="font-bold text-slate-800">Order #{order.order_number}</span>
                                {order.table_no && <span className="ml-3 text-sm text-slate-600">Table: {order.table_no}</span>}
                                {order.room_no && <span className="ml-3 text-sm text-slate-600">Room: {order.room_no}</span>}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-200 text-slate-700'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mb-2">
                              {new Date(order.created_at).toLocaleString()}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between bg-white px-3 py-2 rounded-lg">
                                  <span className="text-sm text-slate-700">{item.product_name}</span>
                                  <span className="text-sm font-semibold text-cyan-600">×{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {kotOrders.length === 0 && (
                          <div className="text-center py-8 text-slate-500">No KOT data available</div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
