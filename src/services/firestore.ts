import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  limit,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { db, auth, secondaryAuth } from '../firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'driver' | 'passenger';
  isActive: boolean;
  createdAt: any;
  lastLogin?: any;
}

export interface Route {
  id: string;
  driverId: string;
  driverName: string;
  from: string;
  to: string;
  estimatedTime: string;
  isActive: boolean;
  createdAt: any;
}

export interface LiveLocation {
  driverId: string;
  driverName: string;
  routeId: string;
  routeLabel: string;
  lat: number;
  lng: number;
  speed: number;
  updatedAt: any;
}

// ── Role helpers ──────────────────────────────────────────────────────────────

/** Fetch the Firestore role for a given uid. Returns null if doc missing. */
export async function getUserRole(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return (snap.data()?.role as string) ?? null;
}

/**
 * Check whether an admin account already exists in Firestore.
 * Used to enforce the single-admin rule.
 */
export async function adminExists(): Promise<boolean> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'admin'),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ── Real-time listeners ───────────────────────────────────────────────────────

export function subscribeUsers(cb: (users: AppUser[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'users'),
    (snap: QuerySnapshot<DocumentData>) => {
      cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser)));
    }
  );
}

export function subscribeDrivers(
  cb: (drivers: AppUser[]) => void
): Unsubscribe {
  const q = query(collection(db, 'users'), where('role', '==', 'driver'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser)));
  });
}

export function subscribePassengers(
  cb: (passengers: AppUser[]) => void
): Unsubscribe {
  const q = query(collection(db, 'users'), where('role', '==', 'passenger'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser)));
  });
}

export function subscribeRoutes(cb: (routes: Route[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'routes'), (snap) => {
    const routes = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Route))
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    cb(routes);
  });
}

export function subscribeLiveLocations(
  cb: (locations: LiveLocation[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'live_locations'), (snap) => {
    cb(snap.docs.map((d) => ({ driverId: d.id, ...d.data() } as LiveLocation)));
  });
}

// ── Driver management ─────────────────────────────────────────────────────────

/**
 * Create a new driver using a secondary Firebase Auth instance so the
 * admin session is never interrupted. The secondary app is initialised
 * once in firebase.ts and exported as `secondaryAuth`.
 *
 * Role is ALWAYS 'driver' — admin creation is blocked here.
 */
export async function createDriver(
  name: string,
  email: string,
  password: string
): Promise<void> {
  // Use secondary auth so the admin stays signed in
  const credential = await createUserWithEmailAndPassword(
    secondaryAuth,
    email,
    password
  );
  await updateProfile(credential.user, { displayName: name });

  // Write Firestore doc — role is hardcoded to 'driver'
  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    name,
    email,
    role: 'driver',       // ← always driver, never admin
    isActive: true,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  });

  // Sign out of the secondary instance immediately
  await secondaryAuth.signOut();

  // Write a notification so the admin panel shows it in real-time
  await addNotification(
    'New Driver Added',
    `${name} (${email}) has been added as a driver.`,
    'driver_added'
  );
}

export async function setDriverActive(
  uid: string,
  isActive: boolean
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { isActive });
}

/**
 * Delete a user: removes the Firestore document.
 * Firebase Auth account deletion requires Admin SDK (server-side).
 * The Firestore doc removal is sufficient to block access since
 * ProtectedRoute checks the Firestore role.
 */
export async function deleteUserDoc(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid));
  // Also clean up any live_locations entry
  await deleteDoc(doc(db, 'live_locations', uid));
}

// ── Route management ──────────────────────────────────────────────────────────

export async function setRouteActive(
  routeId: string,
  isActive: boolean
): Promise<void> {
  await updateDoc(doc(db, 'routes', routeId), { isActive });
}

export async function deleteRoute(routeId: string): Promise<void> {
  await deleteDoc(doc(db, 'routes', routeId));
}

// ── Passenger management ──────────────────────────────────────────────────────

export async function setPassengerActive(
  uid: string,
  isActive: boolean
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { isActive });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string; // open string — handles all types including driver_support, admin_reply, etc.
  createdAt: any;
  userId?: string;
  requestId?: string;
}

/** Write a notification document to Firestore. */
export async function addNotification(
  title: string,
  message: string,
  type: string = 'info'
): Promise<void> {
  const ref = doc(collection(db, 'notifications'));
  await setDoc(ref, {
    title,
    message,
    type,
    createdAt: serverTimestamp(),
  });
}

/** Real-time stream of notifications, newest first.
 *  Uses onSnapshot directly on the collection — no query() wrapper needed,
 *  which avoids the trailing-comma syntax issue and requires no Firestore index.
 */
export function subscribeNotifications(
  cb: (notifications: AppNotification[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'notifications'), (snap) => {
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as AppNotification))
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    cb(items);
  });
}
