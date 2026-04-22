import React, { useEffect, useState } from 'react';
import api from '../services/api'; // using internal api handler we configured with JWT

const PredictionsPanel = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const res = await api.get('/predictions/future-needs');
        setPredictions(res.data);
      } catch (err) {
        console.error("Failed to fetch predictions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPredictions();
  }, []);

  if (loading) return <div className="text-slate-400 p-4">Loading predictive models...</div>;

  return (
    <div className="glass-panel p-6 rounded-xl mt-6">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-blue-400">⚡</span> AI Needs Forecast
        <span className="ml-auto text-xs font-normal text-slate-500 bg-slate-800 px-2 py-1 rounded-md">Gemini 2.5 Flash</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {predictions.map((p, idx) => {
          const confidencePct = p.confidence > 1 ? p.confidence : Math.round(p.confidence * 100);
          const isHigh = confidencePct >= 80;
          return (
            <div key={idx} className={`bg-slate-800/50 border rounded-lg p-4 transition-transform hover:scale-105 ${
              isHigh ? 'border-red-500/40 shadow-red-500/10 shadow-lg' : 'border-slate-700/50'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-lg font-bold text-white">{p.location}</h4>
                {isHigh && <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">HIGH RISK</span>}
              </div>
              <p className="text-sm text-slate-400 mb-3">{p.season} Forecast</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Predicted Need</p>
                  <p className={`font-semibold ${
                    p.predicted_need === 'Medical' ? 'text-red-400' :
                    p.predicted_need === 'Water' ? 'text-blue-400' :
                    p.predicted_need === 'Food' ? 'text-orange-400' : 'text-purple-400'
                  }`}>{p.predicted_need}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase">Confidence</p>
                  <p className={`font-bold text-lg ${isHigh ? 'text-red-400' : 'text-green-400'}`}>{confidencePct}%</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 w-full bg-slate-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${isHigh ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PredictionsPanel;
