import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  role: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithTestUser: (email: string, password: string) => Promise<void>;
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

          // Role'u direkt çek (fetchRole RPC kullanıyor, burada da aynısını yapabiliriz)
          const { data: roleData, error: roleErr } = await supabase.rpc('get_current_user_role');
          const role = roleErr ? null : (String(roleData || '').trim().toLowerCase() || null);

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
          throw e; // ÖNEMLİ: throw et ki Navbar.tsx'te catch'e düşsün
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
            set({ isAuthenticated: false, role: null, user: null });
            throw error; // ÖNEMLİ: throw et ki catch'e düşsün
          }

          console.log('Login successful!', data.user);

          const uid = data.user?.id;
          if (!uid) {
            set({ isAuthenticated: false, role: null, user: null });
            throw new Error('Login succeeded but no user returned');
          }

          // Role'u direkt çek
          const { data: roleData, error: roleErr } = await supabase.rpc('get_current_user_role');
          const role = roleErr ? null : (String(roleData || '').trim().toLowerCase() || null);

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
            role: null,
          });
          // Navigate to home after logout
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      },

      checkSession: async () => {
        set({ isLoading: true });
        try {
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

          // ✅ En sağlam: DB fonksiyonundan rol çek
          const { data, error } = await supabase.rpc("get_current_user_role");
          if (error) throw error;

          set({ role: (data as string) || null });
        } catch (e) {
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
  return () => {};
};
