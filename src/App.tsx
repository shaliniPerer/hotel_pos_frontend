/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import POS from './pages/POS';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import RoomService from './pages/RoomService';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import EventsDashboard from './pages/EventsDashboard';
import ExpensesDashboard from './pages/ExpensesDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { useStore } from './store';

export default function App() {
  const verifyToken = useStore((state) => state.verifyToken);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <POS />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room-service"
          element={
            <ProtectedRoute>
              <RoomService />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <Expenses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events-dashboard"
          element={
            <ProtectedRoute>
              <EventsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses-dashboard"
          element={
            <ProtectedRoute>
              <ExpensesDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


