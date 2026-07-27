import { create } from 'zustand';
import { api } from '../lib/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  register: async (email, password, displayName) => {
    set({ loading: true, error: null });
    try {
      const data = await api.post<{ token: string; user: User }>('/auth/register', {
        email,
        password,
        displayName,
      });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      const data = await api.get<{ user: User }>('/auth/me');
      set({ user: data.user });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null });
    }
  },

  clearError: () => set({ error: null }),
}));
