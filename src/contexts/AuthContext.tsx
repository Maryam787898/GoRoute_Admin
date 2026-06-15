import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let roleUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      // Clean up previous role listener
      if (roleUnsub) {
        roleUnsub();
        roleUnsub = null;
      }

      if (user) {
        // Listen to Firestore role in real-time
        roleUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          const role = snap.exists() ? (snap.data()?.role ?? null) : null;
          setUserRole(role);
          setLoading(false);
        });
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (roleUnsub) roleUnsub();
    };
  }, []);

  const isAdmin = userRole === 'admin';

  return (
    <AuthContext.Provider value={{ currentUser, loading, isAdmin, userRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
