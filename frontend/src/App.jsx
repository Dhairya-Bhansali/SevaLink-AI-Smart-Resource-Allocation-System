import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import MapPage from './pages/MapPage'
import Analytics from './pages/Analytics'
import VolunteerRegistration from './pages/VolunteerRegistration'

const Sidebar = () => {
  const location = useLocation();

  const links = [
    { name: 'Dashboard', path: '/' },
    { name: 'Needs Map', path: '/map' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Register Volunteer', path: '/volunteer' },
  ];

  return (
    <div className="w-64 h-screen glass-panel rounded-none border-y-0 border-l-0 fixed top-0 left-0 p-6 flex flex-col z-20">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-pink-500 flex items-center justify-center font-bold text-xl shadow-lg">S</div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-pink-400">SevaLink AI</h1>
      </div>
      
      <nav className="flex flex-col gap-4">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link 
              key={link.name} 
              to={link.path}
              className={`p-3 rounded-lg transition-all font-medium flex items-center gap-3 ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-500/20 to-pink-500/20 text-white border border-white/10 shadow-inner' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]' : 'bg-transparent'}`}></div>
              {link.name}
            </Link>
          )
        })}
      </nav>
      
      <div className="mt-auto pt-6 border-t border-white/10 text-sm text-slate-500">
        <p>Hackathon MVP v1.0</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-64 flex-1 p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/volunteer" element={<VolunteerRegistration />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
