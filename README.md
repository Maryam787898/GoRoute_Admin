# GoRoute Admin Panel

The web-based administration dashboard for GoRoute. Built with React, TypeScript, and Tailwind CSS. Connects directly to Firebase Firestore for real-time data.

## What This Panel Does

- Monitor all drivers (active/offline status — read only)
- Monitor all routes (active/inactive status — read only)
- Create and delete driver accounts
- Delete routes
- View all registered passengers
- See live bus locations on a map
- Send broadcast alerts to all passengers (delay, start, arrival, emergency)
- Manage support requests — view, reply, delete

## Important: Admin is Read-Only for Status

Admins **cannot** activate/deactivate routes or toggle driver online status. These are controlled by drivers from the Flutter app only. This prevents admin from accidentally disrupting an active trip.

## Project Structure

```
src/
├── firebase.ts              # Firebase project config
├── services/
│   └── firestore.ts         # All Firestore operations (subscribe, create, delete)
└── pages/
    ├── Login.tsx            # Admin login screen
    ├── Dashboard.tsx        # Overview stats
    ├── Drivers.tsx          # Driver management
    ├── Routes.tsx           # Route monitoring
    ├── Passengers.tsx       # Passenger list
    ├── LiveTracking.tsx     # Real-time map
    ├── BusAlerts.tsx        # Send broadcast alerts
    ├── SupportRequests.tsx  # Support chat + delete
    └── Notifications.tsx    # Notification history
```

## Running the Panel

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Firebase Setup

Add your Firebase config to `src/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## Technology

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| TypeScript | Type-safe JavaScript |
| Tailwind CSS | Utility-first styling |
| Firebase SDK | Firestore real-time streams |
| Lucide React | Icon library |
| Vite | Build tool + dev server |

## How Real-Time Updates Work

Every page uses Firestore `onSnapshot()` listeners:

```typescript
useEffect(() => {
  const unsub = onSnapshot(collection(db, 'routes'), (snap) => {
    const routes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setRoutes(routes);  // React re-renders automatically
  });
  return unsub;  // cleanup on unmount
}, []);
```

The UI updates instantly whenever any document changes in Firestore — no polling, no manual refresh needed.

## Support Request Chat

The `SupportRequests.tsx` page implements a full chat interface:

1. List view shows all requests with status badges (Pending / Open / Resolved)
2. Click a request → opens chat panel
3. Admin types reply → saved to `support_requests/{id}/messages` subcollection
4. Status automatically changes to "Open" when admin replies
5. Admin can mark as "Resolved" or delete the entire request
6. User receives FCM push notification when admin replies

## Sending Bus Alerts

From the Bus Alerts page, admin can send:

| Alert Type | When to use |
|-----------|-------------|
| Start | Driver has started the route |
| Delay | Bus is running late |
| Arrival | Bus arriving at stop soon |
| Emergency | Urgent situation on route |

Alerts are written to the `bus_alerts` Firestore collection. The Flutter app listens via FCM and shows a popup dialog to passengers.
