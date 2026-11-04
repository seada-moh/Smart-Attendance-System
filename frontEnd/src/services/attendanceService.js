import api from './api';

export const attendanceService = {
  mark:           async (faceDescriptor)  => (await api.post('/attendance/mark',         { faceDescriptor })).data,
  checkout:       async (faceDescriptor)  => (await api.post('/attendance/checkout',     { faceDescriptor })).data,
  getKioskStatus: async ()               => (await api.get('/attendance/kiosk-status')).data.data,
  getCompany:     async (params = {})    => (await api.get('/reports',                  { params })).data.data,
  getMine:        async (params = {})    => (await api.get('/attendance/my',            { params })).data.data,
  getDashboard:   async ()               => (await api.get('/attendance/dashboard')).data.data,
  getMyStats:     async ()               => (await api.get('/attendance/my/stats')).data.data,
  getAnalytics:   async (params = {})    => (await api.get('/reports/analytics',        { params })).data.data,
};
