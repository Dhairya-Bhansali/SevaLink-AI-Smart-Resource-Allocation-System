import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, Info, AlertTriangle, XCircle, Check, Clock } from 'lucide-react';
import { toast } from 'react-toastify';

// ── IST formatter ────────────────────────────────────────────────────────────
const toIST = (timestamp) => {
  try {
    const d = new Date(timestamp);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '—';
  }
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen]               = useState(false);
  const [nowIST, setNowIST]               = useState('');
  const dropdownRef    = useRef(null);
  const latestSeenId   = useRef(0);

  // Live clock in IST
  useEffect(() => {
    const tick = () => {
      setNowIST(new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
      }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchNotifications = async (initialLoad = false) => {
    try {
      const res = await axios.get('http://localhost:8000/api/notifications');
      const newNotifs = res.data;
      
      if (!initialLoad && newNotifs.length > 0) {
        const incoming = newNotifs.filter(n => n.id > latestSeenId.current);
        incoming.forEach(n => {
          if (n.type === 'critical') toast.error(n.message);
          else if (n.type === 'warning') toast.warning(n.message);
          else toast.info(n.message);
        });
      }
      if (newNotifs.length > 0) {
        latestSeenId.current = Math.max(latestSeenId.current, Math.max(...newNotifs.map(n => n.id)));
      }
      setNotifications(newNotifs);
    } catch (e) {
      console.warn("Failed fetching notifications", e);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(false), 5000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.post(`http://localhost:8000/api/notifications/mark-read/${id}`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { console.error("Failed to mark as read"); }
  };

  const markAllRead = async () => {
    try {
      await axios.post(`http://localhost:8000/api/notifications/mark-all-read`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { console.error("Failed to mark all as read"); }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type) => {
    if (type === 'critical') return <XCircle className="w-5 h-5 text-red-500" />;
    if (type === 'warning')  return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <Info className="w-5 h-5 text-blue-500" />;
  };

  const getTypeBg = (type, is_read) => {
    if (is_read) return 'opacity-60';
    if (type === 'critical') return 'bg-red-500/5 border-l-2 border-red-500/50';
    if (type === 'warning')  return 'bg-yellow-500/5 border-l-2 border-yellow-500/40';
    return 'bg-blue-500/5 border-l-2 border-blue-500/30';
  };

  return (
    <div className="flex items-center gap-3">
      {/* Live IST clock */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
        <Clock className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-mono text-slate-300 tracking-tight">{nowIST}</span>
        <span className="text-[10px] text-slate-600 font-semibold">IST</span>
      </div>

      {/* Bell */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-slate-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full border-2 border-slate-900 pulse-badge">
              {unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 lg:w-96 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl overflow-hidden z-50">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold tracking-wide">System Events</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{nowIST} IST</p>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md">{unreadCount} New</span>}
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300 font-semibold">
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No recent notifications.</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-4 border-b border-slate-800 flex gap-3 hover:bg-slate-800/50 transition-colors ${getTypeBg(n.type, n.is_read)}`}>
                    <div className="flex-shrink-0 mt-0.5">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.is_read ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                        {n.message}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter">
                          {toIST(n.timestamp)} IST
                        </span>
                        {!n.is_read && (
                          <button onClick={(e) => markAsRead(n.id, e)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationBell;
