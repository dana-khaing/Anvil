import { create } from 'zustand';

import { getLocalProfile } from '@/db/profile';
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
    const profile = await getLocalProfile();
    set({ profile, checked: true });
  },
}));
