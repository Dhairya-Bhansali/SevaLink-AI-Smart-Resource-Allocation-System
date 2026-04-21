import React, { useEffect, useState, useRef } from 'react';
import { dashboardAPI, needsAPI, volunteerAPI, simulationAPI } from '../services/api';
import MatchResultsModal from '../components/MatchResultsModal';
import PredictionsPanel from '../components/PredictionsPanel';
import SimulationPanel from '../components/SimulationPanel';
import SystemStatusPanel from '../components/SystemStatusPanel';
import NotificationBell from '../components/NotificationBell';
import PerformancePanel from '../components/PerformancePanel';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Loader2, Activity, TrendingDown } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const fileInputRef = useRef(null);

  const fetchData = async () => {
    try {
      const statsRes = await dashboardAPI.getStats();
      setStats(statsRes.data);
      
      const needsRes = await needsAPI.getPrioritized();
      setUrgentNeeds(needsRes.data.slice(0, 5));

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

  const allDisplayNeeds = [...simNeeds, ...urgentNeeds].sort((a,b) => b.priority_score - a.priority_score).slice(0, 5);
  const isSimActive = simNeeds.length > 0;

  // FEATURE 1: Match Button
  const handleMatch = async (need, isSim) => {
    // Basic match assignment visual logic, mock if it's simulation
    setMatchingId(need.id);
    try {
      if (isSim) {
         // Create dummy match data to simulate finding resources for simulated event
         await new Promise(resolve => setTimeout(resolve, 800));
         const mockMatches = [
            { id: 991, name: "Simulation Responder Alpha", skills: ["Medical", "Water"], match_score: 95.5 },
            { id: 992, name: "Simulation Responder Beta", skills: [need.need_type], match_score: 82.0 }
         ];
         setModalData({ isOpen: true, matches: mockMatches, need });
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
      
      // Auto-refresh lists
      await fetchData();
      
      // Clear message after 3 seconds
      setTimeout(() => setUploadMessage(null), 3000);
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadMessage(error.response?.data?.detail || "Error processing file.");
      setTimeout(() => setUploadMessage(null), 3000);
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  // FEATURE 3: Run Allocation Matcher
  const handleRunAllocation = async () => {
    if (urgentNeeds.length === 0 && !isSimActive) {
      alert("No urgent needs to allocate at this time.");
      return;
    }

    setAllocating(true);
    setAllocationProgress(10);
    let matchedCount = 0;

    try {
      // Step 1: Attempt the advanced Global Optimization endpoint (Hungarian algorithm)
      const optRes = await dashboardAPI.optimizedMatch(); 
      if (optRes.data.assignments && optRes.data.assignments.length > 0) {
          setAllocationProgress(100);
          alert(`Successfully assigned ${optRes.data.assignments.length} matches globally utilizing Hungarian Optimization!`);
          await fetchData();
          setAllocating(false);
          return;
      }
    } catch (optError) {
      console.warn("Optimized allocation failed, falling back to sequential loops:", optError);
    }

    // Step 2: Fallback to Sequential Loop if optimization yielded 0 matches or errored
    try {
      // Re-fetch all prioritized before bulk matching
      const needsRes = await needsAPI.getPrioritized();
      const needsToProcess = needsRes.data.filter(n => n.urgency_level === "High" || n.urgency_level === "Critical");
      
      if (needsToProcess.length === 0) {
         setAllocating(false);
         alert("No high priority needs require allocation.");
         return;
      }

      for (let i = 0; i < needsToProcess.length; i++) {
        await volunteerAPI.match(needsToProcess[i].id);
        matchedCount++;
        setAllocationProgress(Math.round(((i + 1) / needsToProcess.length) * 100));
      }
      
      alert(`Completed sequential allocation for ${matchedCount} urgent tasks!`);
      await fetchData(); // Refresh dashboard
    } catch (error) {
      console.error("Allocation error:", error);
      alert("An error occurred during allocation matching.");
    } finally {
      setAllocating(false);
      setAllocationProgress(0);
    }
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
      
      // Summary Stats
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

      // Needs by Type
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
          <span className="font-bold text-white uppercase tracking-widest text-sm">⚠️ SYNTHETIC SIMULATION MODE ACTIVE ⚠️ - METRICS OVERRIDDEN</span>
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
      <SystemStatusPanel isSimActive={isSimActive} simNeedsCount={simNeeds.length} />

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
            <span className="text-white font-medium flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4 text-blue-400"/> Running Allocation Matcher...</span>
            <span className="text-blue-400 font-bold">{allocationProgress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${allocationProgress}%` }}></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Priority List */}
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Top Priority Actions</h3>
            <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">Immediate Action Required</span>
          </div>
          
          <div className="space-y-4">
            {allDisplayNeeds.length === 0 ? (
              <p className="text-slate-400 italic text-center py-8">No urgent needs found. Community is stable.</p>
            ) : (
              allDisplayNeeds.map((need, idx) => (
                <div key={idx} className={`flex flex-col md:flex-row items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border ${need.is_simulation ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'}`}>
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${need.is_simulation ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-400'}`}>
                      {need.need_type?.charAt(0) || 'N'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">
                         {need.location} 
                         {need.is_simulation && <span className="ml-2 text-[10px] font-bold tracking-widest text-red-400 uppercase">SIM</span>}
                      </h4>
                      <p className="text-sm text-slate-400">{need.need_type} • Affects {need.people_affected} people</p>
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
        
        {/* Bonus Feature: Live Event Timeline */}
        <div className="glass-panel p-6 flex flex-col h-96">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Activity size={20} className="text-teal-400" /> Live Event Log</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {allDisplayNeeds.slice(0, 4).map((need, idx) => (
              <div key={idx} className={`relative pl-6 border-l ${need.is_simulation ? 'border-red-500/50' : 'border-teal-500/30'} pb-4 last:pb-0`}>
                <div className={`absolute w-3 h-3 rounded-full -left-[6.5px] top-1 ${need.is_simulation ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]'}`}></div>
                <div className={`text-sm font-semibold ${need.is_simulation ? 'text-red-400' : 'text-white'}`}>
                  {need.location} reported a need
                </div>
                <div className="text-xs text-slate-400 mt-1">Resource: {need.need_type} • Score: {need.priority_score?.toFixed(1) ?? 'N/A'}</div>
              </div>
            ))}
            <div className="relative pl-6 border-l border-teal-500/30 pb-4 last:pb-0">
                <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[6.5px] top-1 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                <div className="text-sm font-semibold text-white">System Update</div>
                <div className="text-xs text-slate-400 mt-1">AI Matcher re-calibrated successfully.</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bonus Feature: Impact Predictor */}
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
                data: [stats?.urgent_needs || 10, (stats?.urgent_needs || 10) * 0.8, (stats?.urgent_needs || 10) * 0.5, (stats?.urgent_needs || 10) * 0.2, 0],
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
                y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
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
              <h4 className="text-pink-400 font-semibold mb-1 group-hover:text-pink-300">Run Allocation Matcher</h4>
              <p className="text-sm text-slate-400">Auto-assign volunteers to needs</p>
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
           <SimulationPanel isActive={isSimActive} onSimulationUpdate={fetchData} />
        </div>
      </div>
      
      <PerformancePanel />

      <MatchResultsModal 
        isOpen={modalData.isOpen} 
        onClose={() => setModalData({ isOpen: false, matches: [], need: null })} 
        matches={modalData.matches}
        need={modalData.need}
      />
    </div>
  );
};

export default Dashboard;
