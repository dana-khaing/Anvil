// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

/**
 * Auto-recommended exercise videos (the half of Day 9's plan that was cut
 * that day: no Supabase project and no YouTube Data API key existed yet).
 * Proxies YouTube's search endpoint server-side so the API key is never
 * shipped in the mobile bundle -- same reasoning as the `chat` function
 * keeping GEMINI_API_KEY server-side.
 *
 * Requires the `YOUTUBE_API_KEY` secret (`supabase secrets set
 * YOUTUBE_API_KEY=...`), provisioned from https://console.cloud.google.com
 * (enable the "YouTube Data API v3" on a project, create an API key). That
 * key can only come from whoever owns the Google Cloud account -- this
 * function fails soft (503) rather than crash when it isn't set, matching
 * the `chat` function's pattern for GEMINI_API_KEY.
 */
export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req) => {
    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "Video search is not configured." }, { status: 503 });
    }

    const { query } = (await req.json()) as { query?: string };
    const trimmed = query?.trim();
    if (!trimmed) {
      return Response.json({ error: "query is required" }, { status: 400 });
    }

    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      videoEmbeddable: "true",
      safeSearch: "strict",
      maxResults: "6",
      q: `${trimmed} exercise tutorial form`,
      key: apiKey,
    });

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    if (!response.ok) {
      return Response.json({ error: "Video search is unavailable right now." }, { status: 502 });
    }

    const data = await response.json();
    type YoutubeSearchItem = {
      id: { videoId: string };
      snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string }; default: { url: string } } };
    };
    const items: YoutubeSearchItem[] = data.items ?? [];

    const results = items
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        videoId: item.id.videoId,
        videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default.url,
      }));

    return Response.json({ results });
  }),
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/video-search' \
    --header 'apiKey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
    --data '{"query":"barbell bench press"}'

*/
