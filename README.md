# Anvil

A futuristic, offline-first workout tracker for mobile. Build and follow
structured training routines, swap exercises when equipment isn't free,
watch form videos without leaving the app, chat with an AI coach, and keep a
Duolingo-style streak going — all fully usable with no connection, syncing
to the cloud when you're back online.

## Status

✅ Day 17 of 17 — the planned day-by-day build is complete: routines,
onboarding, workout sessions with substitution, in-app video, Supabase
auth + backup/restore sync, streaks/goals/badges, local notifications, a
Gemini-backed AI coach grounded in your actual routine, progress
history/charts, and a WCAG-AA accessibility pass, with three refactor
passes along the way to keep debt from piling up. Honestly still
missing, not silently dropped: auto-recommended video search (no YouTube
Data API key yet), a real app icon, a background job to keep the
notification queue topped up without an app open, and true multi-device
continuous sync (what's shipped is deliberately backup/restore, not
conflict-resolving merge). See
[`DIARY.md`](./DIARY.md) for the full day-by-day log of what was built,
what was cut, and why.

## Features

- Structured routine builder (name, weight, reps, sets, video per exercise)
- Guided onboarding (height/weight/goal → starter routine) or fully manual setup
- Workout session flow: mark an exercise finished, auto-advance to the next
- Exercise substitution: swap to a bodyweight/dumbbell/free alternative when
  a machine isn't available, with reps/sets adjusted automatically
- In-app exercise videos, playing inside the app, never redirecting out —
  your own YouTube link works today; auto-recommended search is written
  but waiting on a YouTube Data API key
- Daily/monthly goals, workout streaks, and achievement badges
- Local reminders (a daily tip, a re-engagement nudge if you've been away)
- An in-app AI coach (Gemini) that answers questions grounded in your
  actual routine, not generic advice
- Workout history, a weight-progression chart, and an 8-week streak calendar
- Account + backup/restore sync, with full offline support as the default
  mode — true continuous multi-device merge is a deliberately deferred,
  harder problem (see `DIARY.md`, Day 10)

## Tech stack

| Layer | Choice |
|---|---|
| Mobile client | React Native (Expo, TypeScript), Expo Router |
| Styling / animation | NativeWind (Tailwind), Reanimated 3, `react-native-skia` |
| State | Zustand |
| Local offline storage | `expo-sqlite` + Drizzle ORM |
| Backend | Supabase (Postgres, Auth, Row Level Security, Edge Functions) |
| AI coach | Gemini API, proxied through a Supabase Edge Function |
| Video | YouTube IFrame Player API via `react-native-youtube-iframe` (in-app only) |
| Testing | Jest + React Native Testing Library, Maestro (E2E) |

See the project plan for the full technology-foundation comparison and
reasoning (React Native + Expo vs. Flutter vs. fully native, and Supabase vs.
a hand-rolled backend).

## Repository layout

```
Anvil/
├── app/            # Expo (React Native) mobile client
├── supabase/       # Postgres migrations + Edge Functions (added when cloud sync lands)
├── DIARY.md        # Running build log, one entry per feature/refactor day
└── README.md
```

## Local development

Requires Node 20+, [pnpm](https://pnpm.io), and Xcode (iOS Simulator) and/or
Android Studio (Android emulator).

```bash
pnpm install
pnpm start          # launches Expo for the app/ package
```

The app needs a custom `expo-dev-client` build — plain Expo Go doesn't work
once native modules (Skia, `expo-sqlite`, ...) are wired in.

## License

[MIT](./LICENSE)
