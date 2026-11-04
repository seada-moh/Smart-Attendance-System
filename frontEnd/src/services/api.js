import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('sat_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) localStorage.removeItem('sat_token');
    return Promise.reject(new Error(err.response?.data?.message || err.message || 'Request failed'));
  }
);

export default api;
