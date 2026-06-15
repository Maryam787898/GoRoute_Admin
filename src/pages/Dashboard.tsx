import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  Users,
  UserCheck,
  Route as RouteIcon,
  ShieldCheck,
  Mail,
  Circle,
  Bus,
  Activity,
} from 'lucide-react';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'passenger' | 'driver' | 'admin';
  isOnline: boolean;
  isActive: boolean;
  createdAt: Timestamp;
  lastLogin?: Timestamp;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
  pulse = false,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  pulse?: boolean;
}) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
    <div className={`h-14 w-14 ${color} rounded-2xl flex items-center justify-center shrink-0`}>
      <Icon size={26} />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {pulse && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
        )}
      </div>
    </div>
  </div>
);

// ── Active users section ──────────────────────────────────────────────────────

const ActiveUsersSection = ({
  title,
  users,
  emptyMsg,
  avatarColor,
}: {
  title: string;
  users: UserProfile[];
  emptyMsg: string;
  avatarColor: string;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
        {users.length} online
      </span>
    </div>
    {users.length === 0 ? (
      <div className="py-10 text-center text-gray-400 text-sm">{emptyMsg}</div>
    ) : (
      <ul className="divide-y divide-gray-50">
        {users.map((u) => (
          <li key={u.uid} className="px-6 py-3 flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full ${avatarColor} flex items-center justify-center font-bold text-sm shrink-0`}>
              {u.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
              <p className="text-xs text-gray-400 truncate">{u.email}</p>
            </div>
            <span className="flex items-center gap-1 text-xs text-green-600 font-semibold shrink-0">
              <Circle size={7} fill="currentColor" />
              Online
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const admin = auth.currentUser;

  const [counts, setCounts] = useState({
    passengers: 0,
    drivers: 0,
    onlineDrivers: 0,
    onlinePassengers: 0,
    activeRoutes: 0,
  });

  const [activeDrivers, setActiveDrivers] = useState<UserProfile[]>([]);
  const [activePassengers, setActivePassengers] = useState<UserProfile[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── All users stream ──────────────────────────────────────────────
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const all = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));

      const passengers = all.filter((u) => u.role === 'passenger');
      const drivers = all.filter((u) => u.role === 'driver');
      const onlineDrivers = drivers.filter((u) => u.isOnline);
      const onlinePassengers = passengers.filter((u) => u.isOnline);

      setCounts((prev) => ({
        ...prev,
        passengers: passengers.length,
        drivers: drivers.length,
        onlineDrivers: onlineDrivers.length,
        onlinePassengers: onlinePassengers.length,
      }));

      setActiveDrivers(onlineDrivers);
      setActivePassengers(onlinePassengers);

      // Recent users table — exclude admins, sort by createdAt desc
      const sorted = all
        .filter((u) => u.role !== 'admin')
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        .slice(0, 10);
      setRecentUsers(sorted);
      setLoading(false);
    });

    // ── Active routes stream ──────────────────────────────────────────
    const unsubRoutes = onSnapshot(
      query(collection(db, 'routes'), where('isActive', '==', true)),
      (snap) => setCounts((prev) => ({ ...prev, activeRoutes: snap.size }))
    );

    return () => {
      unsubUsers();
      unsubRoutes();
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time system overview</p>
        </div>

        {admin && (
          <div className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-2.5">
            <div className="h-9 w-9 rounded-full bg-[#800000] text-white flex items-center justify-center font-bold text-sm">
              {(admin.displayName ?? admin.email ?? 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-bold text-gray-900 leading-none">
                  {admin.displayName ?? 'Admin'}
                </p>
                <ShieldCheck className="h-3.5 w-3.5 text-[#800000]" />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{admin.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Users}
          label="Total Passengers"
          value={counts.passengers}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Bus}
          label="Total Drivers"
          value={counts.drivers}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={Activity}
          label="Drivers Online"
          value={counts.onlineDrivers}
          color="bg-green-50 text-green-600"
          pulse={counts.onlineDrivers > 0}
        />
        <StatCard
          icon={UserCheck}
          label="Passengers Online"
          value={counts.onlinePassengers}
          color="bg-teal-50 text-teal-600"
          pulse={counts.onlinePassengers > 0}
        />
        <StatCard
          icon={RouteIcon}
          label="Active Routes"
          value={counts.activeRoutes}
          color="bg-orange-50 text-orange-600"
          pulse={counts.activeRoutes > 0}
        />
      </div>

      {/* Active users — real-time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveUsersSection
          title="Active Drivers"
          users={activeDrivers}
          emptyMsg="No drivers online right now"
          avatarColor="bg-purple-100 text-purple-700"
        />
        <ActiveUsersSection
          title="Active Passengers"
          users={activePassengers}
          emptyMsg="No passengers online right now"
          avatarColor="bg-blue-100 text-blue-700"
        />
      </div>

      {/* Recent users table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Users</h2>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3 text-left">User</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                    No users yet
                  </td>
                </tr>
              ) : (
                recentUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm">
                          {user.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Mail size={10} />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                        user.role === 'driver'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                        user.isOnline ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <Circle size={7} fill="currentColor" />
                        {user.isOnline ? 'Online' : 'Offline'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {user.createdAt
                        ? new Date(user.createdAt.seconds * 1000).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
