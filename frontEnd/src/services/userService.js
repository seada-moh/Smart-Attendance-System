import api from './api';

export const userService = {
  getAll:         async (params = {})        => (await api.get('/users', { params })).data.data,
  getById:        async (id)                 => (await api.get(`/users/${id}`)).data.data.user,
  update:         async (id, payload)        => (await api.put(`/users/${id}`, payload)).data.data.user,
  remove:         async (id)                 => (await api.delete(`/users/${id}`)).data,
  updateFace:     async (id, faceDescriptor) => (await api.patch(`/users/${id}/face`, { faceDescriptor })).data.data.user,
  getDepartments: async ()                   => (await api.get('/users/departments')).data.data.departments,
};
