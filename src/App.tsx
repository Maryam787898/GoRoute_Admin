import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Drivers from './pages/Drivers';
import Passengers from './pages/Passengers';
import AppRoutes from './pages/Routes';
import LiveTracking from './pages/LiveTracking';
import Notifications from './pages/Notifications';
import ProtectedRoute from './components/ProtectedRoute';

import SupportRequests from './pages/SupportRequests';
import BusAlerts from './pages/BusAlerts';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected admin routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="users" element={<Passengers />} />
            <Route path="routes" element={<AppRoutes />} />
            <Route path="tracking" element={<LiveTracking />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="support" element={<SupportRequests />} />
            <Route path="bus-alerts" element={<BusAlerts />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
