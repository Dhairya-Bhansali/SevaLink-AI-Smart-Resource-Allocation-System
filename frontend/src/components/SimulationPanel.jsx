import React, { useState } from 'react';
import { simulationAPI } from '../services/api';
import { Loader2, Zap, CheckCircle2 } from 'lucide-react';

const CITIES = ['Ahmedabad', 'Surat', 'Mumbai', 'Delhi', 'Pune', 'Gandhinagar'];
const DISASTER_TYPES = [
  { type: 'Flood',      emoji: '🌊', color: 'blue'   },
  { type: 'Fire',       emoji: '🔥', color: 'orange' },
  { type: 'Earthquake', emoji: '🌍', color: 'amber'  },
  { type: 'Medical',    emoji: '🏥', color: 'red'    },
];

const SimulationPanel = ({ onSimulationUpdate, isActive, onClear }) => {
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Ahmedabad');
  const [lastType, setLastType] = useState(null);

  const handleSimulate = async (type) => {
    setLoading(true);
    setLastType(type);
    try {
      await simulationAPI.start(type, selectedCity);
      onSimulationUpdate();
    } catch (err) {
      console.error("Simulation failed:", err);
      alert("Failed to start simulation");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await simulationAPI.clear();
      setLastType(null);
      onSimulationUpdate();
      if (onClear) onClear(); // Notify parent to reset allocation results
    } catch (err) {
      console.error("Failed to clear:", err);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className={`glass-panel p-6 flex flex-col border ${isActive ? "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]" : "border-slate-700/50"}`}>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className={`${isActive ? "text-red-500 animate-pulse" : "text-yellow-400"}`} />
          Disaster Simulation
        </h3>
        {isActive && (
          <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse">
            ACTIVE
          </span>
        )}
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Generate synthetic crisis events to demonstrate system scaling and AI resource distribution.
        <span className="text-orange-400 font-medium"> Real data is never modified.</span>
      </p>

      <div className="space-y-1.5 mb-4">
        <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Target City</label>
        <select
          value={selectedCity}
          onChange={e => setSelectedCity(e.target.value)}
          className="glass-input bg-slate-900 border-white/10 appearance-none text-sm"
          disabled={loading || clearing}
        >
          {CITIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-red-400 font-semibold mb-4 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
          <Loader2 className="animate-spin flex-shrink-0" /> Generating Synthetic {lastType} Events in {selectedCity}...
        </div>
      )}

      {isActive && !loading && (
        <div className="flex items-center gap-2 mb-4 bg-orange-500/10 border border-orange-500/20 text-orange-300 p-3 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Simulation running. Run Allocation Matcher from Command Center to see assignments (sandbox).
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
        {DISASTER_TYPES.map(({ type, emoji, color }) => (
          <button
            key={type}
            disabled={loading || clearing}
            onClick={() => handleSimulate(type)}
            className={`p-3 bg-${color}-900/40 hover:bg-${color}-600 border border-${color}-500/30 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {emoji} {type}
          </button>
        ))}
      </div>

      <div className="border-t border-slate-700 pt-4 mt-2">
        <button 
          onClick={handleClear}
          disabled={loading || clearing || !isActive}
          className="w-full p-3 bg-slate-800 hover:bg-red-700 disabled:opacity-50 border border-slate-600 text-slate-200 font-semibold transition rounded-lg flex justify-center items-center gap-2"
        >
          {clearing && <Loader2 className="w-4 h-4 animate-spin" />}
          {clearing ? 'Clearing...' : 'Clear Simulation — Restore Normal View'}
        </button>
        {isActive && (
          <p className="text-xs text-slate-600 text-center mt-2">
            Clearing removes all synthetic events. Real needs data will be restored.
          </p>
        )}
      </div>
    </div>
  );
};

export default SimulationPanel;
