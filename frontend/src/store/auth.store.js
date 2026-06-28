import { create } from 'zustand';
import { authAPI } from '../services/api.js';

export const useAuthStore = create((set, get) => ({
  user:    null,
  token:   localStorage.getItem('cc_token'),
  loading: false,
  initialized: false,

  init: async () => {
    const token = localStorage.getItem('cc_token');
    if (!token) return set({ initialized: true });
    try {
      const { data } = await authAPI.me();
      set({ user: data, initialized: true });
    } catch {
      localStorage.removeItem('cc_token');
      set({ token: null, initialized: true });
    }
  },

  register: async (formData) => {
    set({ loading: true });
    try {
      const { data } = await authAPI.register(formData);
      localStorage.setItem('cc_token', data.token);
      set({ user: data.user, token: data.token, loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  login: async (formData) => {
    set({ loading: true });
    try {
      const { data } = await authAPI.login(formData);
      localStorage.setItem('cc_token', data.token);
      set({ user: data.user, token: data.token, loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('cc_token');
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  refreshUser: async () => {
    try {
      const { data } = await authAPI.me();
      set({ user: data });
    } catch {}
  },
}));
