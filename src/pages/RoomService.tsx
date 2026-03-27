import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import { useNavigate, Link } from 'react-router-dom';
import {
  LogOut, Plus, Trash2, Edit2, X, BedDouble, Users, Phone,
  CheckCircle, CalendarDays, ChevronLeft, ChevronRight, LayoutDashboard,
  Menu as MenuIcon, ShoppingCart, TrendingUp, Calendar, ClipboardList,
  AlertTriangle, BedSingle, PlaneLanding, PlaneTakeoff, BookOpen,
  Receipt, Tag, List, FileText,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoomStatus = 'available' | 'booked' | 'occupied' | 'cleaning';

type SubPage =
  | 'dashboard'
  | 'room-management'
  | 'new-booking'
  | 'all-bookings'
  | 'calendar'
  | 'arrivals-departures'
  | 'new-expense'
  | 'expenses-list'
  | 'new-category'
  | 'categories-list';

interface RatePlanEntry { name: string; price: number; }

interface Room {
  id: string;
  name: string;
  room_type: string;
  amenities: string[];
  room_size: string;
  adults: number;
  children: number;
  status: RoomStatus;
  price: number;
  rate_plan: RatePlanEntry[];
  created_at: string;
  updated_at: string;
}

interface RoomBooking {
  id: string;
  room_id: string;
  room_name: string;
  room_type: string;
  reservation_number: string;
  channel: string;
  customer_name: string;
  contact_number: string;
  email: string;
  rate_plan_name: string;
  num_rooms: number;
  adults: number;
  children: number;
  checkin_date: string;
  checkout_date: string;
  status: 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out';
  notes: string;
  payment_type: string;
  payment_status: string;
  room_amount: number;
  rate_plan_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface Expense {
  id: string;
  expense_date: string;
  category_id: string;
  category_name: string;
  expense_for: string;
  amount: number;
  reference_no: string;
  note: string;
  image?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<RoomStatus, string> = {
  available: 'Available',
  booked: 'Booked',
  occupied: 'Occupied',
  cleaning: 'Cleaning',
};

const STATUS_COLORS: Record<RoomStatus, string> = {
  available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  booked: 'bg-blue-100 text-blue-700 border-blue-200',
  occupied: 'bg-amber-100 text-amber-700 border-amber-200',
  cleaning: 'bg-purple-100 text-purple-700 border-purple-200',
};

const STATUS_DOT: Record<RoomStatus, string> = {
  available: 'bg-emerald-500',
  booked: 'bg-blue-500',
  occupied: 'bg-amber-500',
  cleaning: 'bg-purple-500',
};

const BOOKING_STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-blue-50 text-blue-700',
  checked_in: 'bg-amber-50 text-amber-700',
  checked_out: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-500 line-through opacity-60',
};

// ─── Sub-nav definitions ──────────────────────────────────────────────────────

const SUB_NAV: { id: SubPage; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',           label: 'Dashboard',             icon: <LayoutDashboard size={17} /> },
  { id: 'room-management',     label: 'Room Management',       icon: <BedDouble size={17} /> },
  { id: 'new-booking',         label: 'New Booking',           icon: <BookOpen size={17} /> },
  { id: 'all-bookings',        label: 'All Bookings',          icon: <ClipboardList size={17} /> },
  { id: 'calendar',            label: 'Calendar',              icon: <Calendar size={17} /> },
  { id: 'arrivals-departures', label: 'Arrivals & Departures', icon: <PlaneLanding size={17} /> },
  { id: 'new-expense',         label: 'New Expense',           icon: <Receipt size={17} /> },
  { id: 'expenses-list',       label: 'Expenses List',         icon: <List size={17} /> },
  { id: 'new-category',        label: 'New Category',          icon: <Tag size={17} /> },
  { id: 'categories-list',     label: 'Categories List',       icon: <FileText size={17} /> },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function RoomService() {
  const { user, token, logout, apiFetch } = useStore();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const [activePage, setActivePage] = useState<SubPage>('dashboard');

  // Data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(true);

  interface TodayData { arrivals: RoomBooking[]; departures: RoomBooking[] }
  const [todayData, setTodayData] = useState<TodayData>({ arrivals: [], departures: [] });

  // Room form
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: '',
    room_type: 'standard',
    room_size: '',
    adults: '1',
    children: '0',
    status: 'available' as RoomStatus,
    price: '0',
  });
  const [roomAmenities, setRoomAmenities] = useState<string[]>([]);
  const [roomRatePlans, setRoomRatePlans] = useState<{ name: string; price: string }[]>([]);
  const [amenityInput, setAmenityInput] = useState('');
  const [ratePlanInput, setRatePlanInput] = useState('');
  const [ratePlanPriceInput, setRatePlanPriceInput] = useState('');
  const [roomFormLoading, setRoomFormLoading] = useState(false);
  const [roomFormError, setRoomFormError] = useState('');

  // Booking form
  const [editingBooking, setEditingBooking] = useState<RoomBooking | null>(null);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    room_id: '',
    reservation_number: `RES-${Date.now().toString(36).slice(-6).toUpperCase()}`,
    channel: 'FIT',
    customer_name: '',
    contact_number: '',
    email: '',
    checkin_date: '',
    checkout_date: '',
    room_type_filter: '',
    rate_plan_name: '',
    num_rooms: '1',
    adults: '1',
    children: '0',
    notes: '',
    payment_type: 'Cash',
    payment_status: 'Pending',
  });
  const [bookingFormLoading, setBookingFormLoading] = useState(false);
  const [bookingFormError, setBookingFormError] = useState('');
  const [bookingFormSuccess, setBookingFormSuccess] = useState('');

  // Delete confirms
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

  // Calendar
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCalendarRoom, setSelectedCalendarRoom] = useState('all');

  // Expenses
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [expenseForm, setExpenseForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category_id: '',
    expense_for: '',
    amount: '',
    reference_no: '',
    image: '',
    note: '',
  });
  const [expenseFormLoading, setExpenseFormLoading] = useState(false);
  const [expenseFormError, setExpenseFormError] = useState('');
  const [expenseFormSuccess, setExpenseFormSuccess] = useState('');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Expense Category form
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [categoryFormLoading, setCategoryFormLoading] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState('');
  const [categoryFormSuccess, setCategoryFormSuccess] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, bookingsRes, todayRes, expensesRes, catRes] = await Promise.all([
        apiFetch('/api/rooms'),
        apiFetch('/api/rooms/bookings'),
        apiFetch('/api/rooms/bookings/today'),
        apiFetch('/api/expenses'),
        apiFetch('/api/expenses/categories'),
      ]);
      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (todayRes.ok) setTodayData(await todayRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (catRes.ok) setExpenseCategories(await catRes.json());
    } catch (err) {
      console.error('Room service fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (user?.role === 'cashier') { navigate('/'); return; }
    fetchData();
  }, [token, user, fetchData, navigate]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const today = new Date().toISOString().split('T')[0];

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((r) => r.status === 'available').length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const bookedRooms = rooms.filter((r) => r.status === 'booked').length;
  const cleaningRooms = rooms.filter((r) => r.status === 'cleaning').length;
  const todayBookingsCount = bookings.filter((b) => b.checkin_date === today && b.status !== 'cancelled').length;

  // ── Room CRUD ──────────────────────────────────────────────────────────────

  const openRoomForm = (room?: Room) => {
    setEditingRoom(room || null);
    setRoomForm(room ? {
      name: room.name,
      room_type: room.room_type || 'standard',
      room_size: room.room_size || '',
      adults: (room.adults ?? 1).toString(),
      children: (room.children ?? 0).toString(),
      status: room.status,
      price: (room.price ?? 0).toString(),
    } : {
      name: '',
      room_type: 'standard',
      room_size: '',
      adults: '1',
      children: '0',
      status: 'available' as RoomStatus,
      price: '0',
    });
    setRoomAmenities(Array.isArray(room?.amenities) ? room.amenities : []);
    setRoomRatePlans(
      Array.isArray(room?.rate_plan)
        ? room.rate_plan.map((rp: any) =>
            typeof rp === 'object' && rp !== null
              ? { name: rp.name || '', price: (rp.price ?? '').toString() }
              : { name: String(rp), price: '' }
          )
        : []
    );
    setAmenityInput('');
    setRatePlanInput('');
    setRatePlanPriceInput('');
    setRoomFormError('');
    setShowRoomForm(true);
  };

  const addAmenity = () => {
    const trimmed = amenityInput.trim();
    if (trimmed && !roomAmenities.includes(trimmed)) {
      setRoomAmenities([...roomAmenities, trimmed]);
    }
    setAmenityInput('');
  };

  const addRatePlan = () => {
    const trimmed = ratePlanInput.trim();
    if (trimmed && !roomRatePlans.find((x) => x.name === trimmed)) {
      setRoomRatePlans([...roomRatePlans, { name: trimmed, price: ratePlanPriceInput }]);
    }
    setRatePlanInput('');
    setRatePlanPriceInput('');
  };

  const saveRoom = async () => {
    if (!roomForm.name.trim()) { setRoomFormError('Room number / name is required'); return; }
    setRoomFormLoading(true); setRoomFormError('');
    try {
      const payload = {
        name: roomForm.name.trim(),
        room_type: roomForm.room_type,
        amenities: roomAmenities,
        room_size: roomForm.room_size.trim(),
        adults: parseInt(roomForm.adults) || 1,
        children: parseInt(roomForm.children) || 0,
        status: roomForm.status,
        price: parseFloat(roomForm.price) || 0,
        rate_plan: roomRatePlans.map((rp) => ({ name: rp.name, price: parseFloat(rp.price) || 0 })),
      };
      const res = await apiFetch(editingRoom ? `/api/rooms/${editingRoom.id}` : '/api/rooms', {
        method: editingRoom ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setRoomFormError((await res.json()).error || 'Failed to save'); return; }
      setShowRoomForm(false);
      fetchData();
    } finally { setRoomFormLoading(false); }
  };

  const deleteRoom = async (id: string) => {
    await apiFetch(`/api/rooms/${id}`, { method: 'DELETE' });
    setDeletingRoomId(null);
    fetchData();
  };

  // ── Booking CRUD ───────────────────────────────────────────────────────────

  const resetBookingForm = (roomId?: string) => {
    setBookingForm({
      room_id: roomId || '',
      reservation_number: `RES-${Date.now().toString(36).slice(-6).toUpperCase()}`,
      channel: 'FIT',
      customer_name: '',
      contact_number: '',
      email: '',
      checkin_date: '',
      checkout_date: '',
      room_type_filter: '',
      rate_plan_name: '',
      num_rooms: '1',
      adults: '1',
      children: '0',
      notes: '',
      payment_type: 'Cash',
      payment_status: 'Pending',
    });
    setBookingFormError('');
    setBookingFormSuccess('');
  };

  const openEditBooking = (booking: RoomBooking) => {
    setEditingBooking(booking);
    setBookingForm({
      room_id: booking.room_id,
      reservation_number: (booking as any).reservation_number || '',
      channel: (booking as any).channel || 'FIT',
      customer_name: booking.customer_name,
      contact_number: booking.contact_number,
      email: (booking as any).email || '',
      checkin_date: booking.checkin_date,
      checkout_date: booking.checkout_date,
      room_type_filter: '',
      rate_plan_name: (booking as any).rate_plan_name || '',
      num_rooms: ((booking as any).num_rooms ?? 1).toString(),
      adults: ((booking as any).adults ?? 1).toString(),
      children: ((booking as any).children ?? 0).toString(),
      notes: booking.notes,
      payment_type: (booking as any).payment_type || 'Cash',
      payment_status: (booking as any).payment_status || 'Pending',
    });
    setBookingFormError('');
    setShowEditBookingModal(true);
  };

  const saveBooking = async (isEdit = false) => {
    const { room_id, customer_name, checkin_date, checkout_date } = bookingForm;
    if (!room_id || !customer_name.trim() || !checkin_date || !checkout_date) {
      setBookingFormError('Please fill in all required fields'); return;
    }
    if (checkin_date >= checkout_date) {
      setBookingFormError('Check-out date must be after check-in date'); return;
    }
    setBookingFormLoading(true); setBookingFormError('');
    try {
      const room = rooms.find((r) => r.id === room_id);
      const nights = (bookingForm.checkin_date && bookingForm.checkout_date && bookingForm.checkin_date < bookingForm.checkout_date)
        ? Math.ceil((new Date(bookingForm.checkout_date).getTime() - new Date(bookingForm.checkin_date).getTime()) / 86400000)
        : 0;
      const numRooms = parseInt(bookingForm.num_rooms) || 1;
      const roomPricePerNight = Number((room as any)?.price || 0);
      const ratePlanPrice = (room?.rate_plan ?? []).find((rp: any) => (rp.name || rp) === bookingForm.rate_plan_name)
        ? Number(((room?.rate_plan ?? []).find((rp: any) => (rp.name || rp) === bookingForm.rate_plan_name) as any)?.price || 0)
        : 0;
      const roomAmount = roomPricePerNight * nights * numRooms;
      const ratePlanAmount = ratePlanPrice * nights * numRooms;
      const totalAmount = roomAmount + ratePlanAmount;
      const url = isEdit && editingBooking ? `/api/rooms/bookings/${editingBooking.id}` : '/api/rooms/bookings';
      const res = await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: bookingForm.room_id,
          room_name: room?.name || '',
          room_type: room?.room_type || '',
          reservation_number: bookingForm.reservation_number,
          channel: bookingForm.channel,
          customer_name: bookingForm.customer_name.trim(),
          contact_number: bookingForm.contact_number,
          email: bookingForm.email,
          checkin_date: bookingForm.checkin_date,
          checkout_date: bookingForm.checkout_date,
          rate_plan_name: bookingForm.rate_plan_name,
          num_rooms: numRooms,
          adults: parseInt(bookingForm.adults) || 1,
          children: parseInt(bookingForm.children) || 0,
          notes: bookingForm.notes,
          payment_type: bookingForm.payment_type,
          payment_status: bookingForm.payment_status,
          room_amount: roomAmount,
          rate_plan_amount: ratePlanAmount,
          total_amount: totalAmount,
        }),
      });
      if (!res.ok) { setBookingFormError((await res.json()).error || 'Failed to save booking'); return; }
      if (isEdit) { setShowEditBookingModal(false); }
      else { setBookingFormSuccess('Booking created successfully!'); resetBookingForm(); }
      fetchData();
    } finally { setBookingFormLoading(false); }
  };

  const deleteBooking = async (id: string) => {
    await apiFetch(`/api/rooms/bookings/${id}`, { method: 'DELETE' });
    setDeletingBookingId(null);
    fetchData();
  };

  const updateBookingStatus = async (id: string, status: string) => {
    await apiFetch(`/api/rooms/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  // ── Expense Category CRUD ──────────────────────────────────────────────────

  const resetCategoryForm = (cat?: ExpenseCategory) => {
    setCategoryForm({ name: cat?.name || '', description: cat?.description || '' });
    setEditingCategory(cat || null);
    setCategoryFormError('');
    setCategoryFormSuccess('');
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) { setCategoryFormError('Category Name is required'); return; }
    setCategoryFormLoading(true); setCategoryFormError('');
    try {
      const url = editingCategory ? `/api/expenses/categories/${editingCategory.id}` : '/api/expenses/categories';
      const res = await apiFetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryForm.name.trim(), description: categoryForm.description.trim() }),
      });
      if (!res.ok) { setCategoryFormError((await res.json()).error || 'Failed to save category'); return; }
      setCategoryFormSuccess(editingCategory ? 'Category updated!' : 'Category created!');
      resetCategoryForm();
      fetchData();
    } finally { setCategoryFormLoading(false); }
  };

  const deleteCategory = async (id: string) => {
    await apiFetch(`/api/expenses/categories/${id}`, { method: 'DELETE' });
    setDeletingCategoryId(null);
    fetchData();
  };

  const toggleCategoryStatus = async (cat: ExpenseCategory) => {
    await apiFetch(`/api/expenses/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: cat.status === 'active' ? 'inactive' : 'active' }),
    });
    fetchData();
  };

  // ── Expense CRUD ───────────────────────────────────────────────────────────

  const resetExpenseForm = (exp?: Expense) => {
    setExpenseForm({
      expense_date: exp?.expense_date || new Date().toISOString().split('T')[0],
      category_id: exp?.category_id || '',
      expense_for: exp?.expense_for || '',
      amount: exp ? String(exp.amount) : '',
      reference_no: exp?.reference_no || '',
      image: exp?.image || '',
      note: exp?.note || '',
    });
    setEditingExpense(exp || null);
    setExpenseFormError('');
    setExpenseFormSuccess('');
  };

  const saveExpense = async () => {
    const { expense_date, category_id, expense_for, amount } = expenseForm;
    if (!expense_date || !category_id || !expense_for.trim() || !amount) {
      setExpenseFormError('Please fill in all required fields'); return;
    }
    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt < 0) { setExpenseFormError('Amount must be a valid number'); return; }
    setExpenseFormLoading(true); setExpenseFormError('');
    try {
      const cat = expenseCategories.find((c) => c.id === category_id);
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
      const res = await apiFetch(url, {
        method: editingExpense ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_date,
          category_id,
          category_name: cat?.name || '',
          expense_for: expense_for.trim(),
          amount: parsedAmt,
          reference_no: expenseForm.reference_no.trim(),
          image: expenseForm.image || '',
          note: expenseForm.note.trim(),
        }),
      });
      if (!res.ok) { setExpenseFormError((await res.json()).error || 'Failed to save expense'); return; }
      setExpenseFormSuccess(editingExpense ? 'Expense updated!' : 'Expense saved!');
      resetExpenseForm();
      fetchData();
    } finally { setExpenseFormLoading(false); }
  };

  const deleteExpense = async (id: string) => {
    await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
    setDeletingExpenseId(null);
    fetchData();
  };

  // ── Calendar helpers ───────────────────────────────────────────────────────

  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getBookingsForDate = (ds: string) =>
    bookings.filter((b) => {
      if (b.status === 'cancelled') return false;
      if (selectedCalendarRoom !== 'all' && b.room_id !== selectedCalendarRoom) return false;
      return ds >= b.checkin_date && ds < b.checkout_date;
    });

  const pageTitle = SUB_NAV.find((n) => n.id === activePage)?.label || 'Room Service';

  // ── New Booking computed values ────────────────────────────────────────────
  const bfNights = bookingForm.checkin_date && bookingForm.checkout_date && bookingForm.checkin_date < bookingForm.checkout_date
    ? Math.ceil((new Date(bookingForm.checkout_date).getTime() - new Date(bookingForm.checkin_date).getTime()) / 86400000)
    : 0;
  const bfDatesValid = !!(bookingForm.checkin_date && bookingForm.checkout_date && bookingForm.checkin_date < bookingForm.checkout_date);
  const bfAvailableRooms = bfDatesValid
    ? rooms.filter((room) => {
        if (bookingForm.room_type_filter && (room.room_type || '').toLowerCase() !== bookingForm.room_type_filter) return false;
        return !bookings.some((b) => b.status !== 'cancelled' && b.room_id === room.id && bookingForm.checkin_date < b.checkout_date && bookingForm.checkout_date > b.checkin_date);
      })
    : [];
  const bfSelectedRoom = rooms.find((r) => r.id === bookingForm.room_id);
  const bfRatePlans: { name: string; price: number }[] = Array.isArray(bfSelectedRoom?.rate_plan)
    ? bfSelectedRoom!.rate_plan.map((rp: any) => typeof rp === 'string' ? { name: rp, price: 0 } : { name: rp.name || '', price: Number(rp.price || 0) })
    : [];
  const bfNumRooms = parseInt(bookingForm.num_rooms) || 1;
  const bfRoomPricePerNight = Number((bfSelectedRoom as any)?.price || 0);
  const bfSelectedRatePlan = bfRatePlans.find((rp) => rp.name === bookingForm.rate_plan_name);
  const bfRoomAmount = bfRoomPricePerNight * bfNights * bfNumRooms;
  const bfRatePlanAmount = (bfSelectedRatePlan?.price ?? 0) * bfNights * bfNumRooms;
  const bfTotalAmount = bfRoomAmount + bfRatePlanAmount;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {showSidebar && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* ══ Main Sidebar ══ */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-64 bg-slate-900 text-slate-300 fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-auto shrink-0 overflow-y-auto`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-bold text-white leading-tight">The Tranquil Restaurant</h1>
          <button onClick={() => setShowSidebar(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Global navigation */}
        <div className="px-4 pt-4 pb-2 space-y-0.5 shrink-0">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition-colors text-sm">
            <ShoppingCart size={17} /><span>POS Terminal</span>
          </Link>
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition-colors text-sm">
            <TrendingUp size={17} /><span>Dashboard & Analytics</span>
          </Link>
          <Link to="/events" className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition-colors text-sm">
            <CalendarDays size={17} /><span>Event Management</span>
          </Link>
        </div>

        {/* Room Service sub-navigation */}
        <div className="px-4 pt-3 pb-4 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 mb-2">Room Service</p>
          <div className="space-y-0.5">
            {SUB_NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActivePage(item.id); setShowSidebar(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm text-left ${
                  activePage === item.id
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User footer */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      {/* ══ Content area ══ */}
      <div className="flex-1 overflow-y-auto min-w-0">
        {/* Sticky header */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
          <button
            onClick={() => setShowSidebar(true)}
            className="md:hidden text-slate-600 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100"
          >
            <MenuIcon size={22} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-xl shrink-0">
              <BedDouble size={20} />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Room Service</p>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">{pageTitle}</h2>
            </div>
          </div>
          <p className="ml-auto text-xs text-slate-400 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        <main className="p-4 md:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ════════════════════════════════
                  1. DASHBOARD
              ════════════════════════════════ */}
              {activePage === 'dashboard' && (
                <div className="space-y-6">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
                    <StatCard icon={<BedDouble size={18} />}   iconBg="bg-cyan-100 text-cyan-600"      label="Total Rooms"      value={totalRooms} />
                    <StatCard icon={<CheckCircle size={18} />} iconBg="bg-emerald-100 text-emerald-600" label="Available"        value={availableRooms} />
                    <StatCard icon={<Users size={18} />}       iconBg="bg-amber-100 text-amber-600"    label="Occupied"          value={occupiedRooms} />
                    <StatCard icon={<BedSingle size={18} />}   iconBg="bg-blue-100 text-blue-600"      label="Booked"            value={bookedRooms} />
                    <StatCard icon={<CalendarDays size={18} />} iconBg="bg-violet-100 text-violet-600" label="Cleaning"          value={cleaningRooms} />
                    <StatCard icon={<BookOpen size={18} />}    iconBg="bg-pink-100 text-pink-600"      label="Today's Bookings"  value={todayBookingsCount} />
                  </div>

                  {/* Room overview */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-800">Room Status Overview</h3>
                      <button onClick={() => setActivePage('room-management')} className="text-sm text-cyan-600 font-medium hover:underline">
                        Manage Rooms →
                      </button>
                    </div>
                    {rooms.length === 0 ? (
                      <EmptyState icon={<BedDouble size={32} />} message="No rooms configured yet." action="Go to Room Management" onAction={() => setActivePage('room-management')} />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {rooms.map((room) => {
                          const activeBooking = bookings.find(
                            (b) => b.room_id === room.id && b.status !== 'cancelled' && b.checkin_date <= today && b.checkout_date > today
                          );
                          return (
                            <div key={room.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                              <div className="flex items-start justify-between mb-3">
                                <div className="p-3 bg-cyan-50 rounded-xl"><BedDouble size={20} className="text-cyan-600" /></div>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[room.status]}`}>
                                  {STATUS_LABELS[room.status]}
                                </span>
                              </div>
                              <p className="font-bold text-slate-800 mb-1">{room.name}</p>
                              {activeBooking ? (
                                <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 mt-2">
                                  <p className="font-semibold">{activeBooking.customer_name}</p>
                                  <p className="text-slate-400">{activeBooking.checkin_date} → {activeBooking.checkout_date}</p>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 mt-1">No active guest</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* Today arrivals & departures preview */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <ADCard title="Today's Arrivals"   items={todayData.arrivals}   type="arrival" />
                    <ADCard title="Today's Departures" items={todayData.departures} type="departure" />
                  </div>
                </div>
              )}

              {/* ════════════════════════════════
                  2. ROOM MANAGEMENT
              ════════════════════════════════ */}
              {activePage === 'room-management' && (
                <div className="space-y-5">
                  {/* Header + status guide side by side */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Rooms</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Create, edit and manage room details and status</p>
                      {/* Status guide inline under subtitle */}
                      <div className="flex flex-wrap gap-3 mt-3">
                        {(Object.entries(STATUS_LABELS) as [RoomStatus, string][]).map(([s, l]) => (
                          <div key={s} className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[s]}`} />
                            <span className="text-[11px] font-semibold text-slate-600">{l}</span>
                            <span className="text-[11px] text-slate-400">
                              {s === 'available' ? '— Ready' : s === 'booked' ? '— Reserved' : s === 'occupied' ? '— In-house' : '— Cleaning'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => openRoomForm()}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-semibold hover:bg-cyan-700 transition-colors shrink-0"
                    >
                      <Plus size={14} /> Add Room
                    </button>
                  </div>

                  {rooms.length === 0 ? (
                    <EmptyState icon={<BedDouble size={32} />} message="No rooms yet. Add your first room." action="Add Room" onAction={() => openRoomForm()} />
                  ) : (
                    /* Group rooms by room type */
                    (['standard', 'deluxe', 'suite', 'family'] as const).map((type) => {
                      const typeRooms = rooms.filter((r) => (r.room_type || 'standard').toLowerCase() === type);
                      if (typeRooms.length === 0) return null;
                      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
                      return (
                        <div key={type}>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-5 h-px bg-slate-200 inline-block" />
                            {typeLabel} Rooms
                            <span className="w-full h-px bg-slate-100 inline-block" />
                            <span className="text-slate-400 font-medium normal-case tracking-normal shrink-0">{typeRooms.length} room{typeRooms.length !== 1 ? 's' : ''}</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {typeRooms.map((room) => {
                              // Normalise rate_plan from any DynamoDB shape
                              let plans: any[] = [];
                              const raw = (room as any).rate_plan;
                              if (Array.isArray(raw)) plans = raw;
                              else if (raw && typeof raw === 'object') plans = Object.values(raw);
                              else if (typeof raw === 'string') { try { const p = JSON.parse(raw); plans = Array.isArray(p) ? p : []; } catch { plans = []; } }

                              return (
                                <div key={room.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                  {/* Status colour band */}
                                  <div className={`h-1.5 w-full ${ room.status === 'available' ? 'bg-emerald-400' : room.status === 'occupied' ? 'bg-amber-400' : room.status === 'booked' ? 'bg-blue-400' : 'bg-purple-400' }`} />

                                  <div className="p-4 flex flex-col flex-1">
                                    {/* Top row */}
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-cyan-50 rounded-lg shrink-0">
                                          <BedDouble size={16} className="text-cyan-600" />
                                        </div>
                                        <div>
                                          <h4 className="text-base font-bold text-slate-800 leading-tight">Room {room.name}</h4>
                                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${ STATUS_COLORS[room.status] }`}>
                                            {STATUS_LABELS[room.status]}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        <button onClick={() => openRoomForm(room)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><Edit2 size={13} /></button>
                                        <button onClick={() => setDeletingRoomId(room.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                                      </div>
                                    </div>

                                    {/* Size + capacity */}
                                    {(room.room_size || room.adults || room.children) ? (
                                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                                        {room.room_size && <span className="font-medium">{room.room_size}</span>}
                                        {(room.adults || room.children) ? (
                                          <span className="flex items-center gap-1.5">
                                            <Users size={12} />
                                            {room.adults || 0}A · {room.children || 0}C
                                          </span>
                                        ) : null}
                                      </div>
                                    ) : null}

                                    {/* Base price */}
                                    {(room as any).price > 0 && (
                                      <div className="flex items-center justify-between bg-cyan-50 rounded-lg px-3 py-2 mb-3">
                                        <span className="text-xs font-semibold text-slate-500">Room Price</span>
                                        <span className="text-sm font-bold text-cyan-700">LKR {Number((room as any).price).toLocaleString()} <span className="text-xs font-medium text-slate-400">/ night</span></span>
                                      </div>
                                    )}

                                    {/* Rate Plans */}
                                    {plans.length > 0 && (
                                      <div className="mb-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Rate Plans</p>
                                        <div className="rounded-lg border border-slate-100 overflow-hidden">
                                          {plans.map((rp: any, i: number) => {
                                            const planName = typeof rp === 'string' ? rp : (rp?.name ?? `Plan ${i + 1}`);
                                            const planPrice = typeof rp === 'string' ? 0 : Number(rp?.price ?? 0);
                                            return (
                                              <div key={`${planName}-${i}`} className={`flex items-center justify-between px-2.5 py-2 ${ i % 2 === 0 ? 'bg-slate-50' : 'bg-white' }`}>
                                                <span className="text-xs font-semibold text-slate-700">{planName}</span>
                                                <span className="text-xs font-bold text-slate-800">LKR {planPrice.toLocaleString()}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Amenities */}
                                    {Array.isArray(room.amenities) && room.amenities.length > 0 && (
                                      <div className="mb-3">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Amenities</p>
                                        <div className="flex flex-wrap gap-1">
                                          {room.amenities.slice(0, 6).map((a: string) => (
                                            <span key={a} className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a}</span>
                                          ))}
                                          {room.amenities.length > 6 && (
                                            <span className="text-xs font-medium bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">+{room.amenities.length - 6}</span>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Book button */}
                                    <div className="mt-auto pt-1">
                                      {room.status === 'available' ? (
                                        <button
                                          onClick={() => { resetBookingForm(room.id); setActivePage('new-booking'); }}
                                          className="w-full py-2 bg-cyan-600 text-white rounded-lg text-sm font-semibold hover:bg-cyan-700 transition-colors"
                                        >
                                          + Book this Room
                                        </button>
                                      ) : (
                                        <div className={`w-full py-2 rounded-lg text-sm font-semibold text-center ${ room.status === 'occupied' ? 'bg-amber-50 text-amber-600' : room.status === 'booked' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600' }`}>
                                          {STATUS_LABELS[room.status]}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ════════════════════════════════
                  3. NEW BOOKING
              ════════════════════════════════ */}
              {activePage === 'new-booking' && (
                <div className="max-w-3xl space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">New Room Booking</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Reserve a room for a guest</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Reservation No.</p>
                      <p className="text-sm font-bold text-slate-800 font-mono">{bookingForm.reservation_number || '—'}</p>
                    </div>
                  </div>

                  {bookingFormSuccess && (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm font-medium">
                      <CheckCircle size={16} className="shrink-0" /> {bookingFormSuccess}
                    </div>
                  )}

                  {/* Step 1 — Dates */}
                  <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">1 — Select Dates</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <FormField label="Check-In Date *">
                        <input type="date" value={bookingForm.checkin_date}
                          onChange={(e) => setBookingForm({ ...bookingForm, checkin_date: e.target.value, room_id: '', rate_plan_name: '' })}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                      </FormField>
                      <FormField label="Check-Out Date *">
                        <input type="date" value={bookingForm.checkout_date}
                          onChange={(e) => setBookingForm({ ...bookingForm, checkout_date: e.target.value, room_id: '', rate_plan_name: '' })}
                          min={bookingForm.checkin_date || undefined}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                      </FormField>
                      <div className={`flex flex-col items-center justify-center rounded-xl border px-4 py-3 ${bfNights > 0 ? 'bg-cyan-50 border-cyan-200' : 'bg-slate-50 border-slate-100'}`}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Duration</p>
                        <p className={`text-2xl font-bold ${bfNights > 0 ? 'text-cyan-700' : 'text-slate-300'}`}>{bfNights > 0 ? bfNights : '—'}</p>
                        <p className="text-xs text-slate-500">{bfNights === 1 ? 'night' : 'nights'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 — Select Room */}
                  {bfDatesValid && (
                    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">2 — Select Room</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {(['', 'standard', 'deluxe', 'suite', 'family'] as const).map((t) => (
                            <button key={t} type="button"
                              onClick={() => setBookingForm({ ...bookingForm, room_type_filter: t, room_id: '', rate_plan_name: '' })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${bookingForm.room_type_filter === t ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                              {t === '' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {bfAvailableRooms.length === 0 ? (
                        <div className="text-center py-6">
                          <BedDouble size={28} className="text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">No rooms available for the selected dates{bookingForm.room_type_filter ? ` (${bookingForm.room_type_filter})` : ''}.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {bfAvailableRooms.map((room) => (
                            <button key={room.id} type="button"
                              onClick={() => setBookingForm({ ...bookingForm, room_id: room.id, rate_plan_name: '' })}
                              className={`p-3 rounded-xl border text-left transition-all ${bookingForm.room_id === room.id ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100' : 'border-slate-100 hover:border-cyan-200 hover:bg-slate-50'}`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <BedDouble size={13} className="text-cyan-600 shrink-0" />
                                <span className="text-sm font-bold text-slate-800">Room {room.name}</span>
                              </div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{room.room_type || 'standard'}</p>
                              {(room as any).price > 0 && (
                                <p className="text-xs font-bold text-slate-600 mt-1">LKR {Number((room as any).price).toLocaleString()}<span className="text-[10px] font-normal text-slate-400">/night</span></p>
                              )}
                              {bookingForm.room_id === room.id && (
                                <div className="flex items-center gap-1 mt-1.5">
                                  <CheckCircle size={11} className="text-cyan-600" />
                                  <span className="text-[10px] font-semibold text-cyan-600">Selected</span>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3 — Rate Plan */}
                  {bookingForm.room_id && bfRatePlans.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">3 — Rate Plan</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {bfRatePlans.map((rp) => (
                          <button key={rp.name} type="button"
                            onClick={() => setBookingForm({ ...bookingForm, rate_plan_name: rp.name })}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${bookingForm.rate_plan_name === rp.name ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100' : 'border-slate-100 hover:border-cyan-200'}`}>
                            <span className="text-sm font-semibold text-slate-700">{rp.name}</span>
                            <span className="text-sm font-bold text-slate-800">LKR {rp.price.toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 4 — Guest & Booking Details */}
                  {bookingForm.room_id && (
                    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">4 — Guest & Booking Details</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Guest Name *">
                          <input type="text" value={bookingForm.customer_name}
                            onChange={(e) => setBookingForm({ ...bookingForm, customer_name: e.target.value })}
                            placeholder="Full name"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                        <FormField label="Channel">
                          <select value={bookingForm.channel}
                            onChange={(e) => setBookingForm({ ...bookingForm, channel: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white">
                            {['FIT', 'Booking.com', 'Airbnb', 'Walk-in', 'Phone', 'Travel Agent', 'Corporate', 'Other'].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label="Phone Number">
                          <input type="tel" value={bookingForm.contact_number}
                            onChange={(e) => setBookingForm({ ...bookingForm, contact_number: e.target.value })}
                            placeholder="+94 77 000 0000"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                        <FormField label="Email">
                          <input type="email" value={bookingForm.email}
                            onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                            placeholder="guest@example.com"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                        <FormField label="Adults">
                          <input type="number" min="1" value={bookingForm.adults}
                            onChange={(e) => setBookingForm({ ...bookingForm, adults: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                        <FormField label="Children">
                          <input type="number" min="0" value={bookingForm.children}
                            onChange={(e) => setBookingForm({ ...bookingForm, children: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                        <FormField label="Payment Type">
                          <select value={bookingForm.payment_type}
                            onChange={(e) => setBookingForm({ ...bookingForm, payment_type: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white">
                            {['Cash', 'Card', 'Bank Transfer', 'Online'].map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label="Payment Status">
                          <select value={bookingForm.payment_status}
                            onChange={(e) => setBookingForm({ ...bookingForm, payment_status: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white">
                            {['Pending', 'Paid', 'Partial'].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </FormField>
                      </div>
                      <div className="mt-4">
                        <FormField label="Notes">
                          <textarea value={bookingForm.notes}
                            onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                            placeholder="Special requests, extra beds, etc."
                            rows={2}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none" />
                        </FormField>
                      </div>

                      {bookingFormError && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mt-4">
                          <AlertTriangle size={14} className="shrink-0" /> {bookingFormError}
                        </div>
                      )}

                      {/* Booking summary */}
                      {bfNights > 0 && bfSelectedRoom && (
                        <div className="bg-slate-50 rounded-xl p-4 mt-4 space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Room</p>
                              <p className="text-sm font-bold text-slate-800 mt-0.5">Room {bfSelectedRoom.name}</p>
                              <p className="text-[10px] text-slate-400 capitalize">{bfSelectedRoom.room_type}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Duration</p>
                              <p className="text-sm font-bold text-slate-800 mt-0.5">{bfNights} night{bfNights !== 1 ? 's' : ''}</p>
                              <p className="text-[10px] text-slate-400">{bfNumRooms} room{bfNumRooms !== 1 ? 's' : ''}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Guests</p>
                              <p className="text-sm font-bold text-slate-800 mt-0.5">{(parseInt(bookingForm.adults) || 1) + (parseInt(bookingForm.children) || 0)} total</p>
                              <p className="text-[10px] text-slate-400">{bookingForm.adults} adults · {bookingForm.children} children</p>
                            </div>
                            {bookingForm.rate_plan_name && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rate Plan</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5">{bookingForm.rate_plan_name}</p>
                                {bfSelectedRatePlan && <p className="text-[10px] text-slate-400">LKR {bfSelectedRatePlan.price.toLocaleString()}/night</p>}
                              </div>
                            )}
                          </div>
                          {/* Amount breakdown */}
                          <div className="border-t border-slate-200 pt-3 space-y-1.5">
                            {bfRoomAmount > 0 && (
                              <div className="flex justify-between text-xs text-slate-600">
                                <span>Room Amount <span className="text-slate-400">(LKR {bfRoomPricePerNight.toLocaleString()} × {bfNights}n × {bfNumRooms}rm)</span></span>
                                <span className="font-semibold">LKR {bfRoomAmount.toLocaleString()}</span>
                              </div>
                            )}
                            {bfRatePlanAmount > 0 && (
                              <div className="flex justify-between text-xs text-slate-600">
                                <span>Rate Plan Amount <span className="text-slate-400">(LKR {(bfSelectedRatePlan?.price ?? 0).toLocaleString()} × {bfNights}n × {bfNumRooms}rm)</span></span>
                                <span className="font-semibold">LKR {bfRatePlanAmount.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-2 mt-1">
                              <span>Total Payment</span>
                              <span className="text-cyan-700">LKR {bfTotalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => resetBookingForm()}
                          className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                          Clear
                        </button>
                        <button type="button" onClick={() => saveBooking(false)} disabled={bookingFormLoading}
                          className="flex-1 px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 transition-colors disabled:opacity-60">
                          {bookingFormLoading ? 'Creating…' : 'Create Booking'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════════════════════
                  4. ALL BOOKINGS
              ════════════════════════════════ */}
              {activePage === 'all-bookings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">All Bookings</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{bookings.length} total booking{bookings.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => { resetBookingForm(); setActivePage('new-booking'); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 transition-colors"
                    >
                      <Plus size={16} /> New Booking
                    </button>
                  </div>

                  {bookings.length === 0 ? (
                    <EmptyState icon={<ClipboardList size={32} />} message="No bookings yet." action="Create First Booking" onAction={() => { resetBookingForm(); setActivePage('new-booking'); }} />
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              {[
                                'Res. No.', 'Channel', 'Guest', 'Phone', 'Email',
                                'Room Type', 'Room No.', 'Rate Plan', '# Rooms',
                                'Check-In', 'Check-Out', 'Nights', 'Guests', 'Adults', 'Children',
                                'Room Amt', 'Rate Plan Amt', 'Total',
                                'Pay Type', 'Pay Status', 'Note', 'Booking Status', 'Created', 'Actions',
                              ].map((h) => (
                                <th key={h} className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {bookings.map((b) => {
                              const nights = (b.checkin_date && b.checkout_date)
                                ? Math.max(0, Math.ceil((new Date(b.checkout_date).getTime() - new Date(b.checkin_date).getTime()) / 86400000))
                                : 0;
                              const totalGuests = (Number(b.adults) || 0) + (Number(b.children) || 0);
                              const roomAmt = Number((b as any).room_amount ?? 0);
                              const rpAmt = Number((b as any).rate_plan_amount ?? 0);
                              const total = Number((b as any).total_amount ?? 0);
                              const payStatus = (b as any).payment_status || '—';
                              const payType = (b as any).payment_type || '—';
                              const roomType = (b as any).room_type || rooms.find((r) => r.id === b.room_id)?.room_type || '—';
                              const payStatusColor = payStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' : payStatus === 'Partial' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500';
                              return (
                                <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-3 py-3 font-mono text-[10px] text-slate-600 whitespace-nowrap">{(b as any).reservation_number || '—'}</td>
                                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{(b as any).channel || '—'}</td>
                                  <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{b.customer_name}</td>
                                  <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{b.contact_number || '—'}</td>
                                  <td className="px-3 py-3 text-slate-500 whitespace-nowrap max-w-35 truncate">{(b as any).email || '—'}</td>
                                  <td className="px-3 py-3 text-slate-600 capitalize whitespace-nowrap">{roomType}</td>
                                  <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{b.room_name || '—'}</td>
                                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{(b as any).rate_plan_name || '—'}</td>
                                  <td className="px-3 py-3 text-center text-slate-700">{(b as any).num_rooms ?? 1}</td>
                                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{b.checkin_date}</td>
                                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{b.checkout_date}</td>
                                  <td className="px-3 py-3 text-center text-slate-700">{nights}</td>
                                  <td className="px-3 py-3 text-center text-slate-700">{totalGuests || '—'}</td>
                                  <td className="px-3 py-3 text-center text-slate-700">{b.adults ?? '—'}</td>
                                  <td className="px-3 py-3 text-center text-slate-700">{b.children ?? '—'}</td>
                                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{roomAmt > 0 ? `LKR ${roomAmt.toLocaleString()}` : '—'}</td>
                                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{rpAmt > 0 ? `LKR ${rpAmt.toLocaleString()}` : '—'}</td>
                                  <td className="px-3 py-3 font-bold text-cyan-700 whitespace-nowrap">{total > 0 ? `LKR ${total.toLocaleString()}` : '—'}</td>
                                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{payType}</td>
                                  <td className="px-3 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${payStatusColor}`}>{payStatus}</span>
                                  </td>
                                  <td className="px-3 py-3 text-slate-400 max-w-30 truncate">{b.notes || '—'}</td>
                                  <td className="px-3 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize whitespace-nowrap ${BOOKING_STATUS_STYLES[b.status] || ''}`}>
                                      {b.status.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{b.created_at ? new Date(b.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}</td>
                                  <td className="px-3 py-3">
                                    <div className="flex items-center gap-1">
                                      {b.status === 'confirmed' && (
                                        <button onClick={() => updateBookingStatus(b.id, 'checked_in')} title="Check In"
                                          className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                                          <CheckCircle size={14} />
                                        </button>
                                      )}
                                      {b.status === 'checked_in' && (
                                        <button onClick={() => updateBookingStatus(b.id, 'checked_out')} title="Check Out"
                                          className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                                          <CheckCircle size={14} />
                                        </button>
                                      )}
                                      <button onClick={() => openEditBooking(b)} title="Edit"
                                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                                        <Edit2 size={14} />
                                      </button>
                                      <button onClick={() => setDeletingBookingId(b.id)} title="Delete"
                                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════════════════════
                  5. CALENDAR
              ════════════════════════════════ */}
              {activePage === 'calendar' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Booking Calendar</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Visualize room availability and booked dates</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-7 shadow-sm">
                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCalendarDate(new Date(calYear, calMonth - 1))}
                          className="p-2 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <h3 className="text-base font-bold text-slate-800 min-w-40 text-center">{monthName}</h3>
                        <button
                          onClick={() => setCalendarDate(new Date(calYear, calMonth + 1))}
                          className="p-2 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <button
                          onClick={() => setCalendarDate(new Date())}
                          className="ml-1 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Today
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-medium">Room:</label>
                        <select
                          value={selectedCalendarRoom}
                          onChange={(e) => setSelectedCalendarRoom(e.target.value)}
                          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        >
                          <option value="all">All Rooms</option>
                          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex gap-5 mb-5 flex-wrap">
                      <LegendDot color="bg-amber-400" label="Today" />
                      <LegendDot color="bg-cyan-500" label="Booked" />
                      <LegendDot color="bg-slate-100" label="Available" />
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <div key={d} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>
                      ))}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const booked = getBookingsForDate(ds).length;
                        const isToday = ds === today;
                        const isSel = ds === selectedDate;
                        return (
                          <button
                            key={ds}
                            onClick={() => setSelectedDate(isSel ? null : ds)}
                            className={`
                              aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all
                              ${isSel ? 'ring-2 ring-cyan-500 ring-offset-1 scale-105' : ''}
                              ${isToday ? 'bg-amber-400 text-white font-bold shadow' : booked > 0 ? 'bg-cyan-500 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}
                            `}
                          >
                            <span>{day}</span>
                            {booked > 0 && !isToday && <span className="text-[9px] opacity-80">{booked}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected date detail */}
                    {selectedDate && (
                      <div className="mt-6 border-t border-slate-100 pt-5">
                        <h4 className="text-sm font-bold text-slate-700 mb-3">
                          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </h4>
                        {getBookingsForDate(selectedDate).length === 0 ? (
                          <p className="text-sm text-slate-400">No bookings on this date.</p>
                        ) : (
                          <div className="space-y-2">
                            {getBookingsForDate(selectedDate).map((b) => (
                              <div key={b.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                                <BedDouble size={16} className="text-cyan-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800">{b.room_name}</p>
                                  <p className="text-xs text-slate-500 truncate">{b.customer_name} · {b.checkin_date} → {b.checkout_date}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize shrink-0 ${BOOKING_STATUS_STYLES[b.status] || ''}`}>
                                  {b.status.replace('_', ' ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ════════════════════════════════
                  6. ARRIVALS & DEPARTURES
              ════════════════════════════════ */}
              {activePage === 'arrivals-departures' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Arrivals & Departures</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Summary pills */}
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-4 py-2.5 text-sm font-semibold">
                      <PlaneLanding size={16} /> {todayData.arrivals.length} Arrival{todayData.arrivals.length !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl px-4 py-2.5 text-sm font-semibold">
                      <PlaneTakeoff size={16} /> {todayData.departures.length} Departure{todayData.departures.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Arrivals */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border-b border-emerald-100">
                        <PlaneLanding size={20} className="text-emerald-600" />
                        <h4 className="font-bold text-emerald-800">Today's Arrivals</h4>
                        <span className="ml-auto bg-emerald-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{todayData.arrivals.length}</span>
                      </div>
                      {todayData.arrivals.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">No check-ins scheduled today</div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {todayData.arrivals.map((b) => (
                            <div key={b.id} className="flex items-center gap-4 px-5 py-4">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                                {b.customer_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 truncate">{b.customer_name}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <BedDouble size={11} /> {b.room_name}
                                  {b.contact_number && <><Phone size={11} className="ml-1" />{b.contact_number}</>}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-semibold text-emerald-600">Check-in</p>
                                <p className="text-xs text-slate-400">{b.checkin_date}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Departures */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border-b border-amber-100">
                        <PlaneTakeoff size={20} className="text-amber-600" />
                        <h4 className="font-bold text-amber-800">Today's Departures</h4>
                        <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{todayData.departures.length}</span>
                      </div>
                      {todayData.departures.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">No check-outs scheduled today</div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {todayData.departures.map((b) => (
                            <div key={b.id} className="flex items-center gap-4 px-5 py-4">
                              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                                {b.customer_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 truncate">{b.customer_name}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <BedDouble size={11} /> {b.room_name}
                                  {b.contact_number && <><Phone size={11} className="ml-1" />{b.contact_number}</>}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-semibold text-amber-600">Check-out</p>
                                <p className="text-xs text-slate-400">{b.checkout_date}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════
                  NEW EXPENSE
              ════════════════════════════════ */}
              {activePage === 'new-expense' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Expense <span className="text-sm font-normal text-slate-500">Add/Update Expense</span></h3>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    {expenseFormError && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mb-5">
                        <AlertTriangle size={14} className="shrink-0" /> {expenseFormError}
                      </div>
                    )}
                    {expenseFormSuccess && (
                      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100 mb-5">
                        <CheckCircle size={14} className="shrink-0" /> {expenseFormSuccess}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left column */}
                      <div className="space-y-4">
                        <FormField label="Expense Date *">
                          <input type="date" value={expenseForm.expense_date}
                            onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                        <FormField label="Category *">
                          <select value={expenseForm.category_id}
                            onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white">
                            <option value="">-Select-</option>
                            {expenseCategories.filter((c) => c.status === 'active').map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label="Expense for *">
                          <input type="text" value={expenseForm.expense_for}
                            onChange={(e) => setExpenseForm({ ...expenseForm, expense_for: e.target.value })}
                            placeholder="What is this expense for?"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                        <FormField label="Amount *">
                          <input type="number" min="0" step="0.01" value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            placeholder="0.00"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                      </div>
                      {/* Right column */}
                      <div className="space-y-4">
                        <FormField label="Reference No.">
                          <input type="text" value={expenseForm.reference_no}
                            onChange={(e) => setExpenseForm({ ...expenseForm, reference_no: e.target.value })}
                            placeholder="e.g. INV-001"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                        </FormField>
                        <FormField label="Image">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => setExpenseForm(f => ({ ...f, image: reader.result as string }));
                              reader.readAsDataURL(file);
                            }}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                          {expenseForm.image && (
                            <div className="relative mt-2">
                              <img src={expenseForm.image} alt="Expense" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                              <button
                                type="button"
                                onClick={() => setExpenseForm(f => ({ ...f, image: '' }))}
                                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </FormField>
                        <FormField label="Note">
                          <textarea value={expenseForm.note}
                            onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
                            placeholder="Additional notes…"
                            rows={4}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none" />
                        </FormField>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-6 justify-center">
                      <button onClick={saveExpense} disabled={expenseFormLoading}
                        className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60">
                        {expenseFormLoading ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => resetExpenseForm()}
                        className="px-8 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════
                  EXPENSES LIST
              ════════════════════════════════ */}
              {activePage === 'expenses-list' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Expenses List <span className="text-sm font-normal text-slate-500">View/Search Expenses</span></h3>
                    </div>
                    <button onClick={() => { resetExpenseForm(); setActivePage('new-expense'); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 transition-colors">
                      <Plus size={15} /> New Expense
                    </button>
                  </div>
                  {expenses.length === 0 ? (
                    <EmptyState icon={<Receipt size={32} />} message="No expenses recorded yet." action="Add First Expense" onAction={() => { resetExpenseForm(); setActivePage('new-expense'); }} />
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              {['Date', 'Category', 'Reference No.', 'Expense for', 'Amount', 'Image', 'Note', 'Created by', 'Actions'].map((h) => (
                                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {expenses.map((e) => (
                              <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{e.expense_date}</td>
                                <td className="px-4 py-3.5 font-semibold text-slate-800">{e.category_name || '—'}</td>
                                <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{e.reference_no || '—'}</td>
                                <td className="px-4 py-3.5 text-slate-700">{e.expense_for}</td>
                                <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3.5">
                                  {e.image
                                    ? <img src={e.image} alt="expense" className="w-12 h-10 object-cover rounded-lg border border-slate-200 cursor-pointer" onClick={() => window.open(e.image, '_blank')} />
                                    : <span className="text-slate-400">—</span>}
                                </td>
                                <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">{e.note || '—'}</td>
                                <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{e.created_by || '—'}</td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => { resetExpenseForm(e); setActivePage('new-expense'); }} title="Edit"
                                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                                      <Edit2 size={15} />
                                    </button>
                                    <button onClick={() => setDeletingExpenseId(e.id)} title="Delete"
                                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 border-t border-slate-200">
                            <tr>
                              <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Total</td>
                              <td className="px-4 py-3 font-bold text-slate-800">
                                {expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td colSpan={4} />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════════════════════
                  NEW CATEGORY
              ════════════════════════════════ */}
              {activePage === 'new-category' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Expense Category <span className="text-sm font-normal text-slate-500">Add/Update Expense Category</span></h3>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-lg">
                    {categoryFormError && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mb-5">
                        <AlertTriangle size={14} className="shrink-0" /> {categoryFormError}
                      </div>
                    )}
                    {categoryFormSuccess && (
                      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100 mb-5">
                        <CheckCircle size={14} className="shrink-0" /> {categoryFormSuccess}
                      </div>
                    )}
                    <div className="space-y-4">
                      <FormField label="Category Name *">
                        <input type="text" value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          placeholder="e.g. Utilities, Salaries…"
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                      </FormField>
                      <FormField label="Description">
                        <textarea value={categoryForm.description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                          placeholder="Optional description"
                          rows={3}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none" />
                      </FormField>
                    </div>
                    <div className="flex gap-3 pt-6 justify-center">
                      <button onClick={saveCategory} disabled={categoryFormLoading}
                        className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60">
                        {categoryFormLoading ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => resetCategoryForm()}
                        className="px-8 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════
                  CATEGORIES LIST
              ════════════════════════════════ */}
              {activePage === 'categories-list' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Expense Category List</h3>
                    </div>
                    <button onClick={() => { resetCategoryForm(); setActivePage('new-category'); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 transition-colors">
                      <Plus size={15} /> New Category
                    </button>
                  </div>
                  {expenseCategories.length === 0 ? (
                    <EmptyState icon={<Tag size={32} />} message="No expense categories yet." action="Add First Category" onAction={() => { resetCategoryForm(); setActivePage('new-category'); }} />
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            {['Category Name', 'Description', 'Status', 'Action'].map((h) => (
                              <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {expenseCategories.map((cat) => (
                            <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-5 py-3.5 font-semibold text-slate-800">{cat.name}</td>
                              <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">{cat.description || '—'}</td>
                              <td className="px-5 py-3.5">
                                <button onClick={() => toggleCategoryStatus(cat)}
                                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${cat.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                  {cat.status === 'active' ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => { resetCategoryForm(cat); setActivePage('new-category'); }} title="Edit"
                                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                                    <Edit2 size={15} />
                                  </button>
                                  <button onClick={() => setDeletingCategoryId(cat.id)} title="Delete"
                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ══ Modals ══ */}

      {/* Room form */}
      {showRoomForm && (
        <Modal title={editingRoom ? 'Edit Room' : 'Add Room'} onClose={() => setShowRoomForm(false)} wide>
          <div className="space-y-6">

            {/* ── Room Details ── */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Room Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Room Type *">
                  <select value={roomForm.room_type} onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400">
                    <option value="standard">Standard</option>
                    <option value="deluxe">Deluxe</option>
                    <option value="suite">Suite</option>
                    <option value="family">Family</option>
                  </select>
                </FormField>
                <FormField label="Room No *">
                  <input type="text" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                    placeholder="e.g. 101"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </FormField>
                <FormField label="Room Size">
                  <input type="text" value={roomForm.room_size} onChange={(e) => setRoomForm({ ...roomForm, room_size: e.target.value })}
                    placeholder="e.g. 30 sqm"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </FormField>
                <FormField label="Room Status">
                  <select value={roomForm.status} onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value as RoomStatus })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400">
                    {(Object.entries(STATUS_LABELS) as [RoomStatus, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </FormField>
              </div>
            </div>

            {/* ── Capacity ── */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Capacity</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Adults">
                  <input type="number" min="1" value={roomForm.adults} onChange={(e) => setRoomForm({ ...roomForm, adults: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </FormField>
                <FormField label="Children">
                  <input type="number" min="0" value={roomForm.children} onChange={(e) => setRoomForm({ ...roomForm, children: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </FormField>
              </div>
            </div>

            {/* ── Rate Plan ── */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Pricing</p>
              <FormField label="Room Price per Night (LKR)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">LKR</span>
                  <input type="number" min="0" value={roomForm.price} onChange={(e) => setRoomForm({ ...roomForm, price: e.target.value })}
                    placeholder="0"
                    className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
              </FormField>
            </div>

            {/* ── Rate Plan ── */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Rate Plan</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={ratePlanInput}
                  onChange={(e) => setRatePlanInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRatePlan(); } }}
                  placeholder="Plan name (e.g. EP, CP, MAP…)"
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <div className="relative shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">LKR</span>
                  <input
                    type="number"
                    min="0"
                    value={ratePlanPriceInput}
                    onChange={(e) => setRatePlanPriceInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRatePlan(); } }}
                    placeholder="Price"
                    className="w-32 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
                <button type="button" onClick={addRatePlan}
                  className="px-4 py-2.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-xl text-sm font-semibold hover:bg-cyan-100 transition-colors shrink-0">
                  + Add
                </button>
              </div>
              {roomRatePlans.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {roomRatePlans.map((rp) => (
                    <span key={rp.name} className="flex items-center gap-1.5 text-xs bg-cyan-50 text-cyan-700 border border-cyan-100 px-2.5 py-1 rounded-full">
                      <span className="font-semibold">{rp.name}</span>
                      {rp.price && <span className="text-cyan-500">LKR {parseFloat(rp.price).toLocaleString()}</span>}
                      <button type="button" onClick={() => setRoomRatePlans(roomRatePlans.filter((x) => x.name !== rp.name))}
                        className="text-cyan-400 hover:text-red-500 ml-0.5">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Amenities ── */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Room Amenities</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(); } }}
                  placeholder="e.g. AC, WiFi, TV, Safe…"
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <button type="button" onClick={addAmenity}
                  className="px-4 py-2.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-xl text-sm font-semibold hover:bg-cyan-100 transition-colors shrink-0">
                  + Add
                </button>
              </div>
              {roomAmenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {roomAmenities.map((a) => (
                    <span key={a} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                      {a}
                      <button type="button" onClick={() => setRoomAmenities(roomAmenities.filter((x) => x !== a))}
                        className="text-slate-400 hover:text-red-500 ml-0.5">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {roomFormError && <p className="text-sm text-red-500">{roomFormError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowRoomForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={saveRoom} disabled={roomFormLoading} className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
                {roomFormLoading ? 'Saving…' : editingRoom ? 'Save Changes' : 'Add Room'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit booking modal */}
      {showEditBookingModal && editingBooking && (
        <Modal title="Edit Booking" onClose={() => setShowEditBookingModal(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Room *">
                <select value={bookingForm.room_id} onChange={(e) => setBookingForm({ ...bookingForm, room_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400">
                  <option value="">Select a room</option>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} — {STATUS_LABELS[r.status]}</option>)}
                </select>
              </FormField>
              <FormField label="Customer Name *">
                <input type="text" value={bookingForm.customer_name} onChange={(e) => setBookingForm({ ...bookingForm, customer_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </FormField>
              <FormField label="Contact Number">
                <input type="tel" value={bookingForm.contact_number} onChange={(e) => setBookingForm({ ...bookingForm, contact_number: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </FormField>
              <FormField label="Email">
                <input type="email" value={bookingForm.email} onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </FormField>
              <FormField label="Channel">
                <select value={bookingForm.channel} onChange={(e) => setBookingForm({ ...bookingForm, channel: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white">
                  {['FIT', 'Booking.com', 'Airbnb', 'Walk-in', 'Phone', 'Travel Agent', 'Corporate', 'Other'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Rate Plan">
                <input type="text" value={bookingForm.rate_plan_name} onChange={(e) => setBookingForm({ ...bookingForm, rate_plan_name: e.target.value })}
                  placeholder="e.g. EP, MAP, AP"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </FormField>
              <FormField label="Number of Rooms">
                <input type="number" min="1" value={bookingForm.num_rooms} onChange={(e) => setBookingForm({ ...bookingForm, num_rooms: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </FormField>
              <FormField label="Adults">
                <input type="number" min="1" value={bookingForm.adults} onChange={(e) => setBookingForm({ ...bookingForm, adults: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </FormField>
              <FormField label="Children">
                <input type="number" min="0" value={bookingForm.children} onChange={(e) => setBookingForm({ ...bookingForm, children: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </FormField>
              <FormField label="Check-In Date *">
                <input type="date" value={bookingForm.checkin_date} onChange={(e) => setBookingForm({ ...bookingForm, checkin_date: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </FormField>
              <FormField label="Check-Out Date *">
                <input type="date" value={bookingForm.checkout_date} onChange={(e) => setBookingForm({ ...bookingForm, checkout_date: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </FormField>
              <FormField label="Payment Type">
                <select value={bookingForm.payment_type} onChange={(e) => setBookingForm({ ...bookingForm, payment_type: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white">
                  {['Cash', 'Card', 'Bank Transfer', 'Online'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Payment Status">
                <select value={bookingForm.payment_status} onChange={(e) => setBookingForm({ ...bookingForm, payment_status: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white">
                  {['Pending', 'Paid', 'Partial'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Notes" className="md:col-span-2">
                <textarea value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none" />
              </FormField>
            </div>
            {bookingFormError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                <AlertTriangle size={14} /> {bookingFormError}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowEditBookingModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={() => saveBooking(true)} disabled={bookingFormLoading} className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
                {bookingFormLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete room */}
      {deletingRoomId && (
        <Modal title="Delete Room" onClose={() => setDeletingRoomId(null)}>
          <p className="text-slate-600 text-sm mb-5">Delete this room permanently?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingRoomId(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
            <button onClick={() => deleteRoom(deletingRoomId)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Delete</button>
          </div>
        </Modal>
      )}

      {/* Delete booking */}
      {deletingBookingId && (
        <Modal title="Delete Booking" onClose={() => setDeletingBookingId(null)}>
          <p className="text-slate-600 text-sm mb-5">Permanently delete this booking?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingBookingId(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
            <button onClick={() => deleteBooking(deletingBookingId)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Delete</button>
          </div>
        </Modal>
      )}

      {/* Delete expense */}
      {deletingExpenseId && (
        <Modal title="Delete Expense" onClose={() => setDeletingExpenseId(null)}>
          <p className="text-slate-600 text-sm mb-5">Permanently delete this expense?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingExpenseId(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
            <button onClick={() => deleteExpense(deletingExpenseId)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Delete</button>
          </div>
        </Modal>
      )}

      {/* Delete expense category */}
      {deletingCategoryId && (
        <Modal title="Delete Category" onClose={() => setDeletingCategoryId(null)}>
          <p className="text-slate-600 text-sm mb-5">Permanently delete this category?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingCategoryId(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
            <button onClick={() => deleteCategory(deletingCategoryId)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatCard({ icon, iconBg, label, value }: { icon: React.ReactNode; iconBg: string; label: string; value: number }) {
  return (
    <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{label}</p>
          <p className="text-xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ADCard({ title, items, type }: { title: string; items: RoomBooking[]; type: 'arrival' | 'departure' }) {
  const isArrival = type === 'arrival';
  const bg = isArrival ? 'bg-emerald-50' : 'bg-amber-50';
  const iconColor = isArrival ? 'text-emerald-600' : 'text-amber-600';
  const badge = isArrival ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
  const Icon = isArrival ? PlaneLanding : PlaneTakeoff;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-xl ${bg}`}><Icon size={18} className={iconColor} /></div>
        <h3 className="font-bold text-slate-800">{title}</h3>
        <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${badge}`}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">None today</p>
      ) : (
        <div className="space-y-2">
          {items.map((b) => (
            <div key={b.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${bg} ${iconColor}`}>
                {b.customer_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{b.customer_name}</p>
                <p className="text-xs text-slate-400 truncate">{b.room_name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-500">{isArrival ? b.checkin_date : b.checkout_date}</p>
                {b.contact_number && <p className="text-[10px] text-slate-400">{b.contact_number}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, message, action, onAction }: { icon: React.ReactNode; message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
      <div className="text-slate-300 flex justify-center mb-3">{icon}</div>
      <p className="text-slate-500 font-medium mb-4">{message}</p>
      {action && onAction && (
        <button onClick={onAction} className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 transition-colors">
          {action}
        </button>
      )}
    </div>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
      <span className={`w-3 h-3 rounded-full shrink-0 ${color}`} />{label}
    </div>
  );
}
