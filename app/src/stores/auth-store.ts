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

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  checked: false,
  error: null,
  loading: false,

  init: async () => {
    // Idempotency guard: this store lives for the whole app lifetime with
    // no natural unmount point to unsubscribe from, so the real fix is
    // making sure onAuthStateChange only ever gets subscribed once rather
    // than accumulating a new listener (each firing set({ session })
    // redundantly) on every re-run of _layout.tsx's init effect.
    if (get().checked) return;

    const { data } = await supabase.auth.getSession();
    set({ session: data.session, checked: true });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
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
