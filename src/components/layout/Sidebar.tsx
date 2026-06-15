import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Route as RouteIcon, 
  Users, 
  UserSquare2, 
  Bell, 
  LogOut, 
  Bus,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: MapIcon, label: 'Live Tracking', path: '/tracking' },
    { icon: RouteIcon, label: 'Routes', path: '/routes' },
    { icon: UserSquare2, label: 'Drivers', path: '/drivers' },
    { icon: Users, label: 'Users', path: '/users' },
    { icon: AlertTriangle, label: 'Bus Alerts', path: '/bus-alerts' },
    { icon: MessageSquare, label: 'Support', path: '/support' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
  ];

  return (
    /* Sidebar ab hamesha Maroon (#800000) background mein rahega */
    <div className="w-64 h-screen bg-[#800000] border-r border-[#700000] flex flex-col fixed left-0 top-0 shadow-xl">
      
      {/* Logo Section */}
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-md">
          <Bus className="h-6 w-6 text-[#800000]" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">GoRoute</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
              ${isActive 
                ? 'bg-white text-[#800000] shadow-lg font-bold' 
                : 'text-white/80 hover:bg-white/10 hover:text-white'}
            `}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Controls */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-white/80 hover:bg-red-600 hover:text-white rounded-xl transition-all"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;