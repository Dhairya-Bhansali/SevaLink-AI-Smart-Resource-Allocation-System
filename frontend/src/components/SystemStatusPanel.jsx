import React, { useState, useEffect } from 'react';
import { systemAPI } from '../services/api';
import { Loader2, Zap } from 'lucide-react';

const StatCard = ({ title, value, color, loading }) => (
  <div className="glass-panel p-6 relative overflow-hidden group hover:-translate-y-1 transition-transform border border-slate-700/50">
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity -mr-10 -mt-10`}></div>
    <div className="relative z-10">
      <h4 className="text-sm font-medium text-slate-400 mb-2">{title}</h4>
      <div className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
        {value}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
      </div>
    </div>
  </div>
);

const SystemStatusPanel = ({ isSimActive, simNeedsCount }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await systemAPI.getStatus();
        setStatus(res.data);
      } catch (err) {
        console.error("Error fetching system status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    
    // Poll every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalVolunteers = status?.total_volunteers || 0;
  const activeNeeds = (status?.active_needs || 0) + (isSimActive ? simNeedsCount : 0);
  const assignedTasks = status?.assigned_tasks || 0;
  const criticalNeeds = isSimActive ? simNeedsCount : (status?.critical_needs || 0);

  return (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-4 px-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap className="text-yellow-400 w-5 h-5" /> Live Telemetry
        </h3>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          {status?.query_ms ? `Polling active (${status.query_ms}ms)` : 'Connecting...'}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Volunteers" value={totalVolunteers} color="from-emerald-500 to-teal-500" loading={loading} />
        <StatCard title="Active Needs" value={activeNeeds} color="from-blue-500 to-cyan-500" loading={loading} />
        <StatCard title="Assigned Tasks" value={assignedTasks} color="from-purple-500 to-pink-500" loading={loading} />
        <StatCard title="Critical Needs" value={criticalNeeds} color="from-red-500 to-orange-500" loading={loading} />
      </div>
    </div>
  );
};

export default SystemStatusPanel;
