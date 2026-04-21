import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8000/api/auth/login', { username, password });
      localStorage.setItem('token', res.data.access_token);
      navigate('/');
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="glass-panel p-8 w-full max-w-md rounded-xl">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Login</h2>
        {error && <p className="text-red-400 mb-4 text-sm text-center">{error}</p>}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
          <button type="submit" className="mt-4 p-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition">
            Login
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Don't have an account? <Link to="/register" className="text-blue-400">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
