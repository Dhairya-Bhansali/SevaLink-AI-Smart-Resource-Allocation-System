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
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {predictions.map((p, idx) => (
          <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 transition-transform hover:scale-105">
            <h4 className="text-lg font-bold text-white mb-1">{p.location}</h4>
            <p className="text-sm text-slate-400 mb-3">{p.season} Forecast</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-slate-500 uppercase">Predicted Need</p>
                <p className={`font-semibold ${p.predicted_need === 'Medical' ? 'text-red-400' : 'text-blue-400'}`}>
                  {p.predicted_need}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase">Confidence</p>
                <p className="font-bold text-green-400">{p.confidence}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PredictionsPanel;
