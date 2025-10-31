import { supabase } from '@/db/supabase-client';

export type VideoSearchResult = {
  videoId: string;
  videoUrl: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

/**
 * Auto-recommended videos for an exercise (Day 9's cut half of the plan,
 * finished on Day 30 now that a Supabase project and a YouTube key exist to
 * proxy through). Proxied through the `video-search` Edge Function so the
 * YouTube API key never ships in the mobile bundle.
 */
export async function searchExerciseVideos(exerciseName: string): Promise<VideoSearchResult[]> {
  const { data, error } = await supabase.functions.invoke('video-search', {
    body: { query: exerciseName },
  });
  if (error || !Array.isArray(data?.results)) return [];
  return data.results;
}
