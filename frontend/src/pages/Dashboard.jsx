import React, { useEffect, useState, useRef } from 'react';
import { dashboardAPI, needsAPI, volunteerAPI, simulationAPI } from '../services/api';
import MatchResultsModal from '../components/MatchResultsModal';
import AddNeedModal from '../components/AddNeedModal';
import PredictionsPanel from '../components/PredictionsPanel';
import SimulationPanel from '../components/SimulationPanel';
import SystemStatusPanel from '../components/SystemStatusPanel';
import NotificationBell from '../components/NotificationBell';
import PerformancePanel from '../components/PerformancePanel';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Loader2, Activity, TrendingDown, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [urgentNeeds, setUrgentNeeds] = useState([]);
  const [simNeeds, setSimNeeds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Feature States
  const [matchingId, setMatchingId] = useState(null);
  const [modalData, setModalData] = useState({ isOpen: false, matches: [], need: null });
  const [allocating, setAllocating] = useState(false);
  const [allocationProgress, setAllocationProgress] = useState(0);
  const [allocationResults, setAllocationResults] = useState(null);
  const [allocatedSimIds, setAllocatedSimIds] = useState(new Set()); // sim needs hidden after allocation
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showAddNeed, setShowAddNeed] = useState(false);

  const fileInputRef = useRef(null);

  const fetchData = async () => {
    try {
      const statsRes = await dashboardAPI.getStats();
      setStats(statsRes.data);
      
      const needsRes = await needsAPI.getPrioritized();
      setUrgentNeeds(needsRes.data);

      try {
        const simRes = await simulationAPI.getNeeds();
        setSimNeeds(simRes.data);
      } catch (e) { console.warn("Failed retrieving simulation needs", e); }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter out sim needs that have already been allocated (keep them in DB for heatmap)
  const visibleSimNeeds = simNeeds.filter(n => !allocatedSimIds.has(n.id));
  const allDisplayNeeds = [...visibleSimNeeds, ...urgentNeeds]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 7);
  const isSimActive = simNeeds.length > 0;
  const isSimFullyAllocated = isSimActive && visibleSimNeeds.length === 0;

  // FEATURE 1: Individual Match Button
  const handleMatch = async (need, isSim) => {
    setMatchingId(need.id);
    try {
      if (isSim) {
         const res = await volunteerAPI.matchSim(need.id);
         setModalData({ isOpen: true, matches: res.data.matches || [], need });
      } else {
        const res = await volunteerAPI.match(need.id);
        setModalData({ isOpen: true, matches: res.data.matches || [], need });
        await fetchData();
      }
    } catch (error) {
      console.error("Error matching:", error);
      alert("Failed to match volunteers. Please try again.");
    } finally {
      setMatchingId(null);
    }
  };

  // FEATURE 2: OCR Survey Upload
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage("Uploading and extracting text...");
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await needsAPI.uploadSurvey(formData);
      setUploadMessage(`Successfully uploaded and processed ${res.data.length || 1} need(s).`);
      await fetchData();
      setTimeout(() => setUploadMessage(null), 4000);
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadMessage(error.response?.data?.detail || "Error processing file.");
      setTimeout(() => setUploadMessage(null), 4000);
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  // FEATURE 3: Run Allocation Matcher — assigns EVERY need, clears the priority list when done
  const handleRunAllocation = async () => {
    setAllocationResults(null);

    if (isSimActive) {
      // ── SIMULATION MODE: Hungarian optimized matching (sandbox, DB not modified) ──
      setAllocating(true);
      setAllocationProgress(20);
      try {
        const optRes = await dashboardAPI.optimizedSimMatch();
        setAllocationProgress(55);
        const hungarianAssignments = optRes.data.assignments || [];

        // Sequential per-need match to get detailed scores
        const needsToProcess = simNeeds;
        const perNeedResults = [];
        const allocatedIds = new Set();

        for (let i = 0; i < needsToProcess.length; i++) {
          try {
            const res = await volunteerAPI.matchSim(needsToProcess[i].id);
            const topMatch = res.data.matches?.[0];
            perNeedResults.push({ need: needsToProcess[i], volunteer: topMatch || null });
            if (topMatch) allocatedIds.add(needsToProcess[i].id); // mark as allocated
          } catch {
            perNeedResults.push({ need: needsToProcess[i], volunteer: null });
          }
          setAllocationProgress(55 + Math.round(((i + 1) / needsToProcess.length) * 40));
        }

        setAllocationProgress(100);
        // Hide allocated sim needs from the priority list
        setAllocatedSimIds(allocatedIds);
        setAllocationResults({
          count: hungarianAssignments.length || perNeedResults.filter(r => r.volunteer).length,
          isSim: true,
          assignments: hungarianAssignments.length > 0 ? hungarianAssignments : perNeedResults,
          isHungarian: hungarianAssignments.length > 0,
        });
      } catch (err) {
        console.error("Sim allocation error:", err);
        alert("Failed to run simulation allocation.");
      } finally {
        setAllocating(false);
        setAllocationProgress(0);
      }
      return;
    }

    // ── REAL MODE: Hungarian optimized for ALL needs, then assign+delete each matched pair ──
    setAllocating(true);
    setAllocationProgress(10);

    let finalAssignments = [];
    let isHungarian = false;

    try {
      const optRes = await dashboardAPI.optimizedMatch();
      setAllocationProgress(40);
      finalAssignments = optRes.data.assignments || [];
      isHungarian = finalAssignments.length > 0;
    } catch (optError) {
      console.warn("Optimized allocation failed, falling back to sequential:", optError);
    }

    if (!isHungarian) {
      // Fallback: sequential match to build assignment list
      const allNeeds = urgentNeeds;
      if (allNeeds.length === 0) {
        setAllocating(false);
        alert("No needs to allocate at this time.");
        return;
      }
      for (let i = 0; i < allNeeds.length; i++) {
        const need = allNeeds[i];
        try {
          const res = await volunteerAPI.match(need.id);
          const topMatch = res.data.matches?.[0];
          if (topMatch) {
            finalAssignments.push({
              volunteer_id: topMatch.id,
              volunteer_name: topMatch.name,
              need_id: need.id,
              need_location: need.location,
              need_type: need.need_type,
              cost: null,
            });
          } else {
            // No match — still record it for display
            finalAssignments.push({
              volunteer_id: null,
              volunteer_name: null,
              need_id: need.id,
              need_location: need.location,
              need_type: need.need_type,
              cost: null,
            });
          }
        } catch {
          finalAssignments.push({ need_id: need.id, need_location: need.location, need_type: need.need_type, volunteer_name: null, cost: null });
        }
        setAllocationProgress(40 + Math.round(((i + 1) / allNeeds.length) * 40));
      }
    }

    // ── Call /assign for each matched pair → deletes need from DB ──
    setAllocationProgress(82);
    const matchedPairs = finalAssignments.filter(a => a.volunteer_id && a.need_id);
    for (let i = 0; i < matchedPairs.length; i++) {
      try {
        await volunteerAPI.assign(matchedPairs[i].need_id, matchedPairs[i].volunteer_id, false);
      } catch (err) {
        console.warn(`Assign failed for need ${matchedPairs[i].need_id}:`, err);
      }
      setAllocationProgress(82 + Math.round(((i + 1) / matchedPairs.length) * 15));
    }

    setAllocationProgress(100);
    setAllocationResults({
      count: matchedPairs.length,
      isSim: false,
      assignments: finalAssignments, // shown as assignment cards in priority list
      isHungarian,
    });

    // fetchData returns empty needs since they were deleted — assignments fill the space
    await fetchData();
    setAllocating(false);
    setAllocationProgress(0);
  };

  // FEATURE 4: Generate Report
  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const analyticsRes = await dashboardAPI.getAnalytics();
      const data = analyticsRes.data;

      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.text("SevaLink AI - Activity Report", 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      
      doc.text("Summary Overview", 14, 45);
      const summaryBody = [
        ["Total Needs", stats?.total_needs || "0"],
        ["Urgent Needs", stats?.urgent_needs || "0"],
        ["Tasks Matched", stats?.matched_tasks || "0"],
        ["Total Volunteers", stats?.total_volunteers || "0"]
      ];
      
      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });

      let nextY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 100;
      doc.text("Needs Distribution by Type", 14, nextY);
      
      const typeBody = Object.entries(data.needs_by_type || {}).map(([type, count]) => [type, count]);
      autoTable(doc, {
        startY: nextY + 5,
        head: [['Need Type', 'Count']],
        body: typeBody.length > 0 ? typeBody : [["No data", "-"]],
        theme: 'striped',
        headStyles: { fillColor: [39, 174, 96] },
      });

      doc.save("SevaLink_Report.pdf");

    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate PDF report.");
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-8 flex justify-center py-20 text-blue-400"><Loader2 className="animate-spin w-8 h-8" /></div>;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {isSimActive && (
        <div className="mb-6 bg-red-600 border border-red-500 rounded-lg p-3 text-center shadow-lg animate-pulse shadow-red-500/50">
          <span className="font-bold text-white uppercase tracking-widest text-sm">⚠️ SYNTHETIC SIMULATION MODE ACTIVE ⚠️ — ALLOCATION RUNS IN SANDBOX — REAL DATA PRESERVED</span>
        </div>
      )}
      <header className="mb-10 flex justify-between items-start">
        <div>
           <h2 className="text-3xl font-bold text-white mb-2">Command Center</h2>
           <p className="text-slate-400">Real-time overview of community needs & resources.</p>
        </div>
        <NotificationBell />
      </header>

      {/* Real-time Telemetry Panel */}
      <SystemStatusPanel
        isSimActive={isSimActive}
        simNeedsCount={simNeeds.length}
        assignedCount={allocationResults && !allocationResults.isSim ? allocationResults.count : null}
      />

      {/* AI Prediction Panel */}
      <PredictionsPanel />

      {uploadMessage && (
        <div className={`mb-6 p-4 rounded-lg border ${uploadMessage.includes('Error') ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'}`}>
          {uploadMessage}
        </div>
      )}

      {allocating && (
        <div className="mb-6 bg-slate-800 rounded-lg p-6 border border-blue-500/30">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white font-medium flex items-center gap-2">
              <Loader2 className="animate-spin w-4 h-4 text-blue-400"/>
              {isSimActive ? 'Running Simulation Allocation (Sandbox)...' : 'Running Global Allocation Matcher...'}
            </span>
            <span className="text-blue-400 font-bold">{allocationProgress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-500 to-pink-500 h-2 rounded-full transition-all duration-300" style={{ width: `${allocationProgress}%` }}></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {isSimActive 
              ? 'Matching real volunteers to simulation events (sandbox). Real data will not be modified.'
              : 'Hungarian Algorithm optimizing volunteer-to-need assignments across all locations...'}
          </p>
        </div>
      )}

      {/* Allocation Results — sim only banner (real mode shows inline in priority panel) */}
      {allocationResults && !allocating && allocationResults.isSim && (
        <div className="mb-6 rounded-xl border p-5 bg-orange-500/10 border-orange-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-orange-400" />
              <div>
                <h4 className="font-bold text-lg text-orange-300">🔴 Simulation Allocation Complete (Sandbox)</h4>
                <p className="text-sm text-slate-400">
                  {allocationResults.isHungarian ? 'Hungarian Algorithm' : 'Sequential Match'} — {allocationResults.count} volunteer{allocationResults.count !== 1 ? 's' : ''} assigned across {allocationResults.assignments.length} task{allocationResults.assignments.length !== 1 ? 's' : ''} (no real data modified)
                </p>
              </div>
            </div>
            <button onClick={() => setAllocationResults(null)} className="text-slate-500 hover:text-white text-xs transition">✕ Dismiss</button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {allocationResults.assignments.map((item, idx) => {
              const isHungarianFmt = 'volunteer_name' in item;
              const needLabel = isHungarianFmt ? item.need_location : (item.need?.location || 'Unknown');
              const volLabel  = isHungarianFmt ? item.volunteer_name : (item.volunteer?.name || null);
              const needType  = isHungarianFmt ? (item.need_type || '') : (item.need?.need_type || '');
              const cost      = isHungarianFmt ? item.cost : null;
              return (
                <div key={idx} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${volLabel ? 'bg-white/5' : 'bg-red-500/5'}`}>
                  <span className="text-white font-medium truncate">{needLabel}{needType && <span className="text-slate-500 font-normal"> · {needType}</span>}</span>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {volLabel
                      ? <><span className="text-slate-400 text-xs">→</span><span className="text-blue-300 font-medium">{volLabel}</span>{cost != null && <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{Number(cost).toFixed(0)}km</span>}</>
                      : <span className="text-red-400 text-xs">No match found</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Priority List */}
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">
              {allDisplayNeeds.length === 0 && allocationResults && !allocationResults.isSim
                ? 'Volunteer Assignments'
                : 'Top Priority Actions'}
            </h3>
            {allDisplayNeeds.length === 0 && allocationResults && !allocationResults.isSim
              ? <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 size={12}/> {allocationResults.count} Assigned</span>
              : allDisplayNeeds.length > 0
                ? <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">Immediate Action Required</span>
                : <span className="px-3 py-1 bg-slate-700/50 text-slate-400 text-xs rounded-full border border-slate-600/30">All Stable</span>
            }
          </div>
          
          <div className="space-y-3">
            {allDisplayNeeds.length === 0 ? (
              allocationResults && !allocationResults.isSim ? (
                // ── Assignment results: who was assigned where ──
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-slate-500 uppercase font-semibold tracking-widest">Volunteer Assignments</p>
                    <span className="text-xs text-emerald-400 font-semibold">{allocationResults.count} assigned</span>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                    {allocationResults.assignments.map((item, idx) => {
                      const isHungarianFmt = 'volunteer_name' in item;
                      const location  = isHungarianFmt ? item.need_location  : (item.need?.location || '—');
                      const needType  = isHungarianFmt ? (item.need_type||'') : (item.need?.need_type || '—');
                      const volName   = isHungarianFmt ? item.volunteer_name  : (item.volunteer?.name || null);
                      const score     = isHungarianFmt ? null : (item.volunteer?.match_score || null);
                      const cost      = isHungarianFmt ? item.cost : null;
                      const typeIcon  = needType === 'Water' ? '💧' : needType === 'Medical' ? '🏥' : needType === 'Food' ? '🍱' : needType === 'Logistics' ? '🚛' : needType === 'Education' ? '📚' : '📍';
                      return (
                        <div key={idx} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${volName ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${volName ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                              {typeIcon}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">{location}</div>
                              <div className="text-xs text-slate-500">{needType}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3 text-sm">
                            {volName ? (
                              <>
                                <span className="text-slate-500 text-xs">→</span>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                <span className="text-blue-300 font-semibold">{volName}</span>
                                {score != null && <span className="text-[11px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded">{Number(score).toFixed(0)}%</span>}
                                {cost  != null && <span className="text-[11px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{Number(cost).toFixed(0)}km</span>}
                              </>
                            ) : (
                              <span className="text-red-400 text-xs font-medium">No volunteer found</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setShowAddNeed(true)}
                    className="mt-4 w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500/10 to-transparent hover:from-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-semibold transition-all text-sm flex items-center justify-center gap-2"
                  >
                    ➕ Report New Need
                  </button>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center gap-4 text-center">
                  <p className="text-slate-400 italic">No urgent needs found. Community is stable.</p>
                  <button
                    onClick={() => setShowAddNeed(true)}
                    className="px-5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-semibold transition-all flex items-center gap-2"
                  >
                    ➕ Report New Need
                  </button>
                </div>
              )
            ) : (
              allDisplayNeeds.map((need, idx) => (
                <div key={`${need.is_simulation ? 'sim' : 'real'}-${need.id || idx}`} className={`flex flex-col md:flex-row items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border ${need.is_simulation ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'}`}>
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${need.is_simulation ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-400'}`}>
                      {need.need_type?.charAt(0) || 'N'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white flex items-center flex-wrap gap-2">
                         {need.location}
                         {need.is_simulation && <span className="text-[10px] font-bold tracking-widest text-red-400 uppercase">SIM</span>}
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide urgency-${need.urgency_level?.toLowerCase() || 'low'}`}>
                           {need.urgency_level}
                         </span>
                      </h4>
                      <p className="text-sm text-slate-400">{need.need_type} • <span className="text-orange-300 font-medium">{need.people_affected?.toLocaleString()}</span> people affected</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Score</div>
                      <div className="font-bold text-pink-400">{need.priority_score?.toFixed(1) || 0}</div>
                    </div>
                    <button 
                      onClick={() => handleMatch(need, need.is_simulation)}
                      disabled={matchingId === need.id || allocating}
                      className="btn-primary py-2 px-4 shadow-[0_0_15px_rgba(236,72,153,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {matchingId === need.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {matchingId === need.id ? 'Matching...' : (need.is_simulation ? 'Mock Match' : 'Match & Assign')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Live Event Timeline */}
        <div className="glass-panel p-6 flex flex-col h-96">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Activity size={20} className="text-teal-400" /> Live Event Log</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {allDisplayNeeds.slice(0, 5).map((need, idx) => (
              <div key={idx} className={`relative pl-6 border-l ${need.is_simulation ? 'border-red-500/50' : 'border-teal-500/30'} pb-4 last:pb-0`}>
                <div className={`absolute w-3 h-3 rounded-full -left-[6.5px] top-1 ${need.is_simulation ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]'}`}></div>
                <div className={`text-sm font-semibold ${need.is_simulation ? 'text-red-400' : 'text-white'}`}>
                  {need.location} — {need.need_type}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {need.urgency_level} urgency • {need.people_affected?.toLocaleString()} affected • Score: {need.priority_score?.toFixed(1) ?? 'N/A'}
                </div>
              </div>
            ))}
            <div className="relative pl-6 border-l border-teal-500/30 pb-4 last:pb-0">
                <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[6.5px] top-1 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                <div className="text-sm font-semibold text-white">System Update</div>
                <div className="text-xs text-slate-400 mt-1">AI Matcher re-calibrated. Gemini 2.5 Flash active.</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Impact Predictor */}
      <div className="mt-8 glass-panel p-6 mb-10">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="text-purple-400" size={24} />
          <h3 className="text-xl font-bold text-white">AI Impact Predictor</h3>
        </div>
        <p className="text-sm text-slate-400 mb-6">Estimated reduction in unassigned critical needs based on current volunteer matches.</p>
        <div className="h-64">
          <Line 
            data={{
              labels: ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5'],
              datasets: [{
                label: 'Projected Unassigned Needs',
                data: [
                  stats?.urgent_needs || 10,
                  (stats?.urgent_needs || 10) * 0.75,
                  (stats?.urgent_needs || 10) * 0.45,
                  (stats?.urgent_needs || 10) * 0.15,
                  0
                ],
                borderColor: '#c084fc',
                backgroundColor: 'rgba(192, 132, 252, 0.2)',
                fill: true,
                tension: 0.4,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { 
                  grid: { color: 'rgba(255,255,255,0.05)' },
                  ticks: { color: '#94a3b8' }
                },
                x: { 
                  grid: { display: false },
                  ticks: { color: '#94a3b8' }
                }
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">

        {/* Quick Actions Panel */}
        <div className="glass-panel p-6 flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
          <div className="space-y-4 flex-1">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".pdf,.png,.jpg,.jpeg,.csv,.json"
            />
            {/* ── Add Need ── */}
            <button 
              onClick={() => setShowAddNeed(true)}
              className="w-full text-left p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-transparent hover:from-emerald-500/20 border border-emerald-500/20 transition-all group"
            >
              <h4 className="text-emerald-400 font-semibold mb-1 group-hover:text-emerald-300 flex items-center gap-2">
                ➕ Report New Need
              </h4>
              <p className="text-sm text-slate-400">Manually add a community need</p>
            </button>
            <button 
              onClick={handleUploadClick}
              disabled={uploading}
              className="w-full text-left p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-transparent hover:from-blue-500/20 border border-blue-500/20 transition-all group disabled:opacity-50"
            >
              <h4 className="text-blue-400 font-semibold mb-1 group-hover:text-blue-300 flex items-center gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {uploading ? 'Processing Data...' : 'Upload Survey Data'}
              </h4>
              <p className="text-sm text-slate-400">Digitize paper surveys with OCR</p>
            </button>
            <button 
              onClick={handleRunAllocation}
              disabled={allocating}
              className="w-full text-left p-4 rounded-lg bg-gradient-to-r from-pink-500/10 to-transparent hover:from-pink-500/20 border border-pink-500/20 transition-all group disabled:opacity-50"
            >
              <h4 className="text-pink-400 font-semibold mb-1 group-hover:text-pink-300 flex items-center gap-2">
                {allocating && <Loader2 className="w-4 h-4 animate-spin" />}
                {allocating ? 'Allocating...' : 'Run Allocation Matcher'}
              </h4>
              <p className="text-sm text-slate-400">
                {isSimActive 
                  ? 'Allocate volunteers to ALL simulation events (sandbox)' 
                  : 'Auto-assign volunteers to ALL needs (Hungarian Opt.)'}
              </p>
            </button>
            <button 
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="w-full text-left p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-transparent hover:from-emerald-500/20 border border-emerald-500/20 transition-all group disabled:opacity-50"
            >
              <h4 className="text-emerald-400 font-semibold mb-1 group-hover:text-emerald-300 flex items-center gap-2">
                {generatingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {generatingReport ? 'Generating...' : 'Generate Report'}
              </h4>
              <p className="text-sm text-slate-400">Export analytics for NGOs</p>
            </button>
          </div>
        </div>

        {/* Disaster Simulation Center */}
        <div className="lg:col-span-2">
           <SimulationPanel isActive={isSimActive} onSimulationUpdate={fetchData} onClear={() => { setAllocationResults(null); setAllocatedSimIds(new Set()); }} />
        </div>
      </div>
      
      <PerformancePanel />

      <MatchResultsModal 
        isOpen={modalData.isOpen} 
        onClose={() => setModalData({ isOpen: false, matches: [], need: null })} 
        matches={modalData.matches}
        need={modalData.need}
        onAssign={async (volunteerId) => {
          try {
            await volunteerAPI.assign(modalData.need.id, volunteerId, modalData.need.is_simulation);
            setModalData({ isOpen: false, matches: [], need: null });
            await fetchData();
          } catch(err) {
            console.error("Assignment failed API call", err);
          }
        }}
      />

      <AddNeedModal
        isOpen={showAddNeed}
        onClose={() => setShowAddNeed(false)}
        onSuccess={() => {
          fetchData();
          setAllocationResults(null); // reset so priority list reappears
        }}
      />
    </div>
  );
};

export default Dashboard;
