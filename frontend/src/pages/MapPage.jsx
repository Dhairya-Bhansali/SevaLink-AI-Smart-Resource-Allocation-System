import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { needsAPI } from '../services/api';

const MapPage = () => {
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNeeds = async () => {
      try {
        const res = await needsAPI.getAll();
        setNeeds(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNeeds();
  }, []);

  // Simple geo-mocking for MVP (since backend only provides generic 'location' string)
  // We assigns some dummy coordinates around a central point based on ID modulo math.
  const centralPoint = [23.0225, 72.5714]; // Ahmedabad

  const getCoordinates = (need) => {
    // Generate a pseudo-random offset based on id, so they scatter around central point
    const id = need.id || Math.random() * 1000;
    const latOffset = (id % 10 - 5) * 0.05;
    const lngOffset = ((id * 3) % 10 - 5) * 0.05;
    return [centralPoint[0] + latOffset, centralPoint[1] + lngOffset];
  };

  const getUrgencyColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return '#ef4444'; // Red
      case 'high': return '#f97316'; // Orange
      case 'medium': return '#eab308'; // Yellow
      case 'low': return '#3b82f6'; // Blue
      default: return '#94a3b8'; // Grey
    }
  };

  if (loading) return <div className="text-slate-400">Loading Map Data...</div>;

  return (
    <div className="animate-fade-in flex flex-col h-full max-w-6xl mx-auto pb-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Crisis Map <span className="text-pink-400 font-normal text-xl ml-2">Heatmap</span></h2>
        <p className="text-slate-400">Geospatial overview of community priorities and resource gaps.</p>
      </header>

      <div className="glass-panel p-2 flex-grow min-h-[600px] overflow-hidden relative">
        <MapContainer center={centralPoint} zoom={11} style={{ height: '100%', width: '100%', zIndex: 10, borderRadius: '0.75rem' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {needs.map((need) => {
            const coords = getCoordinates(need);
            const color = getUrgencyColor(need.urgency_level);
            // Size of the marker represents people affected or priority score
            const radius = Math.max(10, Math.min(40, need.priority_score * 2));

            return (
              <CircleMarker
                key={need.id}
                center={coords}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.6,
                  color: color,
                  weight: 2
                }}
              >
                <Popup className="custom-popup">
                  <div className="font-sans">
                    <h3 className="font-bold text-lg border-b pb-1 mb-2">{need.location}</h3>
                    <p className="m-0 text-sm"><b>Type:</b> {need.need_type}</p>
                    <p className="m-0 text-sm"><b>Urgency:</b> {need.urgency_level}</p>
                    <p className="m-0 text-sm"><b>Affected:</b> {need.people_affected}</p>
                    <p className="m-0 text-sm mt-2 text-pink-600"><b>Priority Score:</b> {need.priority_score.toFixed(2)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
        
        {/* Legend Overlay */}
        <div className="absolute bottom-6 left-6 z-[1000] glass-panel p-4 max-w-xs text-sm border-white/20">
          <h4 className="font-bold text-white mb-3">Intensity Scale</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-500 opacity-80"></div> <span className="text-slate-300">Critical</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-500 opacity-80"></div> <span className="text-slate-300">High</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-500 opacity-80"></div> <span className="text-slate-300">Medium</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500 opacity-80"></div> <span className="text-slate-300">Low</span></div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 text-xs text-slate-400">
            * Circle size represents impact score
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
