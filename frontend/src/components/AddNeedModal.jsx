import React, { useState } from 'react';
import { X, MapPin, AlertTriangle, Users, Tag, Hash } from 'lucide-react';
import { needsAPI } from '../services/api';

const NEED_TYPES = ['Water', 'Medical', 'Food', 'Education', 'Logistics', 'First Aid', 'Heavy Lifting', 'Shelter', 'Other'];
const URGENCY_LEVELS = ['Critical', 'High', 'Medium', 'Low'];
const KNOWN_CITIES = ['Ahmedabad', 'Surat', 'Mumbai', 'Delhi', 'Pune', 'Gandhinagar', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Jaipur', 'Lucknow'];

const URGENCY_COLORS = {
  Critical: 'text-red-400 border-red-500/40 bg-red-500/10',
  High:     'text-orange-400 border-orange-500/40 bg-orange-500/10',
  Medium:   'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
  Low:      'text-blue-400 border-blue-500/40 bg-blue-500/10',
};

const AddNeedModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    community_id: '',
    location: '',
    need_type: 'Medical',
    people_affected: '',
    urgency_level: 'High',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!form.location.trim()) return setError('Location is required.');
    if (!form.people_affected || Number(form.people_affected) < 1) return setError('People affected must be at least 1.');
    if (!form.community_id || Number(form.community_id) < 1) return setError('Community ID is required.');

    setSubmitting(true);
    try {
      await needsAPI.create({
        community_id: Number(form.community_id),
        location: form.location.trim(),
        need_type: form.need_type,
        people_affected: Number(form.people_affected),
        urgency_level: form.urgency_level,
      });
      onSuccess?.();
      onClose();
      // Reset form
      setForm({ community_id: '', location: '', need_type: 'Medical', people_affected: '', urgency_level: 'High' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add need. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="relative p-6 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 to-blue-500/10">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
            <X size={22} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Report New Need</h2>
              <p className="text-sm text-slate-400">Add a community need to the system</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={12} /> Location
            </label>
            <div className="flex gap-2">
              <input
                list="city-suggestions"
                value={form.location}
                onChange={e => handleChange('location', e.target.value)}
                placeholder="e.g. Ahmedabad, Surat, Pune..."
                className="glass-input flex-1"
                required
              />
              <datalist id="city-suggestions">
                {KNOWN_CITIES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          {/* Need Type */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Tag size={12} /> Need Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {NEED_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleChange('need_type', type)}
                  className={`text-sm py-2 px-3 rounded-lg border font-medium transition-all ${
                    form.need_type === type
                      ? 'bg-blue-500/20 border-blue-500/60 text-blue-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={12} /> Urgency Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {URGENCY_LEVELS.map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleChange('urgency_level', level)}
                  className={`text-sm py-2 px-2 rounded-lg border font-semibold transition-all ${
                    form.urgency_level === level
                      ? URGENCY_COLORS[level]
                      : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* People Affected + Community ID row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Users size={12} /> People Affected
              </label>
              <input
                type="number"
                min="1"
                value={form.people_affected}
                onChange={e => handleChange('people_affected', e.target.value)}
                placeholder="e.g. 250"
                className="glass-input"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Hash size={12} /> Community ID
              </label>
              <input
                type="number"
                min="1"
                value={form.community_id}
                onChange={e => handleChange('community_id', e.target.value)}
                placeholder="e.g. 201"
                className="glass-input"
                required
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/15 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Preview badge */}
          {form.location && form.need_type && form.urgency_level && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
              <span className="text-2xl">
                {form.need_type === 'Water' ? '💧' : form.need_type === 'Medical' ? '🏥' : form.need_type === 'Food' ? '🍱' : form.need_type === 'Education' ? '📚' : form.need_type === 'Logistics' ? '🚛' : '📍'}
              </span>
              <div>
                <span className="text-white font-semibold">{form.location}</span>
                <span className="text-slate-400"> · {form.need_type}</span>
                <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full border ${URGENCY_COLORS[form.urgency_level]}`}>
                  {form.urgency_level}
                </span>
              </div>
              {form.people_affected && (
                <span className="ml-auto text-orange-300 font-semibold text-sm">
                  {Number(form.people_affected).toLocaleString()} affected
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adding...</>
                : 'Add Need to System'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNeedModal;
