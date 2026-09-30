import { type Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/db/supabase-client';

type AuthState = {
  session: Session | null;
  checked: boolean;
  error: string | null;
  loading: boolean;
  init: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

let initPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  checked: false,
  error: null,
  loading: false,

  init: () => {
    if (get().checked) return Promise.resolve();
    if (initPromise) return initPromise;

    initPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      set({ session: data.session, checked: true });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session });
      });
    })().finally(() => {
      initPromise = null;
    });

    return initPromise;
  },

  signUp: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    set({ loading: false, error: error?.message ?? null, session: data.session ?? null });
    return !error;
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false, error: error?.message ?? null, session: data.session ?? null });
    return !error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));
