import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import HeatmapLayer from '../components/HeatmapLayer';

const MapPage = () => {
  const [needs, setNeeds] = useState([]);
  const [simNeeds, setSimNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    const fetchGeoNeeds = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/needs/coordinates');
        setNeeds(res.data);
        
        try {
          const simRes = await axios.get('http://localhost:8000/api/simulation/needs');
          setSimNeeds(simRes.data);
        } catch (e) { console.warn("No simulation data", e); }

      } catch (err) {
        console.error("Error fetching map coordinates:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGeoNeeds();
  }, []);

  const centralPoint = [23.0225, 72.5714]; // Default Ahmedabad

  // Combine both sources
  const allNeeds = [...needs, ...simNeeds];

  const getUrgencyColor = (level, isSim) => {
    if (isSim) return '#f43f5e'; // Distinct visual parsing: Pink/Red for simulations
    switch (level?.toLowerCase()) {
      case 'critical': return '#ef4444'; // Red
      case 'high': return '#f97316'; // Orange
      case 'medium': return '#eab308'; // Yellow
      case 'low': return '#3b82f6'; // Blue
      default: return '#94a3b8'; // Grey
    }
  };

  const getUrgencyIntensity = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 1.0;
      case 'high': return 0.7;
      case 'medium': return 0.5;
      case 'low': return 0.2;
      default: return 0.1;
    }
  };

  // Prepare heatmap points
  const heatPoints = allNeeds
    .filter(need => need.lat && need.lng)
    .map(need => ({
      lat: need.lat,
      lng: need.lng,
      intensity: need.is_simulation ? 1.0 : getUrgencyIntensity(need.urgency_level)
    }));

  if (loading) return <div className="text-slate-400 p-8">Loading Map Data...</div>;

  return (
    <div className="animate-fade-in flex flex-col h-full max-w-6xl mx-auto pb-8">
      {simNeeds.length > 0 && (
        <div className="mb-4 bg-red-600 border border-red-500 rounded-lg p-3 text-center shadow-lg animate-pulse shadow-red-500/50">
          <span className="font-bold text-white uppercase tracking-widest text-sm">⚠️ Simulation Mode Active ⚠️</span>
        </div>
      )}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Crisis Map <span className="text-pink-400 font-normal text-xl ml-2">Heatmap</span></h2>
          <p className="text-slate-400">Geospatial overview of community priorities and resource gaps.</p>
        </div>
        <button 
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-4 py-2 font-semibold rounded-lg transition-colors ${
            showHeatmap ? 'bg-pink-500 hover:bg-pink-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}
        >
          {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
        </button>
      </header>

      <div className="glass-panel p-2 flex-grow min-h-[600px] overflow-hidden relative">
        <MapContainer center={centralPoint} zoom={11} style={{ height: '100%', width: '100%', zIndex: 10, borderRadius: '0.75rem' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {showHeatmap && <HeatmapLayer points={heatPoints} />}
          
          {allNeeds.map((need, index) => {
            if (!need.lat || !need.lng) return null;
            const color = getUrgencyColor(need.urgency_level, need.is_simulation);
            // Size of the marker represents priority if available, otherwise static
            const radius = need.is_simulation ? 18 : 15;

            return (
              <CircleMarker
                key={need.id ? `${need.is_simulation ? 'sim' : 'real'}-${need.id}` : index}
                center={[need.lat, need.lng]}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: showHeatmap ? 0.2 : 0.6,
                  color: color,
                  weight: 2
                }}
              >
                <Popup className="custom-popup">
                  <div className="font-sans">
                    <h3 className="font-bold text-lg border-b pb-1 mb-2">{need.location}</h3>
                    <p className="m-0 text-sm"><b>Urgency:</b> {need.urgency_level}</p>
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
        </div>
      </div>
    </div>
  );
};

export default MapPage;
