import React, { useEffect, useState } from 'react';
import {
  Bell, Bus, Users, MapPin, Info, MessageSquare,
  Loader2, Trash2,
} from 'lucide-react';
import {
  AppNotification,
  subscribeNotifications,
  addNotification,
} from '../services/firestore';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

// ── Icon + colour per notification type ──────────────────────────────────────

type TypeCfg = { icon: React.ElementType; bg: string; text: string; label: string };

const typeConfig: Record<string, TypeCfg> = {
  driver_added: {
    icon: Bus,
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    label: 'Driver',
  },
  passenger_registered: {
    icon: Users,
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    label: 'Passenger',
  },
  bus_started: {
    icon: MapPin,
    bg: 'bg-green-50',
    text: 'text-green-600',
    label: 'Bus Started',
  },
  bus_stopped: {
    icon: MapPin,
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    label: 'Bus Stopped',
  },
  driver_support: {
    icon: MessageSquare,
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    label: 'Driver Support',
  },
  passenger_feedback: {
    icon: MessageSquare,
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    label: 'Passenger Feedback',
  },
  admin_reply: {
    icon: MessageSquare,
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    label: 'Admin Reply',
  },
  info: {
    icon: Info,
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    label: 'Info',
  },
};

// Fallback for any unknown type
const defaultCfg: TypeCfg = {
  icon: Bell,
  bg: 'bg-gray-50',
  text: 'text-gray-500',
  label: 'Notification',
};

// ── Time formatter ────────────────────────────────────────────────────────────

function timeAgo(ts: any): string {
  if (!ts?.seconds) return 'Just now';
  const diff = Math.floor(Date.now() / 1000) - ts.seconds;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts.seconds * 1000).toLocaleDateString();
}

// ── Send test notification modal ──────────────────────────────────────────────

const SendModal = ({ onClose }: { onClose: () => void }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<string>('info');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setLoading(true);
    try {
      await addNotification(title.trim(), message.trim(), type);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Send Notification</h2>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Service Update"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/25 focus:border-[#800000]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Message
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Notification message…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/25 focus:border-[#800000] resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/25 focus:border-[#800000]"
            >
              <option value="info">Info</option>
              <option value="driver_added">Driver Added</option>
              <option value="passenger_registered">Passenger Registered</option>
              <option value="bus_started">Bus Started</option>
              <option value="bus_stopped">Bus Stopped</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[#800000] text-white rounded-xl text-sm font-semibold hover:bg-[#700000] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeNotifications((data) => {
      setNotifications(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#800000] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#700000] transition-colors shadow-sm"
        >
          <Bell className="h-4 w-4" />
          Send Notification
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">All Notifications</h2>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#800000]" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm mt-1">
              Notifications appear here when drivers are added, passengers register, etc.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {notifications.map((n) => {
              const cfg = typeConfig[n.type] ?? defaultCfg;
              const Icon = cfg.icon;
              return (
                <li
                  key={n.id}
                  className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors group"
                >
                  <div className={`h-10 w-10 rounded-xl ${cfg.bg} ${cfg.text} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(n.id)}
                    disabled={deletingId === n.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    {deletingId === n.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showModal && <SendModal onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default Notifications;
