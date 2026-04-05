import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  ShoppingCart, LogOut, TrendingUp, DollarSign, 
  ReceiptText, BarChart3, Calendar, Download, FileText, CreditCard, ChefHat, ChevronDown, Menu, X,
  UtensilsCrossed, Package, Home, Truck, CheckCircle2, AlertCircle, Receipt
} from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
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

interface BillOrder {
  id: string;
  order_number: number;
  type: string;
  reference: string;
  items: Array<{ product_name: string; quantity: number; price: number }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string;
  paid_amount: number;
  status: 'active' | 'completed' | 'void';
  created_at: string;
}

interface CategorySalesData {
  name: string;
  color: string;
  itemCount: number;
  totalValue: number;
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
  const [voidedOrders, setVoidedOrders] = useState(0);

  // Analytics data
  const navState = (location.state as any) || {};
  const [activeTab, setActiveTab] = useState<'item_sales' | 'payments' | 'bills'>(navState.tab || 'item_sales');
  const [dateFilter, setDateFilter] = useState<DateFilter>(navState.dateFilter || 'today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [itemSales, setItemSales] = useState<ItemSalesData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [billOrders, setBillOrders] = useState<BillOrder[]>([]);
  const [billStatusFilter, setBillStatusFilter] = useState<'all' | 'active' | 'completed' | 'void'>('all');
  const [loading, setLoading] = useState(false);
  const [monthlySales, setMonthlySales] = useState<{ month: string; label: string; total: number }[]>([]);

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
        const active = orders.filter((o: any) => o.status === 'active');
        const voided = orders.filter((o: any) => o.status === 'void');
        const todayCompletedOrders = completed.filter((o: any) => o.created_at?.split('T')[0] === today);
        
        setTotalOrders(orders.length);
        setCompletedOrders(completed.length);
        setPendingOrders(active.length);
        setVoidedOrders(voided.length);
        setTodayOrders(todayCompletedOrders.length);
        
        const totalSalesAmount = completed.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        const todaySalesAmount = todayCompletedOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        
        setTotalSales(totalSalesAmount);
        setTodaySales(todaySalesAmount);

        // Build current year monthly sales (Jan–Dec)
        const currentYear = new Date().getFullYear();
        const monthMap: Record<string, number> = {};
        for (let m = 1; m <= 12; m++) {
          const key = `${currentYear}-${String(m).padStart(2, '0')}`;
          monthMap[key] = 0;
        }
        completed.forEach((o: any) => {
          const key = (o.created_at || '').slice(0, 7);
          if (key in monthMap) monthMap[key] += o.total || 0;
        });
        const months = Object.entries(monthMap).map(([key, total]) => {
          const [y, m] = key.split('-');
          const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'short' });
          return { month: key, label, total };
        });
        setMonthlySales(months);
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
      } else if (activeTab === 'bills') {
        const res = await apiFetch(`/api/orders`);
        if (res.ok) {
          const allOrders: BillOrder[] = await res.json();
          const { start, end } = getDateRange(dateFilter);
          const filtered = allOrders.filter(o => {
            const d = (o.created_at || '').split('T')[0];
            return d >= start && d <= end;
          });
          setBillOrders(filtered);
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

  const getDateLabel = () => {
    if (dateFilter === 'custom') return `${startDate} to ${endDate}`;
    return dateFilter.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const downloadItemSalesPDF = (data: ItemSalesData[]) => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    const totalQty = data.reduce((s, d) => s + d.quantity, 0);
    const totalAmt = data.reduce((s, d) => s + d.total_amount, 0);
    const _now = new Date();
    const _pad = (n: number) => String(n).padStart(2, '0');
    const _hh = _now.getHours(); const _ampm = _hh >= 12 ? 'PM' : 'AM'; const _h12 = _hh % 12 || 12;
    const genTime = `${_pad(_now.getDate())}/${_pad(_now.getMonth()+1)}/${_now.getFullYear()} ${_pad(_h12)}.${_pad(_now.getMinutes())} ${_ampm}`;
    const rows = data.map((d, i) => `<tr><td style="text-align:center">${i+1}</td><td>${d.product_name}</td><td style="text-align:right">${d.quantity}</td><td style="text-align:right">LKR ${d.total_amount.toFixed(2)}</td></tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Item Sales Report</title><style>
      body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:32px;color:#1e293b;}
      .header{text-align:center;border-bottom:3px solid #0891b2;padding-bottom:20px;margin-bottom:24px;}
      .biz-name{font-size:22px;font-weight:700;color:#0f172a;}
      .biz-info{font-size:12px;color:#475569;margin-top:3px;}
      .report-title{font-size:18px;font-weight:700;color:#0891b2;margin-top:10px;}
      .sub{font-size:12px;color:#64748b;margin-top:4px;}
      table{width:100%;border-collapse:collapse;margin-top:8px;}
      th{background:#0891b2;color:white;padding:10px 12px;text-align:left;font-size:12px;}
      td{padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;}
      tr:hover td{background:#f8fafc;}
      .tfoot td{background:#f1f5f9;font-weight:700;border-top:2px solid #0891b2;}
      .footer{text-align:center;font-size:11px;color:#94a3b8;margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;}
      @media print{body{padding:16px;}}
    </style></head><body>
    <div class="header"><div class="biz-name">The Tranquil</div><div class="biz-info">No.194 / 1, Makola South, Makola, Sri Lanka</div><div class="biz-info">+94 11 2 965 888 / +94 77 5 072 909</div><div class="report-title">Item Sales Report</div><div class="sub">Report Duration: ${getDateLabel()}</div><div class="sub">Generated: ${genTime}</div></div>
    <table><thead><tr><th style="text-align:center;width:40px">#</th><th>Product Name</th><th style="text-align:right">Quantity Sold</th><th style="text-align:right">Total Amount</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td></td><td><strong>TOTAL</strong></td><td style="text-align:right">${totalQty}</td><td style="text-align:right">LKR ${totalAmt.toFixed(2)}</td></tr></tfoot>
    </table>
    <div class="footer">Digital Solutions by Click Inmo Pvt Ltd.<br><a href="https://clickinmo.com" target="_blank" style="color:#0891b2;text-decoration:underline;">https://clickinmo.com</a></div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const downloadPaymentsPDF = (data: PaymentData[]) => {
    const win = window.open('', '_blank', 'width=900,height=600');
    if (!win) return;
    const totalOrders = data.reduce((s, d) => s + d.order_count, 0);
    const totalAmt = data.reduce((s, d) => s + d.total_amount, 0);
    const _now = new Date();
    const _pad = (n: number) => String(n).padStart(2, '0');
    const _hh = _now.getHours(); const _ampm = _hh >= 12 ? 'PM' : 'AM'; const _h12 = _hh % 12 || 12;
    const genTime = `${_pad(_now.getDate())}/${_pad(_now.getMonth()+1)}/${_now.getFullYear()} ${_pad(_h12)}.${_pad(_now.getMinutes())} ${_ampm}`;
    const rows = data.map((d, i) => `<tr><td style="text-align:center">${i+1}</td><td style="text-transform:capitalize">${d.payment_method.replace(/_/g,' ')}</td><td style="text-align:right">${d.order_count}</td><td style="text-align:right">LKR ${d.total_amount.toFixed(2)}</td></tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Payments Report</title><style>
      body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:32px;color:#1e293b;}
      .header{text-align:center;border-bottom:3px solid #0891b2;padding-bottom:20px;margin-bottom:24px;}
      .biz-name{font-size:22px;font-weight:700;color:#0f172a;}
      .biz-info{font-size:12px;color:#475569;margin-top:3px;}
      .report-title{font-size:18px;font-weight:700;color:#0891b2;margin-top:10px;}
      .sub{font-size:12px;color:#64748b;margin-top:4px;}
      table{width:100%;border-collapse:collapse;margin-top:8px;}
      th{background:#0891b2;color:white;padding:10px 12px;text-align:left;font-size:12px;}
      td{padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;}
      tr:hover td{background:#f8fafc;}
      .tfoot td{background:#f1f5f9;font-weight:700;border-top:2px solid #0891b2;}
      .footer{text-align:center;font-size:11px;color:#94a3b8;margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;}
      @media print{body{padding:16px;}}
    </style></head><body>
    <div class="header"><div class="biz-name">The Tranquil</div><div class="biz-info">No.194 / 1, Makola South, Makola, Sri Lanka</div><div class="biz-info">+94 11 2 965 888 / +94 77 5 072 909</div><div class="report-title">Payments Report</div><div class="sub">Report Duration: ${getDateLabel()}</div><div class="sub">Generated: ${genTime}</div></div>
    <table><thead><tr><th style="text-align:center;width:40px">#</th><th>Payment Method</th><th style="text-align:right">Order Count</th><th style="text-align:right">Total Amount</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td></td><td><strong>TOTAL</strong></td><td style="text-align:right">${totalOrders}</td><td style="text-align:right">LKR ${totalAmt.toFixed(2)}</td></tr></tfoot>
    </table>
    <div class="footer">Digital Solutions by Click Inmo Pvt Ltd.<br><a href="https://clickinmo.com" target="_blank" style="color:#0891b2;text-decoration:underline;">https://clickinmo.com</a></div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <AppSidebar show={showSidebar} onClose={() => setShowSidebar(false)} />

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
          <button
            onClick={() => navigate('/')}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">Go to POS</span>
          </button>
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
                  <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase">Active KOTs</p>
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

            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-red-100 text-red-600 rounded-xl">
                  <ReceiptText size={18} />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase">Voided KOTs</p>
                  <p className="text-sm md:text-lg font-bold text-slate-800">{voidedOrders}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Sales Bar Chart */}
          {(() => {
            const maxMonthly = Math.max(...monthlySales.map(m => m.total), 1);
            const barH = 220;
            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 md:mb-8 p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800 uppercase">Monthly Sales</h3>
                  <span className="text-sm text-slate-500">{new Date().getFullYear()}</span>
                </div>
                {monthlySales.some(m => m.total > 0) ? (
                  <div className="relative" style={{ height: `${barH + 60}px` }}>
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 flex flex-col justify-between text-xs text-slate-400 w-16" style={{ height: `${barH}px` }}>
                      {[1, 0.8, 0.6, 0.4, 0.2, 0].map((r, i) => (
                        <span key={i}>{Math.round(maxMonthly * r).toLocaleString()}</span>
                      ))}
                    </div>
                    {/* Bars */}
                    <div className="ml-16 h-full flex items-end gap-1.5">
                      {monthlySales.map((m, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex items-end justify-center" style={{ height: `${barH}px` }}>
                            <div
                              className="w-full rounded-t hover:opacity-80 transition-all cursor-default"
                              style={{
                                height: `${(m.total / maxMonthly) * 100}%`,
                                backgroundColor: '#06b6d4',
                                minHeight: m.total > 0 ? '4px' : '0',
                              }}
                              title={`${m.label}\nLKR ${m.total.toLocaleString()}`}
                            />
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium text-center leading-tight">{m.label}</div>
                          <div className="text-[10px] font-semibold text-cyan-600 text-center">
                            {m.total > 0 ? m.total.toLocaleString() : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <BarChart3 size={48} className="mb-3 opacity-30" />
                    <p className="text-sm">No sales data available</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Analytics Reports Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-8">
            <div className="border-b border-slate-100 px-6 py-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-lg font-bold text-slate-800 uppercase">Reports</h3>
                
                {/* Date Filter */}
                <div className="flex items-center gap-2 flex-wrap">
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
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-10">
                        {(['today','yesterday','this_week','this_month','last_month'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => { setDateFilter(f); setShowDatePicker(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-sm capitalize"
                          >
                            {f.replace('_', ' ')}
                          </button>
                        ))}
                        <div className="border-t border-slate-200 my-1" />
                        <button
                          onClick={() => { setDateFilter('custom'); setShowDatePicker(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-sm"
                        >
                          Custom Range
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline date inputs shown next to button when Custom Range is selected */}
                  {dateFilter === 'custom' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                      <span className="text-slate-400 text-sm">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                    </div>
                  )}
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
                  onClick={() => setActiveTab('bills')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'bills'
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ReceiptText size={16} />
                  Bills
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
                      <div className="flex justify-end gap-2 mb-4">
                        <button
                          onClick={() => downloadItemSalesPDF(itemSales)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <FileText size={16} />
                          Download PDF
                        </button>
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
                      <div className="flex justify-end gap-2 mb-4">
                        <button
                          onClick={() => downloadPaymentsPDF(payments)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <FileText size={16} />
                          Download PDF
                        </button>
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


                  {/* Bills / Order Management */}
                  {activeTab === 'bills' && (() => {
                    const filtered = billStatusFilter === 'all'
                      ? billOrders.filter(o => o.status !== 'void')
                      : billOrders.filter(o => o.status === billStatusFilter);

                    const completedBills = billOrders.filter(o => o.status === 'completed');
                    const activeBills   = billOrders.filter(o => o.status === 'active');
                    const voidedBills   = billOrders.filter(o => o.status === 'void');
                    const totalRevenue  = completedBills.reduce((s, o) => s + (o.total || 0), 0);

                    const typeIcon = (type: string) => {
                      if (type === 'table')    return <UtensilsCrossed size={13} className="text-cyan-500" />;
                      if (type === 'room')     return <Home size={13} className="text-indigo-500" />;
                      if (type === 'takeaway') return <Package size={13} className="text-amber-500" />;
                      if (type === 'delivery') return <Truck size={13} className="text-emerald-500" />;
                      return <Receipt size={13} className="text-slate-400" />;
                    };
                    const typeLabel = (type: string) => {
                      if (type === 'table')    return 'Dine In';
                      if (type === 'room')     return 'Room Service';
                      if (type === 'takeaway') return 'Takeaway';
                      if (type === 'delivery') return 'Delivery';
                      return type || '—';
                    };
                    const statusBadge = (status: string) => {
                      if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
                      if (status === 'active')    return 'bg-amber-100 text-amber-700';
                      return 'bg-red-100 text-red-600 line-through opacity-70';
                    };
                    const methodLabel = (m: string) => {
                      if (m === 'cash')           return 'Cash';
                      if (m === 'card')           return 'Card';
                      if (m === 'online_banking') return 'Online';
                      if (m === 'check')          return 'Check';
                      return m || '—';
                    };

                    const downloadBillsPDF = () => {
                      const win = window.open('', '_blank', 'width=1100,height=800');
                      if (!win) return;
                      const _now = new Date();
                      const _pad = (n: number) => String(n).padStart(2, '0');
                      const _hh = _now.getHours(); const _ampm = _hh >= 12 ? 'PM' : 'AM'; const _h12 = _hh % 12 || 12;
                      const genTime = `${_pad(_now.getDate())}/${_pad(_now.getMonth()+1)}/${_now.getFullYear()} ${_pad(_h12)}.${_pad(_now.getMinutes())} ${_ampm}`;
                      const rows = filtered.map((o, idx) => `<tr>
                        <td style="text-align:center">${idx+1}</td>
                        <td>${typeLabel(o.type)}</td>
                        <td>${o.reference || '—'}</td>
                        <td style="max-width:180px">${(o.items||[]).map(i=>i.product_name+'×'+i.quantity).join(', ')||'—'}</td>
                        <td style="text-align:right">LKR ${(o.subtotal||0).toFixed(2)}</td>
                        <td style="text-align:right">LKR ${(o.tax||0).toFixed(2)}</td>
                        <td style="text-align:right;font-weight:700">LKR ${(o.total||0).toFixed(2)}</td>
                        <td>${methodLabel(o.payment_method)}</td>
                        <td><span class="badge ${o.status}">${o.status}</span></td>
                        <td style="white-space:nowrap">${o.created_at ? new Date(o.created_at).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                      </tr>`).join('');
                      const grandTotal = filtered.filter(o=>o.status==='completed').reduce((s,o)=>s+(o.total||0),0);
                      win.document.write(`<!DOCTYPE html><html><head><title>Bills Report</title><style>
                        body{font-family:Arial,sans-serif;padding:24px;color:#1e293b;font-size:12px;}
                        .header{text-align:center;border-bottom:3px solid #0891b2;padding-bottom:16px;margin-bottom:20px;}
                        .biz-name{font-size:20px;font-weight:700;color:#0f172a;}
                        .biz-info{font-size:11px;color:#475569;margin-top:2px;}
                        .report-title{font-size:16px;font-weight:700;color:#0891b2;margin-top:8px;}
                        .sub{font-size:12px;color:#64748b;margin-top:3px;}
                        table{width:100%;border-collapse:collapse;}
                        th{background:#0891b2;color:white;padding:8px 10px;text-align:left;font-size:11px;}
                        td{padding:7px 10px;border-bottom:1px solid #f1f5f9;}
                        .badge{padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;}
                        .badge.completed{background:#d1fae5;color:#065f46;}
                        .badge.active{background:#fef3c7;color:#92400e;}
                        .badge.void{background:#fee2e2;color:#991b1b;}
                        .summary{display:flex;gap:16px;margin-bottom:16px;}
                        .card{flex:1;border-radius:8px;padding:10px 14px;}
                        .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:10px;}
                        @media print{body{padding:12px;}}
                      </style></head><body>
                      <div class="header"><div class="biz-name">The Tranquil</div><div class="biz-info">No.194 / 1, Makola South, Makola, Sri Lanka</div><div class="biz-info">+94 11 2 965 888 / +94 77 5 072 909</div><div class="report-title">Bills Report</div><div class="sub">Report Duration: ${getDateLabel()}</div><div class="sub">Generated: ${genTime}</div></div>
                      <div class="summary">
                        <div class="card" style="background:#f0fdf4;border:1px solid #bbf7d0"><div style="font-size:10px;color:#16a34a;font-weight:700;text-transform:uppercase">Revenue</div><div style="font-size:18px;font-weight:700;color:#15803d">LKR ${totalRevenue.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
                        <div class="card" style="background:#f0f9ff;border:1px solid #bae6fd"><div style="font-size:10px;color:#0284c7;font-weight:700;text-transform:uppercase">Completed</div><div style="font-size:18px;font-weight:700;color:#0369a1">${completedBills.length}</div></div>
                        <div class="card" style="background:#fffbeb;border:1px solid #fde68a"><div style="font-size:10px;color:#d97706;font-weight:700;text-transform:uppercase">Active</div><div style="font-size:18px;font-weight:700;color:#b45309">${activeBills.length}</div></div>
                        <div class="card" style="background:#fff1f2;border:1px solid #fecdd3"><div style="font-size:10px;color:#e11d48;font-weight:700;text-transform:uppercase">Voided</div><div style="font-size:18px;font-weight:700;color:#be123c">${voidedBills.length}</div></div>
                      </div>
                      <table><thead><tr><th style="text-align:center;width:36px">#</th><th>Type</th><th>Reference</th><th>Items</th><th>Subtotal</th><th>Service Charge</th><th>Total</th><th>Payment</th><th>Status</th><th>Date &amp; Time</th></tr></thead>
                      <tbody>${rows}</tbody></table>
                      <div class="footer">Digital Solutions by Click Inmo Pvt Ltd.<br><a href="https://clickinmo.com" target="_blank" style="color:#0891b2;text-decoration:underline;">https://clickinmo.com</a></div>
                      </body></html>`);
                      win.document.close();
                      setTimeout(() => win.print(), 400);
                    };

                    return (
                      <>
                        {/* Summary cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-0.5">Revenue</p>
                            <p className="text-lg font-bold text-emerald-700">LKR {totalRevenue.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
                          </div>
                          <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 mb-0.5">Completed</p>
                            <p className="text-lg font-bold text-cyan-700">{completedBills.length}</p>
                          </div>
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-0.5">Active</p>
                            <p className="text-lg font-bold text-amber-700">{activeBills.length}</p>
                          </div>
                          <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-0.5">Voided</p>
                            <p className="text-lg font-bold text-red-600">{voidedBills.length}</p>
                          </div>
                        </div>

                        {/* Filter + Download row */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {(['all','active','completed','void'] as const).map(s => (
                            <button key={s} onClick={() => setBillStatusFilter(s)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                                billStatusFilter === s ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}>
                              {s}
                            </button>
                          ))}
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={downloadBillsPDF}
                              className="flex items-center gap-2 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium"
                            >
                              <FileText size={14} /> Download PDF
                            </button>
                            <button
                              onClick={() => {
                                const csv = filtered.map(o => ({
                                  order_number: o.order_number,
                                  type: typeLabel(o.type),
                                  reference: o.reference,
                                  items: o.items?.map(i => `${i.product_name}x${i.quantity}`).join('; ') || '',
                                  subtotal: o.subtotal,
                                  tax: o.tax,
                                  discount: o.discount,
                                  total: o.total,
                                  payment_method: methodLabel(o.payment_method),
                                  status: o.status,
                                  date: o.created_at,
                                }));
                                downloadCSV(csv, 'bills.csv');
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium"
                            >
                              <Download size={14} /> Download CSV
                            </button>
                          </div>
                        </div>

                        {/* Orders table */}
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-cyan-600 text-white">
                                <th className="px-4 py-3 font-semibold whitespace-nowrap">#</th>
                                <th className="px-4 py-3 font-semibold">Type</th>
                                <th className="px-4 py-3 font-semibold">Reference</th>
                                <th className="px-4 py-3 font-semibold">Items</th>
                                <th className="px-4 py-3 font-semibold text-right">Subtotal</th>
                                <th className="px-4 py-3 font-semibold text-right">Service Charge</th>
                                <th className="px-4 py-3 font-semibold text-right">Total</th>
                                <th className="px-4 py-3 font-semibold">Payment</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold whitespace-nowrap">Date &amp; Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filtered.map((order, idx) => (
                                <tr key={order.id} className={`hover:bg-slate-50 transition-colors ${
                                  order.status === 'void' ? 'opacity-50' : ''
                                }`}>
                                  <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">
                                    {order.order_number ? `#${String(order.order_number).padStart(3,'0')}` : `—`}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                      {typeIcon(order.type)}
                                      <span className="text-slate-700">{typeLabel(order.type)}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                    {order.reference || '—'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col gap-0.5 max-w-[200px]">
                                      {(order.items || []).map((item, i) => (
                                        <span key={i} className="text-xs text-slate-600">
                                          {item.product_name} <span className="font-semibold text-cyan-600">x{item.quantity}</span>
                                        </span>
                                      ))}
                                      {(!order.items || order.items.length === 0) && <span className="text-xs text-slate-400">—</span>}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                                    LKR {(order.subtotal || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                                    LKR {(order.tax || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                                    LKR {(order.total || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600 capitalize whitespace-nowrap">
                                    {methodLabel(order.payment_method)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge(order.status)}`}>
                                      {order.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                    {order.created_at
                                      ? new Date(order.created_at).toLocaleString('en-GB', {
                                          day: '2-digit', month: 'short', year: 'numeric',
                                          hour: '2-digit', minute: '2-digit'
                                        })
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                              {filtered.length === 0 && (
                                <tr>
                                  <td colSpan={10} className="px-6 py-10 text-center text-slate-400">
                                    No orders found for the selected period
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
