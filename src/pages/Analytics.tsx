import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, LogOut, Calendar, FileText, 
  CreditCard, ChefHat, TrendingUp, ChevronDown, Download 
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

export default function Analytics() {
  const { user, token, setUser } = useStore();
  const navigate = useNavigate();
  
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
    
    // Set default dates based on filter
    updateDatesForFilter(dateFilter);
  }, [token, user]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReportData();
    }
  }, [startDate, endDate, activeTab]);

  const updateDatesForFilter = (filter: DateFilter) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (filter) {
      case 'today':
        start = end = today;
        break;
      case 'yesterday':
        start = end = new Date(today.setDate(today.getDate() - 1));
        break;
      case 'this_week':
        const dayOfWeek = today.getDay();
        start = new Date(today.setDate(today.getDate() - dayOfWeek));
        end = new Date();
        break;
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      case 'last_month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'custom':
        setShowDatePicker(true);
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setShowDatePicker(false);
  };

  const handleFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    updateDatesForFilter(filter);
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      switch (activeTab) {
        case 'item_sales':
          endpoint = `/api/reports/item-sales?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'payments':
          endpoint = `/api/reports/payments?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'kot':
          endpoint = `/api/reports/kot?start_date=${startDate}&end_date=${endDate}`;
          break;
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        switch (activeTab) {
          case 'item_sales':
            setItemSales(data);
            break;
          case 'payments':
            setPayments(data);
            break;
          case 'kot':
            setKotOrders(data);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to fetch report data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null, null);
    navigate('/login');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadCSV = (data: any[], filename: string, headers: string[]) => {
    if (data.length === 0) {
      alert('No data to download');
      return;
    }

    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const key = header.toLowerCase().replace(/ /g, '_');
        const value = row[key] || '';
        return `"${value}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadItemSalesReport = () => {
    downloadCSV(itemSales, 'item_sales_report', ['Product Name', 'Quantity', 'Total Amount']);
  };

  const downloadPaymentsReport = () => {
    downloadCSV(payments, 'payments_report', ['Payment Method', 'Order Count', 'Total Amount']);
  };

  const downloadKOTReport = () => {
    const kotData = kotOrders.map(order => ({
      order_number: order.order_number,
      table_no: order.table_no || '',
      room_no: order.room_no || '',
      items: order.items.map(item => `${item.product_name} x${item.quantity}`).join('; '),
      created_at: order.created_at,
      status: order.status,
    }));
    downloadCSV(kotData, 'kot_report', ['Order Number', 'Table No', 'Room No', 'Items', 'Created At', 'Status']);
  };

  // Prepare pie chart data for item sales
  const chartColors = [
    '#3b82f6', '#f97316', '#10b981', '#a855f7', '#ec4899',
    '#eab308', '#14b8a6', '#ef4444', '#8b5cf6', '#f59e0b',
  ];

  const itemSalesPieData = itemSales.slice(0, 10).map((item, idx) => ({
    label: item.product_name,
    value: item.quantity,
    color: chartColors[idx % chartColors.length],
  }));

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="text-indigo-500" />
            HotelMate
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 rounded-xl transition-colors">
            <ShoppingCart size={20} />
            <span className="font-medium">POS Terminal</span>
          </Link>
          <Link to="/analytics" className="flex items-center gap-3 px-4 py-3 bg-indigo-600 text-white rounded-xl transition-colors">
            <TrendingUp size={20} />
            <span className="font-medium">Analytics</span>
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
          <h2 className="text-2xl font-bold text-slate-800">Analytics & Reports</h2>
          <p className="text-slate-500 text-sm mt-1">View detailed sales and kitchen reports</p>
        </header>

        <main className="p-8">
          {/* Date Filters */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-800">Date Range</h3>
            </div>
            
            <div className="flex flex-wrap gap-3 mb-4">
              {(['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'custom'] as DateFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleFilterChange(filter)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    dateFilter === filter
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filter.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </button>
              ))}
            </div>

            {(showDatePicker || dateFilter === 'custom') && (
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 text-sm text-slate-600">
              Showing data from <span className="font-semibold">{startDate}</span> to <span className="font-semibold">{endDate}</span>
            </div>
          </div>

          {/* Report Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('item_sales')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'item_sales'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <FileText size={18} />
                Item Sales Report
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'payments'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <CreditCard size={18} />
                Payment Report
              </button>
              <button
                onClick={() => setActiveTab('kot')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'kot'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <ChefHat size={18} />
                KOT Report
              </button>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <>
                  {/* Item Sales Report */}
                  {activeTab === 'item_sales' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">Item Sales Summary</h3>
                        {itemSales.length > 0 && (
                          <button
                            onClick={downloadItemSalesReport}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            <Download size={16} />
                            Download CSV
                          </button>
                        )}
                      </div>
                      {itemSales.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No sales data for selected period</p>
                      ) : (
                        <>
                          <div className="overflow-x-auto mb-8">
                          <table className="w-full">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Item Name</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Quantity Sold</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Total Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {itemSales.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 text-sm text-slate-800">{item.product_name}</td>
                                  <td className="px-4 py-3 text-sm text-slate-800 text-right">{item.quantity}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-slate-800 text-right">
                                    ${item.total_amount.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-50">
                              <tr>
                                <td className="px-4 py-3 text-sm font-bold text-slate-800">TOTAL</td>
                                <td className="px-4 py-3 text-sm font-bold text-slate-800 text-right">
                                  {itemSales.reduce((sum, item) => sum + item.quantity, 0)}
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-slate-800 text-right">
                                  ${itemSales.reduce((sum, item) => sum + item.total_amount, 0).toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                          <div className="mt-8">
                            <h4 className="text-md font-semibold text-slate-700 mb-4">Top 10 Items Distribution</h4>
                            <PieChart data={itemSalesPieData} size={400} showLegend={true} />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Payment Report */}
                  {activeTab === 'payments' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">Payment Summary</h3>
                        {payments.length > 0 && (
                          <button
                            onClick={downloadPaymentsReport}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            <Download size={16} />
                            Download CSV
                          </button>
                        )}
                      </div>
                      {payments.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No payment data for selected period</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Payment Method</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Order Count</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Total Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {payments.map((payment, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 text-sm text-slate-800 capitalize">
                                    {payment.payment_method.replace('_', ' ')}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-800 text-right">{payment.order_count}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-slate-800 text-right">
                                    ${payment.total_amount.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-50">
                              <tr>
                                <td className="px-4 py-3 text-sm font-bold text-slate-800">TOTAL</td>
                                <td className="px-4 py-3 text-sm font-bold text-slate-800 text-right">
                                  {payments.reduce((sum, p) => sum + p.order_count, 0)}
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-slate-800 text-right">
                                  ${payments.reduce((sum, p) => sum + p.total_amount, 0).toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* KOT Report */}
                  {activeTab === 'kot' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">Kitchen Order Tickets</h3>
                        {kotOrders.length > 0 && (
                          <button
                            onClick={downloadKOTReport}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            <Download size={16} />
                            Download CSV
                          </button>
                        )}
                      </div>
                      {kotOrders.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No orders for selected period</p>
                      ) : (
                        <div className="space-y-4">
                          {kotOrders.map((order) => (
                            <div key={order.order_id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-semibold text-slate-800">Order #{order.order_number}</h4>
                                  <p className="text-sm text-slate-500">
                                    {order.table_no && `Table ${order.table_no}`}
                                    {order.room_no && `Room ${order.room_no}`}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">{formatDate(order.created_at)}</p>
                                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    order.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-slate-700">{item.product_name}</span>
                                    <span className="text-slate-600 font-medium">x{item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
