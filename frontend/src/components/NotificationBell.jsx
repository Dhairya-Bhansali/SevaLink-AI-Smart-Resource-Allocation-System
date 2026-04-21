import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, Info, AlertTriangle, XCircle, Check } from 'lucide-react';
import { toast } from 'react-toastify';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async (initialLoad = false) => {
    try {
      const res = await axios.get('http://localhost:8000/api/notifications');
      const newNotifs = res.data;
      
      // Compare to detect new ones and fire Toasts
      if (!initialLoad && newNotifs.length > 0) {
          const prevLatestId = notifications.length > 0 ? notifications[0].id : 0;
          const incomingLatest = newNotifs.filter(n => n.id > prevLatestId);
          incomingLatest.forEach(n => {
              if (n.type === 'critical') toast.error(n.message);
              else if (n.type === 'warning') toast.warning(n.message);
              else toast.info(n.message);
          });
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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.post(`http://localhost:8000/api/notifications/mark-read/${id}`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
       console.error("Failed to mark as read");
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type) => {
    if (type === 'critical') return <XCircle className="w-5 h-5 text-red-500" />;
    if (type === 'warning') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <Info className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full border-2 border-slate-900">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 lg:w-96 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl overflow-hidden z-50">
          <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
             <h3 className="text-white font-bold tracking-wide">System Events</h3>
             {unreadCount > 0 && <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md">{unreadCount} New</span>}
          </div>
          
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
               <div className="p-6 text-center text-slate-500 text-sm">No recent notifications.</div>
            ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-4 border-b border-slate-800 flex gap-3 hover:bg-slate-800/50 transition-colors ${!n.is_read ? 'bg-slate-800/30' : 'opacity-70'}`}>
                    <div className="flex-shrink-0 mt-0.5">
                       {getIcon(n.type)}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${!n.is_read ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                        {n.message}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                         <span className="text-[10px] text-slate-500 font-mono tracking-tighter">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' })}
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
  );
};

export default NotificationBell;
