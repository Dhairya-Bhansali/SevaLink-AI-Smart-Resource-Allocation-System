import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getAnalytics: () => api.get('/dashboard/analytics'),
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

export default api;
