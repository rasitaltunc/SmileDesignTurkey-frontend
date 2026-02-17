import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabaseClient } from '../lib/supabaseClient';
import { markManualLogout } from '../lib/auth/sessionRecovery';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  role: string | null;
  login: (email: string, password: string) => Promise<{ user: User | null; role: string | null } | void>;
  loginWithTestUser: (email: string, password: string) => Promise<{ user: User | null; role: string | null } | void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  fetchRole: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      role: null,

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

          if (error) {
            set({ isAuthenticated: false, role: null, user: null });
            throw error; // ÖNEMLİ: throw et ki catch'e düşsün
          }

          const uid = data.user?.id;
          if (!uid) {
            set({ isAuthenticated: false, role: null, user: null });
            throw new Error('Login succeeded but no user returned');
          }

          // ✅ Role'u API endpoint'inden çek
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          let role: string | null = null;

          if (token) {
            try {
              const r = await fetch("/api/get_current_user_role", {
                headers: { Authorization: `Bearer ${token}` },
              });
              const j = await r.json();
              if (j.ok && j.role) {
                role = String(j.role).trim().toLowerCase() || null;
              }
            } catch (err) {
              console.warn("[AuthStore] Failed to fetch role:", err);
            }
          }

          // Store'a set et
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            role,
          });

          return { user: data.user, role };
        } catch (e: any) {
          set({
            error: e?.message || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null,
            role: null,
          });
          throw e; // ÖNEMLİ: throw et ki Login.tsx'te catch'e düşsün
        }
      },

      loginWithTestUser: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        // MOCK LOGIN BYPASS
        const ENABLE_DEMO_LOGIN = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';
        if (ENABLE_DEMO_LOGIN) {
          console.log('⚡️ DEMO MODE: Bypassing Supabase Auth');

          // Determine role based on email
          let role = 'patient';
          if (email.includes('doctor')) role = 'doctor';
          if (email.includes('admin')) role = 'admin';
          if (email.includes('employee')) role = 'employee';

          // Mock delay
          await new Promise(resolve => setTimeout(resolve, 800));

          const mockUser = {
            id: 'demo-user-123',
            email: email,
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            user_metadata: { full_name: 'Demo User' },
            app_metadata: { provider: 'email' }
          } as any;

          set({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            role: role
          });

          return { user: mockUser, role };
        }

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
            set({ isAuthenticated: false, role: null, user: null });
            throw error;
          }

          console.log('Login successful!', data.user);

          const uid = data.user?.id;
          if (!uid) {
            set({ isAuthenticated: false, role: null, user: null });
            throw new Error('Login succeeded but no user returned');
          }

          // ✅ Role'u API endpoint'inden çek
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          let role: string | null = null;

          if (token) {
            try {
              const r = await fetch("/api/get_current_user_role", {
                headers: { Authorization: `Bearer ${token}` },
              });
              const j = await r.json();
              if (j.ok && j.role) {
                role = String(j.role).trim().toLowerCase() || null;
              }
            } catch (err) {
              console.warn("[AuthStore] Failed to fetch role:", err);
            }
          }

          // Store'a set et
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            role,
          });

          return { user: data.user, role };
        } catch (e: any) {
          console.error('Login error:', e);
          set({
            error: e?.message || 'Login failed. Make sure test user exists in Supabase.',
            isLoading: false,
            isAuthenticated: false,
            user: null,
            role: null,
          });
          throw e; // ÖNEMLİ: throw et ki Login.tsx'te catch'e düşsün
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          // Mark manual logout to prevent "expired" toast
          markManualLogout();

          const supabase = getSupabaseClient();
          if (supabase) {
            await supabase.auth.signOut({ scope: 'local' });
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            role: null,
          });
          // Navigate to login after logout
          window.location.assign('/login');
        }
      },

      checkSession: async () => {
        set({ isLoading: true });
        try {
          // DEMO MODE BYPASS: If we are in demo mode and have a user, don't wipe it
          const ENABLE_DEMO_LOGIN = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';
          if (ENABLE_DEMO_LOGIN) {
            const currentUser = get().user;
            if (currentUser?.id?.startsWith('demo-')) {
              console.log('⚡️ DEMO MODE: Preserving mock session');
              set({ isAuthenticated: true, isLoading: false });
              return;
            }
          }

          const supabase = getSupabaseClient();
          if (!supabase) throw new Error("Supabase client not configured");

          const { data } = await supabase.auth.getSession();
          const session = data.session;

          if (session?.user) {
            set({ user: session.user, isAuthenticated: true, error: null });
            await get().fetchRole(); // role'u da çek
          } else {
            set({ user: null, isAuthenticated: false, role: null });
          }
        } catch (e: any) {
          set({ user: null, isAuthenticated: false, role: null, error: e.message });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchRole: async () => {
        try {
          const supabase = getSupabaseClient();
          if (!supabase) {
            set({ role: null });
            return;
          }

          // ✅ Access token al
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;

          if (!token) {
            set({ role: null });
            return;
          }

          // ✅ API endpoint'inden role çek
          const r = await fetch("/api/get_current_user_role", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const j = await r.json();

          if (j.ok && j.role) {
            set({ role: String(j.role).trim().toLowerCase() || null });
          } else {
            set({ role: null });
          }
        } catch (e) {
          console.warn("[AuthStore] fetchRole error:", e);
          set({ role: null });
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
  return () => { };
};
