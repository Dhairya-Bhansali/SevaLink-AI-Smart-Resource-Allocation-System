import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { dashboardAPI } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await dashboardAPI.getAnalytics();
        setData(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-slate-400">Loading Analytics...</div>;

  const barChartData = {
    labels: Object.keys(data?.needs_by_type || {}),
    datasets: [
      {
        label: 'Needs by Type',
        data: Object.values(data?.needs_by_type || {}),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const pieChartData = {
    labels: Object.keys(data?.volunteers_by_skill || {}),
    datasets: [
      {
        data: Object.values(data?.volunteers_by_skill || {}),
        backgroundColor: [
          'rgba(236, 72, 153, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(14, 165, 233, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
        borderWidth: 0,
        hoverOffset: 10,
      },
    ],
  };

  const lineChartData = {
    labels: data?.needs_over_time?.dates || [],
    datasets: [
      {
        label: 'Incident Reports Over Time',
        data: data?.needs_over_time?.counts || [],
        borderColor: 'rgba(236, 72, 153, 1)',
        backgroundColor: 'rgba(236, 72, 153, 0.2)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#f8fafc'
        }
      }
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">System Analytics</h2>
        <p className="text-slate-400">Deep dive into community trends and volunteer distribution.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="glass-panel p-6 h-96 flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6">Needs by Type</h3>
          <div className="flex-1 relative">
            <Bar data={barChartData} options={{...options}} />
          </div>
        </div>

        <div className="glass-panel p-6 h-96 flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6">Volunteer Skills Distribution</h3>
          <div className="flex-1 relative pb-4 flex justify-center">
             <div className="w-full max-w-[300px]">
               <Pie data={pieChartData} options={{...options, plugins: { legend: { position: 'bottom' }}}} />
             </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 h-96 flex flex-col">
        <h3 className="text-xl font-bold text-white mb-6">Need Trajectory Over Time</h3>
        <div className="flex-1 relative">
          <Line data={lineChartData} options={{...options}} />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
