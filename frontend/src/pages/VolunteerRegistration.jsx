import React, { useState } from 'react';
import { volunteerAPI } from '../services/api';

const VolunteerRegistration = () => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    availability: 'Weekends',
    skills: '' // comma separated in form, will create array on submit
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const payload = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean)
      };

      await volunteerAPI.create(payload);
      setStatus({ type: 'success', message: 'Volunteer registered successfully!' });
      setFormData({ name: '', location: '', availability: 'Weekends', skills: '' });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to register volunteer.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto py-8">
      <header className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Join the Relief Force</h2>
        <p className="text-slate-400">Register as a volunteer and help communities in need.</p>
      </header>

      <div className="glass-panel p-8 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          {status.message && (
            <div className={`p-4 rounded-lg border ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} mb-6`}>
              {status.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Full Name</label>
              <input
                required
                type="text"
                className="glass-input"
                placeholder="Jane Doe"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Location</label>
              <input
                required
                type="text"
                className="glass-input"
                placeholder="Ahmedabad, India"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Availability</label>
            <select
              className="glass-input bg-slate-900 border-white/10 appearance-none"
              value={formData.availability}
              onChange={e => setFormData({...formData, availability: e.target.value})}
            >
              <option>Weekends</option>
              <option>Weekdays</option>
              <option>Full-time Action</option>
              <option>Emergency Only</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Skills (Comma separated)</label>
            <textarea
              className="glass-input min-h-[100px] resize-none"
              placeholder="Medical, Logistics, Cooking..."
              value={formData.skills}
              onChange={e => setFormData({...formData, skills: e.target.value})}
            />
            <p className="text-xs text-slate-500">Eg: Medical, Doctor, Heavy Lifting, Teaching</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Processing...' : 'Register Volunteer Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VolunteerRegistration;
