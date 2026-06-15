import React, { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Bus, AlertTriangle, Clock, MapPin, Play,
  Loader2, Trash2, Send, Bell,
} from 'lucide-react';

// ── Alert type config ─────────────────────────────────────────────────────────

const alertTypes = [
  {
    value: 'delay',
    label: 'Bus Delay',
    icon: Clock,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    description: 'Notify passengers about a bus delay',
  },
  {
    value: 'start',
    label: 'Bus Starting',
    icon: Play,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    description: 'Notify passengers that bus has started',
  },
  {
    value: 'arrival',
    label: 'Bus Arrival',
    icon: MapPin,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    description: 'Notify passengers about bus arrival',
  },
  {
    value: 'emergency',
    label: 'Emergency Alert',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    description: 'Send an emergency alert to all passengers',
  },
];

function getTypeCfg(type: string) {
  return alertTypes.find((t) => t.value === type) ?? alertTypes[0];
}

function timeAgo(ts: Timestamp | null): string {
  if (!ts?.seconds) return '';
  const diff = Math.floor(Date.now() / 1000) - ts.seconds;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts.seconds * 1000).toLocaleDateString();
}

// ── Alert history item ────────────────────────────────────────────────────────

interface BusAlert {
  id: string;
  title: string;
  message: string;
  type: string;
  busId: string;
  timestamp: Timestamp | null;
  readStatus: boolean;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const BusAlerts: React.FC = () => {
  const [selectedType, setSelectedType] = useState('delay');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busId, setBusId] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [alerts, setAlerts] = useState<BusAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Subscribe to alert history
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'bus_alerts'),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as BusAlert))
          .sort((a, b) => (b.timestamp?.seconds ?? 0) - (a.timestamp?.seconds ?? 0));
        setAlerts(items);
        setLoadingAlerts(false);
      }
    );
    return unsub;
  }, []);

  // Auto-fill title based on type
  useEffect(() => {
    const cfg = getTypeCfg(selectedType);
    const titles: Record<string, string> = {
      delay: 'Bus Delayed',
      start: 'Bus Starting Now',
      arrival: 'Bus Arriving Soon',
      emergency: 'Emergency Alert',
    };
    setTitle(titles[selectedType] ?? '');
  }, [selectedType]);

  const sendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSending(true);

    try {
      // Save to bus_alerts collection — Flutter reads only this collection
      await addDoc(collection(db, 'bus_alerts'), {
        title: title.trim(),
        message: message.trim(),
        type: selectedType,
        busId: busId.trim() || 'All Buses',
        timestamp: serverTimestamp(),
        readStatus: false,
      });

      setSent(true);
      setMessage('');
      setBusId('');
      setTimeout(() => setSent(false), 3000);
    } finally {
      setSending(false);
    }
  };

  const deleteAlert = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'bus_alerts', id));
    } finally {
      setDeletingId(null);
    }
  };

  const cfg = getTypeCfg(selectedType);
  const TypeIcon = cfg.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bus Alerts</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Send real-time alerts to all passengers instantly
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Send Alert Form ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Send New Alert</h2>
          </div>

          <form onSubmit={sendAlert} className="p-6 space-y-5">
            {/* Alert type selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                Alert Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {alertTypes.map((t) => {
                  const Icon = t.icon;
                  const isSelected = selectedType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setSelectedType(t.value)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? `${t.border} ${t.bg} ${t.color} border-opacity-100`
                          : 'border-gray-100 hover:border-gray-200 text-gray-600'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isSelected ? t.color : 'text-gray-400'}`} />
                      <span className="text-sm font-semibold">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bus ID */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Bus ID / Route <span className="normal-case font-normal text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <Bus className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={busId}
                  onChange={(e) => setBusId(e.target.value)}
                  placeholder="e.g. Bus 102 or leave blank for all"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Alert Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bus Delayed"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Message *
              </label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Bus 102 is delayed by 15 minutes due to traffic"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] resize-none"
              />
            </div>

            {/* Preview */}
            <div className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <TypeIcon className={`h-4 w-4 ${cfg.color}`} />
                <span className={`text-xs font-bold uppercase ${cfg.color}`}>
                  Preview
                </span>
              </div>
              <p className={`text-sm font-semibold ${cfg.color}`}>
                {title || 'Alert Title'}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {message || 'Alert message will appear here…'}
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#800000] text-white rounded-xl font-semibold hover:bg-[#700000] disabled:opacity-60 transition-colors"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : sent ? (
                <>
                  <Bell className="h-4 w-4" />
                  Alert Sent!
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Alert to All Passengers
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Alert History ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Alert History</h2>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live
            </span>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
            {loadingAlerts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#800000]" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No alerts sent yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {alerts.map((alert) => {
                  const ac = getTypeCfg(alert.type);
                  const AIcon = ac.icon;
                  return (
                    <li
                      key={alert.id}
                      className="px-5 py-4 flex items-start gap-3 hover:bg-gray-50/50 group transition-colors"
                    >
                      <div className={`h-9 w-9 rounded-xl ${ac.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <AIcon className={`h-4 w-4 ${ac.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {alert.title}
                          </p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ac.bg} ${ac.color} shrink-0`}>
                            {ac.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {alert.busId && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Bus className="h-3 w-3" />
                              {alert.busId}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {timeAgo(alert.timestamp)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        disabled={deletingId === alert.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        {deletingId === alert.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusAlerts;
