import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Activity } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';

const PerformancePanel = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);

    const fetchMetrics = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/system/performance');
            setMetrics(res.data);
            setHistory(prev => {
                const newHist = [...prev, res.data.average_response_time * 1000];
                return newHist.length > 10 ? newHist.slice(1) : newHist;
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const int = setInterval(fetchMetrics, 10000);
        return () => clearInterval(int);
    }, []);

    if (loading || !metrics) return (
       <div className="glass-panel p-6 mt-10 h-64 flex items-center justify-center border border-slate-700/50">
           <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
       </div>
    );

    const lineData = {
        labels: history.map((_, i) => `T-${10 - i}`),
        datasets: [{
            label: 'Avg Latency (ms)',
            data: history,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
        }]
    };

    const barData = {
        labels: ['Endpoint Tally'],
        datasets: [
            { label: 'Success', data: [metrics.total_requests - metrics.failed_requests], backgroundColor: '#10b981' },
            { label: 'Failed', data: [metrics.failed_requests], backgroundColor: '#ef4444' }
        ]
    };

    return (
        <div className="glass-panel p-6 mt-10 border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Activity size={20} className="text-blue-400" /> Platform Diagnostics & Metrics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                    <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider font-bold">API Average Latency</p>
                    <p className="text-2xl font-bold text-blue-400">{(metrics.average_response_time * 1000).toFixed(2)} ms</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                    <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider font-bold">ML Prediction Latency</p>
                    <p className="text-2xl font-bold text-purple-400">{(metrics.prediction_latency * 1000).toFixed(2)} ms</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                    <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider font-bold">Optimization Cycle</p>
                    <p className="text-2xl font-bold text-emerald-400">{(metrics.matching_latency * 1000).toFixed(2)} ms</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="h-64">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Performance Flow</h4>
                    <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } } } }} />
                </div>
                <div className="h-64">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Network Errors (Trailing)</h4>
                    <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } } }} />
                </div>
            </div>
        </div>
    );
};

export default PerformancePanel;
