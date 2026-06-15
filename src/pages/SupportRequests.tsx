import React, { useEffect, useRef, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  MessageSquare, Send, CheckCircle, Clock,
  ChevronLeft, Loader2, User, Shield, Trash2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SupportRequest {
  id: string;
  senderId: string;
  senderRole: 'driver' | 'passenger';
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  status: 'pending' | 'open' | 'resolved';
  createdAt: Timestamp | null;
  category?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  text: string;
  createdAt: Timestamp | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: Timestamp | null): string {
  if (!ts?.seconds) return '';
  const diff = Math.floor(Date.now() / 1000) - ts.seconds;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts.seconds * 1000).toLocaleDateString();
}

function formatTime(ts: Timestamp | null): string {
  if (!ts?.seconds) return '';
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const statusConfig = {
  pending: { color: 'text-orange-600 bg-orange-50', label: 'Pending', icon: Clock },
  open: { color: 'text-blue-600 bg-blue-50', label: 'Open', icon: MessageSquare },
  resolved: { color: 'text-green-600 bg-green-50', label: 'Resolved', icon: CheckCircle },
};

const roleConfig = {
  driver: { color: 'text-purple-700 bg-purple-50', label: 'Driver' },
  passenger: { color: 'text-blue-700 bg-blue-50', label: 'Passenger' },
};

// ── Chat Panel ────────────────────────────────────────────────────────────────

const ChatPanel: React.FC<{
  request: SupportRequest;
  onBack: () => void;
  onDelete: (id: string) => void;
}> = ({ request, onBack, onDelete }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const admin = auth.currentUser!;

  useEffect(() => {
    const q = query(
      collection(db, 'support_requests', request.id, 'messages'),
      orderBy('createdAt')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
      );
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return unsub;
  }, [request.id]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');

    try {
      // 1. Save message
      await addDoc(
        collection(db, 'support_requests', request.id, 'messages'),
        {
          senderId: admin.uid,
          senderRole: 'admin',
          senderName: admin.displayName ?? 'Admin',
          text: trimmed,
          createdAt: serverTimestamp(),
        }
      );

      // 2. Update request status to open
      await updateDoc(doc(db, 'support_requests', request.id), {
        status: 'open',
      });

      // 3. Write notification for the user
      await addDoc(collection(db, 'notifications'), {
        title: 'Admin Replied',
        message: `Admin replied to your support request: "${request.subject}"`,
        type: 'admin_reply',
        userId: request.senderId,
        requestId: request.id,
        createdAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
    }
  };

  const markResolved = async () => {
    await updateDoc(doc(db, 'support_requests', request.id), {
      status: 'resolved',
    });
  };

  const sc = statusConfig[request.status] ?? statusConfig.pending;
  const rc = roleConfig[request.senderRole] ?? roleConfig.passenger;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-white">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 truncate">{request.subject}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rc.color}`}>
              {rc.label}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.color}`}>
              {sc.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {request.senderName} · {request.senderEmail}
          </p>
        </div>
        {request.status !== 'resolved' && (
          <button
            onClick={markResolved}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-xs font-semibold hover:bg-green-100 transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Resolve
          </button>
        )}
        <button
          onClick={() => onDelete(request.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors"
          title="Delete request"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      {/* Original message */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-xs text-gray-500 mb-1">Original message</p>
        <p className="text-sm text-gray-700">{request.message}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No messages yet. Send the first reply.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.senderRole === 'admin';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {isAdmin ? (
                    <Shield className="h-3 w-3 text-[#800000]" />
                  ) : (
                    <User className="h-3 w-3 text-gray-400" />
                  )}
                  <span className="text-xs text-gray-400">
                    {isAdmin ? 'Admin' : msg.senderName}
                  </span>
                  <span className="text-xs text-gray-300">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isAdmin
                      ? 'bg-[#800000] text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-100 bg-white">
        <div className="flex gap-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type your reply…"
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="px-4 py-2.5 bg-[#800000] text-white rounded-xl hover:bg-[#700000] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="text-sm font-semibold">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const SupportRequests: React.FC = () => {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportRequest | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'open' | 'resolved'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'support_requests'),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as SupportRequest))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setRequests(items);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const handleDeleteRequest = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'support_requests', confirmDeleteId));
      // If the deleted request was open in the chat panel, go back to list
      if (selected?.id === confirmDeleteId) setSelected(null);
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const filtered = filter === 'all'
    ? requests
    : requests.filter((r) => r.status === filter);

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    open: requests.filter((r) => r.status === 'open').length,
    resolved: requests.filter((r) => r.status === 'resolved').length,
  };

  if (selected) {
    return (
      <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
           style={{ height: 'calc(100vh - 120px)' }}>
        <ChatPanel
          request={selected}
          onBack={() => setSelected(null)}
          onDelete={handleDeleteRequest}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confirm delete dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Delete Request</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              This will permanently delete the support request and all its messages. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {requests.length} total · {counts.pending} pending
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'open', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              filter === f
                ? 'bg-[#800000] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              filter === f ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            {filter === 'all' ? 'All Requests' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Requests`}
          </h2>
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
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No {filter === 'all' ? '' : filter} requests</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filtered.map((req) => {
              const sc = statusConfig[req.status] ?? statusConfig.pending;
              const rc = roleConfig[req.senderRole] ?? roleConfig.passenger;
              const StatusIcon = sc.icon;

              return (
                <li
                  key={req.id}
                  className="px-6 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 font-bold text-gray-600 cursor-pointer"
                      onClick={() => setSelected(req)}
                    >
                      {req.senderName?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setSelected(req)}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {req.subject}
                        </p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rc.color}`}>
                          {rc.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sc.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {req.senderName} · {req.senderEmail}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {req.message}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-xs text-gray-400">{timeAgo(req.createdAt)}</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(req);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          title="Open chat"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRequest(req.id);
                          }}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete request"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SupportRequests;
