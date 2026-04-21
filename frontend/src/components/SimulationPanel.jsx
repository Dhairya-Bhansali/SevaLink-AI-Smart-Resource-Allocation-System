import React, { useState } from 'react';
import { simulationAPI } from '../services/api';
import { Loader2, Zap } from 'lucide-react';

const SimulationPanel = ({ onSimulationUpdate, isActive }) => {
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const defaultCity = "Ahmedabad";

  const handleSimulate = async (type) => {
    setLoading(true);
    try {
      await simulationAPI.start(type, defaultCity);
      onSimulationUpdate(); // trigger parent refresh
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
      onSimulationUpdate();
    } catch (err) {
      console.error("Failed to clear:", err);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className={`glass-panel p-6 flex flex-col border ${isActive ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-slate-700/50"}`}>
      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <Zap className={`${isActive ? "text-red-500" : "text-yellow-400"}`} /> 
        Disaster Simulation
      </h3>
      <p className="text-sm text-slate-400 mb-6">
        Generate synthetic events to demonstrate system scaling and resource distribution capabilities.
      </p>

      {loading && (
        <div className="flex items-center gap-3 text-red-400 font-semibold mb-4 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
          <Loader2 className="animate-spin" /> Generating Synthetic Events...
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
        <button disabled={loading || clearing} onClick={() => handleSimulate('Flood')} className="p-3 bg-blue-900/40 hover:bg-blue-600 border border-blue-500/30 rounded-lg text-white font-semibold transition">
          Simulate Flood
        </button>
        <button disabled={loading || clearing} onClick={() => handleSimulate('Fire')} className="p-3 bg-orange-900/40 hover:bg-orange-600 border border-orange-500/30 rounded-lg text-white font-semibold transition">
          Simulate Fire
        </button>
        <button disabled={loading || clearing} onClick={() => handleSimulate('Earthquake')} className="p-3 bg-amber-900/40 hover:bg-amber-600 border border-amber-500/30 rounded-lg text-white font-semibold transition">
          Simulate Earthquake
        </button>
        <button disabled={loading || clearing} onClick={() => handleSimulate('Medical')} className="p-3 bg-red-900/40 hover:bg-red-600 border border-red-500/30 rounded-lg text-white font-semibold transition">
          Simulate Medical
        </button>
      </div>

      <div className="border-t border-slate-700 pt-4 mt-2">
        <button 
          onClick={handleClear}
          disabled={loading || clearing || !isActive}
          className="w-full p-3 bg-slate-800 hover:bg-red-700 disabled:opacity-50 border border-slate-600 text-slate-200 font-semibold transition rounded-lg flex justify-center items-center gap-2"
        >
          {clearing && <Loader2 className="w-4 h-4 animate-spin" />}
          Clear Simulation Data
        </button>
      </div>
    </div>
  );
};

export default SimulationPanel;
