# PulseForge

A futuristic, offline-first workout tracker for mobile. Build and follow
structured training routines, swap exercises when equipment isn't free,
watch form videos without leaving the app, chat with an AI coach, and keep a
Duolingo-style streak going — all fully usable with no connection, syncing
to the cloud when you're back online.

## Status

🚧 Early build. Day 1 of a day-by-day build: repository scaffold only — no
app features yet. See [`DIARY.md`](./DIARY.md) for a running log of what's
been built and why.

## Planned features

- Structured routine builder (name, weight, reps, sets, video per exercise)
- Guided onboarding (height/weight/goal → starter routine) or fully manual setup
- Workout session flow: mark an exercise finished, auto-advance to the next
- Exercise substitution: swap to a bodyweight/dumbbell/free alternative when
  a machine isn't available, with reps/sets adjusted automatically
- In-app exercise videos — your own YouTube link, or an auto-recommended one
  — playing inside the app, never redirecting out
- Daily/monthly goals, workout streaks, and achievement badges
- Local reminders, tip-of-the-day, and a re-engagement nudge if you've been away
- An in-app AI coach (Gemini) that can answer questions about your routine
- Account + cross-device sync, with full offline support as the default mode

## Tech stack

| Layer | Choice |
|---|---|
| Mobile client | React Native (Expo, TypeScript), Expo Router |
| Styling / animation | NativeWind (Tailwind), Reanimated 3, `react-native-skia` |
| State | Zustand |
| Local offline storage | WatermelonDB (SQLite) |
| Backend | Supabase (Postgres, Auth, Row Level Security, Edge Functions) |
| AI coach | Gemini API, proxied through a Supabase Edge Function |
| Video | YouTube IFrame Player API via `react-native-youtube-iframe` (in-app only) |
| Testing | Jest + React Native Testing Library, Maestro (E2E) |

See the project plan for the full technology-foundation comparison and
reasoning (React Native + Expo vs. Flutter vs. fully native, and Supabase vs.
a hand-rolled backend).

## Repository layout

```
PulseForge/
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

Once WatermelonDB lands, the app needs a custom `expo-dev-client` build —
plain Expo Go won't work after that point (native module).

## License

[MIT](./LICENSE)
