import { db } from './client';
import { profiles } from './schema';

/** The single local profile row, or null before onboarding creates one. */
export async function getLocalProfile() {
  const [profile] = await db.select().from(profiles).limit(1);
  return profile ?? null;
}
