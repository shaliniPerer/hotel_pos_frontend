import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, TrendingUp, CalendarDays, BedDouble, Receipt,
  LogOut, X, List, Tag, FileText, LayoutDashboard, BookOpen,
  ClipboardList, Calendar, PlaneLanding,
} from 'lucide-react';
import { useStore } from '../store';

interface AppSidebarProps {
  show: boolean;
  onClose: () => void;
  /** Extra nav items rendered inside the Room Management section */
  roomManagementSlot?: React.ReactNode;
  /** Extra nav items rendered inside the Expenses section */
  expensesSlot?: React.ReactNode;
}

export default function AppSidebar({
  show,
  onClose,
  roomManagementSlot,
  expensesSlot,
}: AppSidebarProps) {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeCls: Record<string, string> = {
    cyan:   'bg-cyan-600 text-white font-semibold',
    violet: 'bg-violet-600 text-white font-semibold',
    teal:   'bg-teal-600 text-white font-semibold',
    orange: 'bg-orange-500 text-white font-semibold',
  };

  const linkCls = (active: boolean, color = 'cyan') =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm text-left ${
      active ? activeCls[color] : 'hover:bg-slate-800 text-slate-300'
    }`;

  return (
    <>
      {/* Mobile backdrop */}
      {show && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`${
          show ? 'flex' : 'hidden'
        } md:flex flex-col w-64 bg-slate-900 text-slate-300 fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-auto shrink-0 overflow-y-auto`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base font-bold text-white leading-tight">The Tranquil</h1>
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Hotel & Restaurant</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav sections */}
        <div className="flex-1 px-4 py-5 space-y-5 overflow-y-auto custom-scrollbar">

          {/* ── Hotel Management System ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-500 px-2 mb-2">
              Hotel Management System
            </p>
            <div className="space-y-0.5">
              <Link
                to="/"
                onClick={onClose}
                className={linkCls(path === '/', 'cyan')}
              >
                <ShoppingCart size={16} className="shrink-0" />
                <span>POS</span>
              </Link>
              <Link
                to="/dashboard"
                onClick={onClose}
                className={linkCls(path === '/dashboard', 'cyan')}
              >
                <TrendingUp size={16} className="shrink-0" />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>

          {/* ── Event Management System ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 px-2 mb-2">
              Event Management System
            </p>
            <div className="space-y-0.5">
              <Link
                to="/events"
                onClick={onClose}
                className={linkCls(path === '/events', 'violet')}
              >
                <CalendarDays size={16} className="shrink-0" />
                <span>Event Management</span>
              </Link>
              <Link
                to="/events-dashboard"
                onClick={onClose}
                className={linkCls(path === '/events-dashboard', 'violet')}
              >
                <TrendingUp size={16} className="shrink-0" />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>

          {/* ── Room Management ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400 px-2 mb-2">
              Room Management
            </p>
            <div className="space-y-0.5">
              {roomManagementSlot ?? (
                <>
                  <Link to="/room-service" onClick={onClose} className={linkCls(path === '/room-service', 'teal')}>
                    <LayoutDashboard size={16} className="shrink-0" />
                    <span>Dashboard</span>
                  </Link>
                  <Link to="/room-service" onClick={onClose} className={linkCls(false, 'teal')}>
                    <Calendar size={16} className="shrink-0" />
                    <span>Calendar</span>
                  </Link>
                  <Link to="/room-service" onClick={onClose} className={linkCls(false, 'teal')}>
                    <BedDouble size={16} className="shrink-0" />
                    <span>Room Management</span>
                  </Link>
                  <Link to="/room-service" onClick={onClose} className={linkCls(false, 'teal')}>
                    <BookOpen size={16} className="shrink-0" />
                    <span>New Booking</span>
                  </Link>
                  <Link to="/room-service" onClick={onClose} className={linkCls(false, 'teal')}>
                    <ClipboardList size={16} className="shrink-0" />
                    <span>All Bookings</span>
                  </Link>
                  <Link to="/room-service" onClick={onClose} className={linkCls(false, 'teal')}>
                    <PlaneLanding size={16} className="shrink-0" />
                    <span>Arrivals &amp; Departures</span>
                  </Link>
                  <Link to="/room-service" onClick={onClose} className={linkCls(false, 'teal')}>
                    <FileText size={16} className="shrink-0" />
                    <span>Booking Report</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ── Expenses ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400 px-2 mb-2">
              Expenses
            </p>
            <div className="space-y-0.5">
              {expensesSlot ?? (
                <>
                  <Link to="/expenses" onClick={onClose} className={linkCls(path === '/expenses', 'orange')}>
                    <List size={16} className="shrink-0" />
                    <span>Expenses List</span>
                  </Link>
                  <Link to="/expenses" onClick={onClose} className={linkCls(false, 'orange')}>
                    <Receipt size={16} className="shrink-0" />
                    <span>New Expense</span>
                  </Link>
                  <Link to="/expenses" onClick={onClose} className={linkCls(false, 'orange')}>
                    <FileText size={16} className="shrink-0" />
                    <span>Categories List</span>
                  </Link>
                  <Link to="/expenses" onClick={onClose} className={linkCls(false, 'orange')}>
                    <Tag size={16} className="shrink-0" />
                    <span>New Category</span>
                  </Link>
                  <Link to="/expenses-dashboard" onClick={onClose} className={linkCls(path === '/expenses-dashboard', 'orange')}>
                    <TrendingUp size={16} className="shrink-0" />
                    <span>Dashboard</span>
                  </Link>
                </>
              )}
            </div>
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
    </>
  );
}
