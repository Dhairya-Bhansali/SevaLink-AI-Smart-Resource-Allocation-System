import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Volunteer');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/api/auth/register', { username, password, role });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="glass-panel p-8 w-full max-w-md rounded-xl">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Register</h2>
        {error && <p className="text-red-400 mb-4 text-sm text-center">{error}</p>}
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="p-3 rounded-lg bg-teal-900/40 text-white border border-teal-800 focus:outline-none focus:border-teal-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="p-3 rounded-lg bg-teal-900/40 text-white border border-teal-800 focus:outline-none focus:border-teal-500"
            required
          />
          <select 
            value={role} 
            onChange={e => setRole(e.target.value)}
            className="p-3 rounded-lg bg-teal-900/40 text-white border border-teal-800 focus:outline-none focus:border-teal-500"
          >
            <option value="Volunteer">Volunteer</option>
            <option value="NGO">NGO</option>
            <option value="Admin">Admin</option>
          </select>
          <button type="submit" className="mt-4 p-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition">
            Register
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-blue-400">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
