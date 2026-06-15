import React, { useEffect, useState } from 'react';
import {
  UserSquare2, Plus, Trash2,
  Loader2, X, Eye, EyeOff, AlertTriangle, Activity,
} from 'lucide-react';
import {
  AppUser,
  subscribeDrivers,
  createDriver,
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

// ── Add Driver Modal ──────────────────────────────────────────────────────────

interface AddDriverModalProps {
  onClose: () => void;
}

const AddDriverModal = ({ onClose }: AddDriverModalProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = (): string | null => {
    if (!name.trim()) return 'Name is required.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setLoading(true);
    try {
      await createDriver(name.trim(), email.trim(), password);
      onClose();
    } catch (err: any) {
      const msg: string = err.message ?? '';
      if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists.');
      } else {
        setError(msg || 'Failed to create driver. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add New Driver</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Account will be created with role: <strong>driver</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ahmed Khan"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="driver@goroute.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Password * <span className="normal-case font-normal text-gray-400">(min 6 chars)</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] transition"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[#800000] text-white rounded-xl text-sm font-semibold hover:bg-[#700000] disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const Drivers = () => {
  const [drivers, setDrivers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeDrivers((data) => {
      setDrivers(data);
      setLoading(false);
    });
    return unsub;
  }, []);

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

  const active = drivers.filter((d) => d.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {drivers.length} total · {active} currently active
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#800000] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#700000] transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Driver
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <UserSquare2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Drivers</p>
            <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Active Now</p>
            <p className="text-2xl font-bold text-gray-900">{active}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">All Drivers</h2>
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
        ) : drivers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <UserSquare2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No drivers yet</p>
            <p className="text-sm mt-1">Click "Add Driver" to create one</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Driver</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {drivers.map((driver) => (
                <tr key={driver.uid} className="hover:bg-gray-50/50 transition-colors">
                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#800000]/10 text-[#800000] flex items-center justify-center font-bold text-sm">
                        {driver.name?.charAt(0).toUpperCase() ?? 'D'}
                      </div>
                      <span className="font-medium text-gray-900">{driver.name}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-6 py-4 text-gray-500">{driver.email}</td>

                  {/* Status — read-only badge, driver controls this themselves */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      driver.isActive
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {driver.isActive ? (
                        <>
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                          </span>
                          Active
                        </>
                      ) : (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                          Offline
                        </>
                      )}
                    </span>
                  </td>

                  {/* Actions — delete only */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setDeleteTarget(driver)}
                      disabled={deletingId === driver.uid}
                      title="Delete driver"
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      {deletingId === driver.uid ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showModal && <AddDriverModal onClose={() => setShowModal(false)} />}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Driver"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This will remove their account from the system and cannot be undone.`}
          confirmLabel="Delete Driver"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default Drivers;
