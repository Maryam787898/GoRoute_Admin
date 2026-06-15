import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Loader2 } from 'lucide-react';

const Layout = () => {
  const { currentUser, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin h-10 w-10 text-[#800000]" />
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
