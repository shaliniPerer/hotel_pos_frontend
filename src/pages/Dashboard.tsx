import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, LogOut, TrendingUp, DollarSign, 
  ReceiptText, BarChart3, Calendar, Download, FileText, CreditCard, ChefHat, ChevronDown 
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

export default function Dashboard() {
  const { user, token, setUser, products, categories, fetchProducts, fetchCategories, apiFetch } = useStore();
  const navigate = useNavigate();
  
  // Real-time stats
  const [totalSales, setTotalSales] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);

  // Analytics data
  const [activeTab, setActiveTab] = useState<'item_sales' | 'payments' | 'kot'>('item_sales');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [itemSales, setItemSales] = useState<ItemSalesData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [kotOrders, setKotOrders] = useState<KOTData[]>([]);
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
  }, [token, user]);

  useEffect(() => {
    if (token) {
      fetchReportData();
    }
  }, [dateFilter, startDate, endDate, activeTab]);

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
    setUser(null, null);
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
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="text-cyan-400" />
            HotelMate
          </h1>
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
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <h2 className="text-2xl font-bold text-slate-800">Dashboard & Analytics</h2>
          <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </header>

        <main className="p-8">
          {/* Stats Cards - 6 Cards in 1 row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-100 text-cyan-600 rounded-xl">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Total Sales</p>
                  <p className="text-lg font-bold text-slate-800">LKR {totalSales.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Today's Sales</p>
                  <p className="text-lg font-bold text-slate-800">LKR {todaySales.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                  <ReceiptText size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Total Orders</p>
                  <p className="text-lg font-bold text-slate-800">{totalOrders}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-100 text-cyan-600 rounded-xl">
                  <ReceiptText size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Today Orders</p>
                  <p className="text-lg font-bold text-slate-800">{todayOrders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                  <ReceiptText size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Pending</p>
                  <p className="text-lg font-bold text-slate-800">{pendingOrders}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                  <ReceiptText size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Completed</p>
                  <p className="text-lg font-bold text-slate-800">{completedOrders}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Food Categories Bar Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-8 p-6">
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
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 max-w-[120px]">
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
              <div className="flex items-center justify-between flex-wrap gap-4">
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
              <div className="flex gap-4 mt-4">
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
