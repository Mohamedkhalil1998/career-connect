import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

// Attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('cc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cc_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──
export const authAPI = {
  register: (data)     => api.post('/auth/register', data),
  login:    (data)     => api.post('/auth/login', data),
  me:       ()         => api.get('/auth/me'),
};

// ── CV ──
export const cvAPI = {
  upload:   (formData) => api.post('/cv', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list:     ()         => api.get('/cv'),
  get:      (id)       => api.get(`/cv/${id}`),
  download: (id)       => api.get(`/cv/${id}/download`),
};

// ── Assessments ──
export const assessmentAPI = {
  create:  (data)     => api.post('/assessments', data),
  list:    ()         => api.get('/assessments'),
  get:     (id)       => api.get(`/assessments/${id}`),
  start:   (id)       => api.post(`/assessments/${id}/start`),
  proctor: (id, data) => api.post(`/assessments/${id}/proctor`, data),
  submit:  (id, data) => api.post(`/assessments/${id}/submit`, data),
};

// ── Jobs ──
export const jobAPI = {
  list:    (params) => api.get('/jobs', { params }),
  matches: ()       => api.get('/jobs/matches'),
  get:     (id)     => api.get(`/jobs/${id}`),
  seed:    ()       => api.get('/jobs/seed'),
};

// ── Applications ──
export const applicationAPI = {
  apply:          (data)       => api.post('/applications', data),
  list:           (params)     => api.get('/applications', { params }),
  updateStatus:   (id, data)   => api.patch(`/applications/${id}`, data),
  delete:         (id)         => api.delete(`/applications/${id}`),
  coverLetter:    (data)       => api.post('/applications/cover-letter', data),
};

// ── Profile ──
export const profileAPI = {
  get:    ()     => api.get('/profile'),
  update: (data) => api.patch('/profile', data),
};
