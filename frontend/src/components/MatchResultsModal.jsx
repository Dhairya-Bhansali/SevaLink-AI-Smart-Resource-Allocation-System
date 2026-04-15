import React from 'react';
import { X, CheckCircle, MapPin, Star } from 'lucide-react';

const MatchResultsModal = ({ isOpen, onClose, matches, need }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden glass-panel">
        <div className="relative p-6 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Match Output</h2>
              <p className="text-sm text-slate-400">
                Found {matches?.length || 0} suitable volunteers for {need?.location || 'this location'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {matches?.length === 0 ? (
            <div className="text-center py-8 text-slate-400 italic">
              No suitable volunteers found at this time.
            </div>
          ) : (
            matches?.map((match, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                      {match.name || 'Volunteer'}
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        {typeof match.match_score === 'number' ? `${match.match_score.toFixed(0)}% Match` : 'Matched'}
                      </span>
                    </h3>
                    <div className="flex items-center text-sm text-slate-400 gap-4">
                      <span className="flex items-center gap-1"><MapPin size={14} /> {match.location || 'Unknown'}</span>
                    </div>
                  </div>
                  <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-blue-500/30">
                    Assign
                  </button>
                </div>
                
                <div className="mt-3">
                  <div className="text-xs text-slate-500 mb-2 uppercase font-semibold">Matched Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(match.skills) 
                      ? match.skills.map((skill, sIdx) => (
                          <span key={sIdx} className="text-xs bg-white/5 text-slate-300 px-2 py-1 rounded-md border border-white/10">
                            {skill}
                          </span>
                        ))
                      : typeof match.skills === 'string' 
                        ? match.skills.split(',').map((skill, sIdx) => (
                            <span key={sIdx} className="text-xs bg-white/5 text-slate-300 px-2 py-1 rounded-md border border-white/10">
                              {skill.trim()}
                            </span>
                          ))
                        : null}
                  </div>
                  {match.reason && (
                    <div className="mt-3 text-sm text-blue-300/80 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                      <strong>AI Suggestion:</strong> {match.reason}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchResultsModal;
