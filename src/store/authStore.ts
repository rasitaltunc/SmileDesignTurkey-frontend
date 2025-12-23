import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithTestUser: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const supabase = getSupabaseClient();
          if (!supabase) {
            throw new Error('Supabase client not configured. Check your .env file.');
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
        }
      },

      loginWithTestUser: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const supabase = getSupabaseClient();
          if (!supabase) {
            throw new Error('Supabase client not configured. Check your .env file.');
          }

          console.log(`Attempting login with: ${email}`);
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            console.error('Supabase login error:', error);
            throw error;
          }

          console.log('Login successful!', data.user);
          
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          window.history.pushState({}, '', '/admin/leads');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (error: any) {
          console.error('Login error:', error);
          set({
            error: error.message || 'Login failed. Make sure test user exists in Supabase.',
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const supabase = getSupabaseClient();
          if (supabase) {
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      checkSession: async () => {
        set({ isLoading: true });
        try {
          const supabase = getSupabaseClient();
          if (!supabase) {
            set({ isLoading: false });
            return;
          }

          const { data, error } = await supabase.auth.getSession();
          
          if (error) throw error;

          if (data.session?.user) {
            set({
              user: data.session.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          console.error('Session check error:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

export const initializeAuth = async (): Promise<() => void> => {
  const { checkSession } = useAuthStore.getState();
  await checkSession();
  return () => {};
};
