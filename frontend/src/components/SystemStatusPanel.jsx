import React, { useState, useEffect } from 'react';
import { systemAPI, dashboardAPI } from '../services/api';
import { Loader2, Zap, Users, UserCheck, AlertTriangle, TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, sub, color, icon: Icon, loading, highlight, pulse }) => (
  <div className={`glass-panel p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 border ${highlight ? 'border-emerald-500/40 shadow-emerald-500/10 shadow-lg' : 'border-slate-700/50'}`}>
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} rounded-full blur-3xl opacity-15 group-hover:opacity-35 transition-opacity -mr-10 -mt-10`}></div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className={`w-4 h-4 ${highlight ? 'text-emerald-400' : 'text-slate-500'}`} />}
        <h4 className="text-sm font-medium text-slate-400">{title}</h4>
      </div>
      <div className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
        {value ?? '—'}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
        {pulse && !loading && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />}
      </div>
      {sub && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{sub}</p>}
    </div>
  </div>
);

/**
 * Props:
 *  isSimActive      — bool, simulation mode on
 *  simNeedsCount    — int, how many sim needs exist
 *  assignedCount    — int | null, from latest allocation run (overrides DB calc)
 */
const SystemStatusPanel = ({ isSimActive, simNeedsCount = 0, assignedCount = null }) => {
  const [status,    setStatus]    = useState(null);
  const [dashStats, setDashStats] = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sysRes, statsRes] = await Promise.allSettled([
          systemAPI.getStatus(),
          dashboardAPI.getStats(),
        ]);
        if (sysRes.status   === 'fulfilled') setStatus(sysRes.value.data);
        if (statsRes.status === 'fulfilled') setDashStats(statsRes.value.data);
      } catch (err) {
        console.error("Error fetching system status:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalVolunteers = dashStats?.total_volunteers ?? status?.total_volunteers ?? 0;
  const dbActiveNeeds   = dashStats?.total_needs      ?? status?.active_needs    ?? 0;
  const urgentNeeds     = dashStats?.urgent_needs     ?? status?.critical_needs  ?? 0;

  // ── Active needs displayed (include sim events when active) ──
  const activeNeeds = dbActiveNeeds + (isSimActive ? simNeedsCount : 0);

  // ── Assigned / Free calculation ──
  // Priority: explicit assignedCount prop (after allocation run) > DB ratio
  let assigned, free;
  if (assignedCount !== null) {
    // After auto-assign: assignedCount volunteers are now "busy"
    assigned = Math.min(assignedCount, totalVolunteers);
    free     = Math.max(0, totalVolunteers - assigned);
  } else if (isSimActive) {
    // During sim: sim needs count as demand
    assigned = Math.min(totalVolunteers, activeNeeds);
    free     = Math.max(0, totalVolunteers - assigned);
  } else {
    // Normal: use DB needs as proxy for demand
    assigned = Math.min(totalVolunteers, dbActiveNeeds);
    free     = Math.max(0, totalVolunteers - assigned);
  }

  const criticalNeeds = isSimActive ? simNeedsCount : urgentNeeds;

  return (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap className="text-yellow-400 w-5 h-5" /> Live Telemetry
        </h3>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          {status?.query_ms ? `Polling ${status.query_ms}ms` : 'Live · IST'}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Volunteers"
          value={totalVolunteers}
          sub={`${assigned} on duty · ${free} free`}
          color="from-emerald-500 to-teal-500"
          icon={Users}
          loading={loading}
          pulse
        />
        <StatCard
          title="Free Volunteers"
          value={free}
          sub={free === 0 ? 'All volunteers assigned' : 'Available for new tasks'}
          color="from-green-400 to-emerald-500"
          icon={UserCheck}
          loading={loading}
          highlight={free > 0}
        />
        <StatCard
          title="Active Needs"
          value={activeNeeds}
          sub={isSimActive ? `+${simNeedsCount} simulated events` : `${urgentNeeds} critical / high`}
          color="from-blue-500 to-cyan-500"
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          title="Critical Needs"
          value={criticalNeeds}
          sub="Immediate action required"
          color="from-red-500 to-orange-500"
          icon={AlertTriangle}
          loading={loading}
          highlight={criticalNeeds > 0}
          pulse={criticalNeeds > 0}
        />
      </div>
    </div>
  );
};

export default SystemStatusPanel;
