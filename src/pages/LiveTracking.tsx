import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bus, WifiOff, Navigation, Loader2 } from 'lucide-react';
import { subscribeLiveLocations, LiveLocation } from '../services/firestore';

// ── Default map center: Lahore, Pakistan ──────────────────────────────────────
const DEFAULT_CENTER: [number, number] = [31.5204, 74.3587];
const DEFAULT_ZOOM = 12;

// ── Custom bus marker icon ────────────────────────────────────────────────────
// We create a DivIcon so we don't need any external image files.
const createBusIcon = (driverName: string) =>
  L.divIcon({
    className: '', // clear Leaflet's default white box
    html: `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:2px;
      ">
        <div style="
          width:36px;height:36px;
          background:#800000;
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 6px rgba(0,0,0,0.35);
          border:2px solid white;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
               viewBox="0 0 24 24" fill="none" stroke="white"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="2"/>
            <path d="M16 8h4l3 3v5h-7V8z"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
        <div style="
          background:white;
          color:#800000;
          font-size:9px;
          font-weight:700;
          padding:1px 5px;
          border-radius:4px;
          box-shadow:0 1px 3px rgba(0,0,0,0.2);
          white-space:nowrap;
          max-width:80px;
          overflow:hidden;
          text-overflow:ellipsis;
        ">${driverName}</div>
      </div>`,
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -54],
  });

// ── Helper: fly map to bounds of all drivers ──────────────────────────────────
const FitBoundsControl = ({
  drivers,
  trigger,
}: {
  drivers: LiveLocation[];
  trigger: number;
}) => {
  const map = useMap();
  useEffect(() => {
    if (drivers.length === 0) return;
    const bounds = L.latLngBounds(
      drivers.map((d) => [d.lat, d.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [trigger]); // only re-run when trigger changes (button click)
  return null;
};

// ── Helper: pan map to a specific driver ──────────────────────────────────────
const PanToDriver = ({ target }: { target: LiveLocation | null }) => {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], 15, { duration: 0.8 });
  }, [target]);
  return null;
};

// ── Main component ────────────────────────────────────────────────────────────

const LiveTracking: React.FC = () => {
  const [drivers, setDrivers] = useState<LiveLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LiveLocation | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  // Subscribe to Firestore live_locations in real-time
  useEffect(() => {
    const unsub = subscribeLiveLocations((locations) => {
      setDrivers(locations);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Tracking</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading
              ? 'Connecting…'
              : `${drivers.length} driver${drivers.length !== 1 ? 's' : ''} currently online`}
          </p>
        </div>
        {drivers.length > 0 && (
          <button
            onClick={() => setFitTrigger((n) => n + 1)}
            className="flex items-center gap-2 bg-[#800000] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#700000] transition-colors"
          >
            <Navigation className="h-4 w-4" />
            Fit All
          </button>
        )}
      </div>

      {/* ── Main layout ─────────────────────────────────────────────── */}
      <div
        className="flex gap-4"
        style={{ height: 'calc(100vh - 200px)', minHeight: 520 }}
      >
        {/* ── Driver sidebar ─────────────────────────────────────────── */}
        <div className="w-72 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">
              Active Drivers
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#800000]" />
              </div>
            ) : drivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                <WifiOff className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No drivers online</p>
                <p className="text-xs mt-1 text-center px-4">
                  Drivers appear here when they go active
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {drivers.map((d) => (
                  <li
                    key={d.driverId}
                    onClick={() => setSelected(d)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      selected?.driverId === d.driverId
                        ? 'bg-[#800000]/5 border-l-2 border-[#800000]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#800000] text-white flex items-center justify-center shrink-0">
                        <Bus className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {d.driverName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {d.routeLabel}
                        </p>
                        <p className="text-xs text-green-600 font-medium mt-0.5">
                          {d.speed.toFixed(0)} km/h
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Map ────────────────────────────────────────────────────── */}
        {/*
         * IMPORTANT: MapContainer must have an explicit pixel/percentage
         * height on its wrapper. Without this Leaflet renders 0px tall
         * and shows a blank grey screen.
         */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom
          >
            {/* OpenStreetMap tiles — no API key required */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            {/* Fit-bounds controller (triggered by button) */}
            <FitBoundsControl drivers={drivers} trigger={fitTrigger} />

            {/* Pan-to controller (triggered by sidebar click) */}
            <PanToDriver target={selected} />

            {/* Driver markers */}
            {drivers.map((d) => (
              <Marker
                key={d.driverId}
                position={[d.lat, d.lng]}
                icon={createBusIcon(d.driverName)}
                eventHandlers={{ click: () => setSelected(d) }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-gray-900">{d.driverName}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{d.routeLabel}</p>
                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        🚀 {d.speed.toFixed(0)} km/h
                      </span>
                      <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-semibold">
                        ● Live
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
