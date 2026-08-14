import { create } from 'zustand';

import { db } from '@/db/client';
import { profiles } from '@/db/schema';

export type Profile = typeof profiles.$inferSelect;
export type Goal = NonNullable<Profile['goal']>;

type ProfileState = {
  profile: Profile | null;
  checked: boolean;
  load: () => Promise<void>;
};

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  checked: false,
  load: async () => {
    const rows = await db.select().from(profiles).limit(1);
    set({ profile: rows[0] ?? null, checked: true });
  },
}));
