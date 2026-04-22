import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import HeatmapLayer from '../components/HeatmapLayer';

// ── Fallback city coordinate lookup ─────────────────────────────────────────
const CITY_COORDS = {
  'ahmedabad':  [23.0225, 72.5714],
  'surat':      [21.1702, 72.8311],
  'pune':       [18.5204, 73.8567],
  'mumbai':     [19.0760, 72.8777],
  'delhi':      [28.7041, 77.1025],
  'gandhinagar':[23.2156, 72.6369],
  'bangalore':  [12.9716, 77.5946],
  'hyderabad':  [17.3850, 78.4867],
  'chennai':    [13.0827, 80.2707],
  'kolkata':    [22.5726, 88.3639],
  'jaipur':     [26.9124, 75.7873],
  'lucknow':    [26.8467, 80.9462],
};

function getBaseCoords(need) {
  if (need.lat && need.lng) return [need.lat, need.lng];
  const locLower = (need.location || '').toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (locLower.includes(city)) return [...coords]; // clone
  }
  return null;
}

/**
 * De-overlap: finds groups of needs that share EXACTLY the same base coordinate
 * and spreads them in an evenly-spaced circle of radius `spreadDeg` degrees.
 * This makes every marker individually visible on the map.
 */
function applyDeOverlap(needsWithBase, spreadDeg = 0.025) {
  // Group by coordinate key
  const groups = {};
  for (const n of needsWithBase) {
    const key = `${n._base[0].toFixed(4)},${n._base[1].toFixed(4)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }

  return needsWithBase.map(n => {
    const key = `${n._base[0].toFixed(4)},${n._base[1].toFixed(4)}`;
    const group = groups[key];
    if (group.length === 1) {
      return { ...n, resolvedCoords: n._base };
    }
    // Spread in a circle — use index within the group for determinism
    const idx = group.findIndex(m => m === n);
    const total = group.length;
    const angle = (2 * Math.PI * idx) / total - Math.PI / 2;
    // Smaller radius for clusters of 2, larger for more
    const r = total <= 3 ? spreadDeg * 0.6 : spreadDeg;
    return {
      ...n,
      resolvedCoords: [
        n._base[0] + r * Math.sin(angle),
        n._base[1] + r * Math.cos(angle),
      ],
    };
  });
}


// ── Haversine distance between two [lat,lng] pairs (in km) ──────────────────
function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Build a minimal network of connections (each point → N nearest neighbours)
function buildLinks(points, maxNeighbours = 2, maxDistKm = 600) {
  const links = [];
  const seen = new Set();
  for (let i = 0; i < points.length; i++) {
    const dists = [];
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      dists.push({ j, d: haversineKm(points[i].coords, points[j].coords) });
    }
    dists.sort((a, b) => a.d - b.d);
    let added = 0;
    for (const { j, d } of dists) {
      if (added >= maxNeighbours) break;
      if (d > maxDistKm) break;
      const key = [Math.min(i, j), Math.max(i, j)].join('-');
      if (!seen.has(key)) {
        seen.add(key);
        links.push({ from: points[i].coords, to: points[j].coords, d });
      }
      added++;
    }
  }
  return links;
}

// ── Component to auto-fit map bounds to all markers ─────────────────────────
function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length === 0) return;
    const bounds = coords.map(c => [c[0], c[1]]);
    try { map.fitBounds(bounds, { padding: [60, 60] }); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.length]);
  return null;
}

// ────────────────────────────────────────────────────────────────────────────

const MapPage = () => {
  const [needs, setNeeds] = useState([]);
  const [simNeeds, setSimNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [filterType, setFilterType] = useState('All');

  const fetchGeoNeeds = useCallback(async () => {
    try {
      const [needsRes, simRes] = await Promise.allSettled([
        axios.get('http://localhost:8000/api/needs'),
        axios.get('http://localhost:8000/api/simulation/needs'),
      ]);
      if (needsRes.status === 'fulfilled') setNeeds(needsRes.value.data);
      if (simRes.status === 'fulfilled')   setSimNeeds(simRes.value.data);
    } catch (err) {
      console.error("Error fetching map data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGeoNeeds();
    const interval = setInterval(fetchGeoNeeds, 30000);
    return () => clearInterval(interval);
  }, [fetchGeoNeeds]);

  // ── Resolve + de-overlap coordinates for every need ──
  const allNeedsWithCoords = useMemo(() => {
    // Step 1: attach base coords (exact DB value or city fallback)
    const withBase = [...needs, ...simNeeds]
      .map(n => {
        const base = getBaseCoords(n);
        return base ? { ...n, _base: base } : null;
      })
      .filter(Boolean);

    // Step 2: spread stacked markers into a circle so all are visible
    return applyDeOverlap(withBase, 0.028);
  }, [needs, simNeeds]);

  const allTypes = useMemo(() =>
    ['All', ...Array.from(new Set(allNeedsWithCoords.map(n => n.need_type).filter(Boolean)))],
    [allNeedsWithCoords]
  );

  const filteredNeeds = useMemo(() =>
    filterType === 'All'
      ? allNeedsWithCoords
      : allNeedsWithCoords.filter(n => n.need_type === filterType),
    [allNeedsWithCoords, filterType]
  );

  // ── Build interlinking lines ──
  const links = useMemo(() => {
    if (!showLinks || filteredNeeds.length < 2) return [];
    const pts = filteredNeeds.map(n => ({ coords: n.resolvedCoords }));
    return buildLinks(pts, 2, 700);
  }, [filteredNeeds, showLinks]);

  const getUrgencyColor = (level, isSim) => {
    if (isSim) return '#f43f5e';
    switch (level?.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'high':     return '#f97316';
      case 'medium':   return '#eab308';
      case 'low':      return '#3b82f6';
      default:         return '#94a3b8';
    }
  };

  const getUrgencyIntensity = (level, isSim) => {
    if (isSim) return 1.0;
    switch (level?.toLowerCase()) {
      case 'critical': return 1.0;
      case 'high':     return 0.7;
      case 'medium':   return 0.5;
      case 'low':      return 0.2;
      default:         return 0.1;
    }
  };

  const getNeedTypeIcon = (needType) => {
    const icons = {
      'Water': '💧', 'Medical': '🏥', 'Food': '🍱', 'Education': '📚',
      'Logistics': '🚛', 'First Aid': '🩺', 'Heavy Lifting': '💪', 'Doctor': '👨‍⚕️',
    };
    return icons[needType] || '📍';
  };

  // Heatmap uses de-overlapped coords — each need is a distinct heat point
  const heatPoints = filteredNeeds.map(need => ({
    lat: need.resolvedCoords[0],
    lng: need.resolvedCoords[1],
    intensity: getUrgencyIntensity(need.urgency_level, need.is_simulation),
  }));

  const allCoords = filteredNeeds.map(n => n.resolvedCoords);
  const centralPoint = [22.0, 78.0]; // India center

  if (loading) return (
    <div className="flex items-center justify-center h-full text-slate-400 gap-3 py-20">
      <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      Loading Map Data...
    </div>
  );

  return (
    <div className="animate-fade-in flex flex-col h-full max-w-6xl mx-auto pb-8">
      {simNeeds.length > 0 && (
        <div className="mb-4 bg-red-600 border border-red-500 rounded-lg p-3 text-center shadow-lg animate-pulse shadow-red-500/50">
          <span className="font-bold text-white uppercase tracking-widest text-sm">
            ⚠️ Simulation Mode Active — {simNeeds.length} Synthetic Event{simNeeds.length !== 1 ? 's' : ''} ⚠️
          </span>
        </div>
      )}

      <header className="mb-6 flex flex-wrap justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Crisis Map <span className="text-pink-400 font-normal text-xl ml-2">Network</span>
          </h2>
          <p className="text-slate-400">
            <span className="text-white font-medium">{filteredNeeds.length}</span> active locations plotted
            {filteredNeeds.length !== allNeedsWithCoords.length && (
              <span className="text-slate-500"> (filtered from {allNeedsWithCoords.length})</span>
            )}
            {links.length > 0 && (
              <span className="text-blue-400 font-medium"> · {links.length} network links</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-sm bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            {allTypes.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : `${getNeedTypeIcon(t)} ${t}`}</option>)}
          </select>

          {/* Toggle Network Links */}
          <button
            onClick={() => setShowLinks(!showLinks)}
            className={`px-3 py-2 font-semibold rounded-lg transition-colors text-sm ${
              showLinks ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-700 text-slate-400'
            }`}
          >
            {showLinks ? '🔗 Links On' : '🔗 Links Off'}
          </button>

          {/* Toggle Markers */}
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`px-3 py-2 font-semibold rounded-lg transition-colors text-sm ${
              showMarkers ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-slate-700 text-slate-400'
            }`}
          >
            {showMarkers ? '👁 Markers On' : '👁 Markers Off'}
          </button>

          {/* Toggle Heatmap */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-2 font-semibold rounded-lg transition-colors text-sm ${
              showHeatmap ? 'bg-pink-500 hover:bg-pink-600 text-white' : 'bg-slate-700 text-slate-200'
            }`}
          >
            {showHeatmap ? '🔥 Heat On' : '🔥 Heat Off'}
          </button>
        </div>
      </header>

      <div className="glass-panel p-2 flex-grow min-h-[600px] overflow-hidden relative">
        <MapContainer
          center={centralPoint}
          zoom={5}
          style={{ height: '100%', width: '100%', zIndex: 10, borderRadius: '0.75rem' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto-fit map to all markers */}
          {allCoords.length > 0 && <FitBounds coords={allCoords} />}

          {/* Heatmap layer */}
          {showHeatmap && <HeatmapLayer points={heatPoints} />}

          {/* ── Network inter-link lines ── */}
          {showLinks && links.map((link, idx) => (
            <Polyline
              key={`link-${idx}`}
              positions={[link.from, link.to]}
              pathOptions={{
                color: '#818cf8',       // indigo
                weight: 1.5,
                opacity: Math.max(0.12, 0.5 - link.d / 1400), // closer = more opaque
                dashArray: '6 6',
              }}
            />
          ))}

          {/* ── Markers for every need ── */}
          {showMarkers && filteredNeeds.map((need, index) => {
            const coords  = need.resolvedCoords;
            const color   = getUrgencyColor(need.urgency_level, need.is_simulation);
            const radius  = need.is_simulation
              ? 18
              : Math.max(10, Math.min(22, (need.priority_score || 10) / 3.5));
            const typeIcon = getNeedTypeIcon(need.need_type);
            const isFallback = !need.lat || !need.lng; // coords came from city-name fallback

            return (
              <CircleMarker
                key={need.id ? `${need.is_simulation ? 'sim' : 'real'}-${need.id}` : `idx-${index}`}
                center={coords}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: showHeatmap ? 0.35 : 0.75,
                  color: color,
                  weight: need.is_simulation ? 3 : isFallback ? 1 : 2,
                  dashArray: isFallback ? '4 3' : null, // dashed = fallback coord
                }}
              >
                {/* Hover tooltip — type visible without clicking */}
                <Tooltip
                  direction="top"
                  offset={[0, -(radius + 4)]}
                  className="custom-map-tooltip"
                  opacity={1}
                >
                  <div style={{ fontFamily: 'sans-serif', minWidth: 130 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>
                      {typeIcon} {need.need_type || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {need.location}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                      <span style={{
                        color: need.urgency_level === 'Critical' ? '#ef4444'
                             : need.urgency_level === 'High'     ? '#f97316' : '#64748b',
                        fontWeight: 700,
                      }}>
                        {need.urgency_level}
                      </span>
                      {need.people_affected ? ` · ${need.people_affected.toLocaleString()} affected` : ''}
                    </div>
                    {isFallback && (
                      <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>
                        ~ city-level estimate
                      </div>
                    )}
                    {need.is_simulation && (
                      <div style={{ fontSize: 10, color: '#f43f5e', fontWeight: 700, marginTop: 2 }}>
                        ⚠ SIMULATION
                      </div>
                    )}
                  </div>
                </Tooltip>

                {/* Click popup — full detail */}
                <Popup className="custom-popup">
                  <div className="font-sans" style={{ minWidth: 210 }}>
                    <h3 className="font-bold text-base border-b pb-1 mb-2">
                      {typeIcon} {need.location}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p className="m-0"><b>Type:</b> <span className="font-semibold">{need.need_type || 'N/A'}</span></p>
                      <p className="m-0">
                        <b>Urgency:</b>{' '}
                        <span style={{
                          color: need.urgency_level === 'Critical' ? '#ef4444'
                               : need.urgency_level === 'High'     ? '#f97316'
                               : need.urgency_level === 'Medium'   ? '#ca8a04' : '#3b82f6',
                          fontWeight: 700,
                        }}>
                          {need.urgency_level}
                        </span>
                      </p>
                      {need.people_affected && (
                        <p className="m-0"><b>Affected:</b> <span className="font-semibold">{need.people_affected.toLocaleString()}</span> people</p>
                      )}
                      {need.priority_score != null && (
                        <p className="m-0"><b>Priority Score:</b> <span style={{ color: '#ec4899', fontWeight: 700 }}>{Number(need.priority_score).toFixed(1)}</span></p>
                      )}
                      {isFallback && (
                        <p className="m-0 text-xs" style={{ color: '#64748b' }}>
                          📌 Position estimated from city name
                        </p>
                      )}
                    </div>
                    {need.is_simulation && (
                      <p className="m-0 text-xs font-bold mt-2 pt-2 border-t" style={{ color: '#f43f5e' }}>
                        ⚠ SIMULATION EVENT — Synthetic data only
                      </p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Stats overlay — top right */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <div className="glass-panel px-3 py-2 text-xs text-white border-white/20 bg-slate-900/85 min-w-[140px]">
            <div className="font-semibold text-slate-400 uppercase tracking-wide text-[10px] mb-1.5">Live Stats</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0"></div>
              <span className="font-semibold">{needs.length} Real Needs</span>
            </div>
            {simNeeds.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                <span className="font-semibold text-red-400">{simNeeds.length} Sim Events</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
              <span className="text-slate-400">{links.length} links</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
              <span className="text-slate-400">{filteredNeeds.length} visible</span>
            </div>
          </div>
        </div>

        {/* Legend — bottom left */}
        <div className="absolute bottom-6 left-6 z-[1000] glass-panel p-4 text-sm border-white/20 bg-slate-900/90" style={{ minWidth: 160 }}>
          <h4 className="font-bold text-white mb-3 text-sm">Legend</h4>
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Urgency</p>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-slate-300 text-xs">Critical</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span className="text-slate-300 text-xs">High</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span className="text-slate-300 text-xs">Medium</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-slate-300 text-xs">Low</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-400"></div><span className="text-slate-300 text-xs">Simulation</span></div>
            <div className="mt-2 pt-2 border-t border-white/10">
              <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide mb-1.5">Network</p>
              <div className="flex items-center gap-2">
                <div style={{ width: 14, borderTop: '1.5px dashed #818cf8' }}></div>
                <span className="text-slate-400 text-xs">Proximity link</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-3 h-3 rounded-full border border-dashed border-slate-500"></div>
                <span className="text-slate-400 text-xs">City estimate</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/10">
              <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide mb-1.5">Types</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                <span>💧 Water</span><span>🏥 Medical</span>
                <span>🍱 Food</span><span>📚 Education</span>
                <span>🚛 Logistics</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
