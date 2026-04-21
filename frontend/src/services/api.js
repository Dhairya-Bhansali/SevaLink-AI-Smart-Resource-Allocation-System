import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Attach JWT access token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getAnalytics: () => api.get('/dashboard/analytics'),
  optimizedMatch: () => api.post('/matches/optimized'),
};

export const systemAPI = {
  getStatus: () => api.get('/system/status'),
};

export const needsAPI = {
  getAll: () => api.get('/needs'),
  getPrioritized: () => api.get('/needs/prioritized'),
  uploadSurvey: (formData) => api.post('/needs/upload-survey', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const volunteerAPI = {
  create: (data) => api.post('/volunteers', data),
  match: (needId) => api.post('/matches/match-volunteers', { need_id: needId })
};

export const simulationAPI = {
  start: (type, city) => api.post('/simulation/start', { type, city }),
  clear: () => api.delete('/simulation/clear'),
  getNeeds: () => api.get('/simulation/needs'),
};

export default api;
