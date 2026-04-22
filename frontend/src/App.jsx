import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import MapPage from './pages/MapPage'
import Analytics from './pages/Analytics'
import VolunteerRegistration from './pages/VolunteerRegistration'
import Login from './pages/Login'
import Register from './pages/Register'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const navLinks = [
  { name: 'Command Center', path: '/',          icon: '⚡', desc: 'Dashboard', protected: true },
  { name: 'Needs Map',      path: '/map',        icon: '🗺️', desc: 'Live Map', protected: true },
  { name: 'Analytics',      path: '/analytics',  icon: '📊', desc: 'Charts', protected: true },
  { name: 'Volunteers',     path: '/volunteer',  icon: '👥', desc: 'Register', protected: true },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Hide sidebar on auth pages or public volunteer page when not logged in
  if (['/login', '/register'].includes(location.pathname)) return null;
  if (!isAuthenticated && location.pathname === '/volunteer') return null;

  return (
    <div className="w-64 h-screen fixed top-0 left-0 flex flex-col z-20"
         style={{ background: 'rgba(7, 13, 26, 0.92)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
      
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg glow-blue"
               style={{ background: 'linear-gradient(135deg, #3b82f6, #ec4899)' }}>
            ⚕
          </div>
          <div>
            <h1 className="text-lg font-bold ai-glow-text leading-none">SevaLink AI</h1>
            <p className="text-xs text-slate-500 mt-0.5">Smart Relief Platform</p>
          </div>
        </div>
        {/* Status indicator */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="w-2 h-2 bg-emerald-400 rounded-full pulse-dot-green"></div>
          <span className="text-xs text-emerald-400 font-medium">AI Systems Online</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}></div>

      {/* Navigation */}
      <nav className="flex-1 p-4 flex flex-col gap-1.5 mt-2 overflow-y-auto">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">Navigation</p>
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(236,72,153,0.15))', border: '1px solid rgba(255,255,255,0.1)' } : {}}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r nav-active-indicator" style={{ background: 'linear-gradient(to bottom, #3b82f6, #ec4899)', boxShadow: '0 0 8px #3b82f6' }}></div>
              )}
              <span className="text-lg">{link.icon}</span>
              <div>
                <div className="text-sm font-semibold leading-none">{link.name}</div>
                <div className={`text-xs mt-0.5 ${isActive ? 'text-blue-300' : 'text-slate-600 group-hover:text-slate-500'}`}>{link.desc}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {isAuthenticated && (
          <button 
            onClick={handleLogout} 
            className="w-full mb-4 py-2 text-sm bg-red-600 hover:bg-red-500 rounded-lg text-white font-bold transition"
          >
            Logout
          </button>
        )}
        <div className="text-xs text-slate-600">
          <p className="font-semibold text-slate-500">SevaLink AI v2.0</p>
          <p className="mt-0.5">Powered by Gemini 2.5 Flash</p>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

// Also we need to export Main block because Sidebar uses useNavigate
const MainContent = () => {
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('token');
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const hideSidebar = isAuthPage || (!isAuthenticated && location.pathname === '/volunteer');
  
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className={`${hideSidebar ? 'w-full' : 'ml-64 flex-1'} p-8 max-w-full overflow-x-hidden`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/volunteer" element={<VolunteerRegistration />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <MainContent />
      <ToastContainer theme="dark" position="top-right" />
    </Router>
  );
}

export default App;

