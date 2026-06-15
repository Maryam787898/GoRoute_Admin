import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, User, ShieldCheck } from 'lucide-react';
import { auth, db } from '../firebase';
import { getUserRole, adminExists } from '../services/firestore';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const clearError = () => setError('');

  const verifyAdminRole = async (uid: string): Promise<boolean> => {
    const role = await getUserRole(uid);
    if (role !== 'admin') {
      await auth.signOut();
      setError('Invalid role access. This panel is for admins only.');
      return false;
    }
    return true;
  };

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();
    setLoading(true);

    try {
      if (isLogin) {
        const res = await signInWithEmailAndPassword(auth, email, password);

        const ok = await verifyAdminRole(res.user.uid);
        if (!ok) return;

        await setDoc(
          doc(db, 'users', res.user.uid),
          { lastLogin: serverTimestamp(), isOnline: true },
          { merge: true }
        );

        navigate('/');
      } else {
        if (await adminExists()) {
          setError('Admin already exists. Only one admin account is allowed.');
          return;
        }

        const res = await createUserWithEmailAndPassword(auth, email, password);

        await updateProfile(res.user, {
          displayName: name,
        });

        await setDoc(doc(db, 'users', res.user.uid), {
          uid: res.user.uid,
          name: name || 'Admin',
          email: res.user.email,
          role: 'admin',
          isActive: true,
          isOnline: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });

        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    clearError();
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);

      const existingRole = await getUserRole(res.user.uid);

      if (existingRole === null) {
        if (await adminExists()) {
          await auth.signOut();
          setError('Admin already exists. Only one admin account is allowed.');
          return;
        }

        await setDoc(doc(db, 'users', res.user.uid), {
          uid: res.user.uid,
          name: res.user.displayName || 'Admin',
          email: res.user.email,
          role: 'admin',
          isActive: true,
          isOnline: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      } else {
        const ok = await verifyAdminRole(res.user.uid);
        if (!ok) return;

        await setDoc(
          doc(db, 'users', res.user.uid),
          { lastLogin: serverTimestamp(), isOnline: true },
          { merge: true }
        );
      }

      navigate('/');
    } catch (err) {
      setError('Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">

        {/* CARD */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

          {/* HEADER */}
          <div className="bg-[#800000] px-8 py-10 text-center">

            {/* LOGO */}
            <div className="mx-auto h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <img
                src="/logo.jpeg"
                alt="GoRoute Logo"
                className="h-10 w-10 object-contain"
              />
            </div>

            <h1 className="text-2xl font-bold text-white">GoRoute Admin</h1>
            <p className="text-white/70 text-sm mt-1">
              {isLogin ? 'Sign in to your admin account' : 'Create admin account'}
            </p>
          </div>

          {/* FORM */}
          <div className="px-8 py-8">

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              {['Sign In', 'Register'].map((tab) => {
                const active = (tab === 'Sign In') === isLogin;
                return (
                  <button
                    key={tab}
                    onClick={() => setIsLogin(tab === 'Sign In')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg ${
                      active ? 'bg-white text-[#800000]' : 'text-gray-500'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* ERROR */}
            {error && (
              <div className="mb-4 bg-red-50 p-3 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">

              {!isLogin && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border rounded-xl"
                />
              )}

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-xl"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-xl"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#800000] text-white py-3 rounded-xl"
              >
                {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Admin'}
              </button>
            </form>

            {/* GOOGLE BUTTON (FIXED) */}
            <button
              onClick={handleGoogle}
              className="w-full mt-4 border py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50"
            >
              <img
                src="/google.jpeg"
                alt="Google"
                className="h-5 w-5"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span>Google Sign In</span>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;