import React, { useEffect, useState } from 'react';
import {
  Users, ToggleLeft, ToggleRight, Loader2, Search,
  Trash2, AlertTriangle, X,
} from 'lucide-react';
import {
  AppUser,
  subscribePassengers,
  setPassengerActive,
  deleteUserDoc,
} from '../services/firestore';

// ── Confirmation Dialog ───────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const Passengers = () => {
  const [passengers, setPassengers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribePassengers((data) => {
      setPassengers(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleToggle = async (p: AppUser) => {
    setTogglingId(p.uid);
    try {
      await setPassengerActive(p.uid, !p.isActive);
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.uid);
    setDeleteTarget(null);
    try {
      await deleteUserDoc(deleteTarget.uid);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = passengers.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const active = passengers.filter((p) => p.isActive !== false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Passenger Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {passengers.length} total · {active} active
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Passengers</p>
            <p className="text-2xl font-bold text-gray-900">{passengers.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <ToggleRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Active Accounts</p>
            <p className="text-2xl font-bold text-gray-900">{active}</p>
          </div>
        </div>
      </div>

      {/* Search + Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-gray-900 shrink-0">All Passengers</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition"
            />
          </div>
          <span className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
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
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {search ? 'No passengers match your search' : 'No passengers yet'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Passenger</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={p.uid} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {p.name?.charAt(0).toUpperCase() ?? 'P'}
                      </div>
                      <span className="font-medium text-gray-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{p.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      p.isActive !== false
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-600'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${p.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                      {p.isActive !== false ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* Toggle active/inactive */}
                      <button
                        onClick={() => handleToggle(p)}
                        disabled={togglingId === p.uid}
                        title={p.isActive !== false ? 'Deactivate account' : 'Activate account'}
                        className={`p-2 rounded-lg transition-colors ${
                          p.isActive !== false
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {togglingId === p.uid ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : p.isActive !== false ? (
                          <ToggleRight className="h-5 w-5" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(p)}
                        disabled={deletingId === p.uid}
                        title="Delete passenger"
                        className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        {deletingId === p.uid ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Passenger"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This will remove their account from the system and cannot be undone.`}
          confirmLabel="Delete Passenger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default Passengers;
