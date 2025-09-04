# PulseForge — build diary

A running, first-person log of what was built each day and why. One entry
per feature or refactor pass, dated to match the git history.

## 2025-08-20 — Repo init & decoration

Kicked off PulseForge. Chose React Native (Expo, TypeScript) over Flutter
and fully-native for the client — closest technical contest was Flutter
(smoother worst-case animation ceiling), but React Native won on team fit
for a solo build (one language across client and backend), Expo/EAS's much
lower deployment overhead, and its stronger job-market relevance. Chose
Supabase over a hand-rolled Node backend for the eventual cloud-sync feature
— battle-tested Auth beats a junior dev owning password/session security
alone, and Postgres fits the relational stats/streak queries better than a
NoSQL alternative would.

Scaffolded the Expo app in `app/` (SDK 57, already ships with Reanimated 4
and gesture-handler out of the box), set up the pnpm workspace, wrote the
real README, added an MIT LICENSE, and wired up GitHub Actions CI
(typecheck/lint/test). No app features yet — this day is pure scaffold and
repo decoration, per the plan's rule that repo decoration earns its own day
like any other feature.

Toolchain note: this machine has Xcode/iOS Simulator ready but no local
Android SDK. Decided to develop against iOS Simulator for now; Android
builds are still possible later via EAS cloud build without a local SDK, and
we can add Android Studio + emulator locally whenever local Android testing
is wanted.

## 2025-08-24 — Design system & navigation shell

Wired up NativeWind (Tailwind) with a dark, futuristic palette — `pulse`
(violet) and `cyan` accents, a `flame` tone reserved for the streak feature —
plus a base UI kit: `Button` (Reanimated press-scale + haptics), `Card`,
`GlassPanel` (`expo-blur`, with a flat fallback on web where there's no
backdrop-filter equivalent), and a `ProgressRing` rendered with
`@shopify/react-native-skia` (a swept-gradient stroke trimmed by progress,
not a raster asset).

Hit a few bleeding-edge integration snags worth remembering (SDK 57 / RN 0.86
/ React 19.2 is very new): pnpm's strict linking needed
`react-native-css-interop` added as a direct dependency (NativeWind only
declares it as its own nested dependency, so Metro couldn't resolve
`react-native-css-interop/jsx-runtime` from app code without it); Jest needed
`react-native-worklets/jest/resolver.js` wired in explicitly, since
`jest-expo` doesn't yet bundle it and the native worklets binding otherwise
crashes under Jest; and Skia needed `npx install-skia` to fetch prebuilt
binaries before CocoaPods would resolve.

Replaced the default template's native OS tab bar (`NativeTabs`, marked
unstable, and too locked-down stylistically for the look we want) with
`expo-router/js-tabs`' custom `tabBar` render prop, so the floating glass
pill tab bar — Today, Routines, Progress, Chat, Profile — animates and styles
however we choose. Removed the template's demo screens, icons, and the old
light/dark `Colors` object now superseded by the NativeWind tokens.

Deferred: real app icon/logo — still Expo's placeholder. Not blocking; can
land whenever branding work happens.

## 2025-08-28 — Local offline data layer

Planned to use WatermelonDB for local storage (per the original tech
foundation), but building it out surfaced a real blocker: it has no Expo
config plugin and needs manual edits to native `MainApplication`/`AppDelegate`
code that Expo's managed prebuild would silently wipe every time the native
project regenerates — and its changelog doesn't confirm React Native
0.86/New Architecture support. Switched to `expo-sqlite` (Expo's own
first-party, fully-autolinked SQLite module) with Drizzle ORM, which
officially supports `expo-sqlite` as a driver. Trade-off: no WatermelonDB-
style reactive observables, so Zustand stores re-query explicitly after
mutations instead of updating themselves automatically — `useExerciseLibraryStore`
establishes that pattern for the stores still to come.

Modeled the schema around what the app actually needs to track: `profiles`
(height/weight/goal/notification prefs, single local row until accounts land),
a static `exercises` catalog (seeded, not user-editable — equipment tag +
JSON-encoded alternative-exercise ids for the Day 8 substitution feature),
`routines` → `routine_days` → `routine_exercises` (the user's actual plan,
mirroring the "D1 - Chest and Tricep..." note format: weight/reps/sets/video
per exercise), and `workout_sessions` → `set_logs` for what actually happened
in a session, including which exercise variant was used if substituted.
`streaks`/`goals` are separate small tables for the gamification feature.

Seeded ~50 exercises across all major muscle groups, each tagged with
equipment and cross-linked alternatives (e.g. barbell/dumbbell/machine bench
press all point at each other), plus three ready-made split templates —
Push/Pull/Legs, Upper/Lower, and a 6-day Bro Split whose Day 1 deliberately
matches the "D1 - Chest and Tricep" example from the original note format.
Added a data-integrity test that checks every alternative-exercise reference
actually exists in the catalog and that nothing lists itself as its own
alternative — caught this would otherwise fail silently at runtime.

Migrations run via Drizzle's `useMigrations` hook on launch, gating the
splash-screen fade-out on migrations *and* the exercise-library seed
finishing, so the app never shows an empty screen before data is ready.

Operational note for future me: after the `expo-sqlite` rebuild, the
simulator briefly showed Day 2's tab-bar bug again (icons stacked, no
card/glass styling) even after a full app terminate+relaunch. Turned out to
be a stale Metro/Watchman cache — likely confused by the amount of git
history rewriting (resets, cherry-picks) earlier in the build, not a real
regression. `watchman watch-del-all` + `expo start --clear` fixed it
immediately. Worth trying that first if styling looks broken for no reason
after a native rebuild.

## 2025-08-31 — Onboarding flow

Built a 5-step wizard (welcome → height/weight → goal → split → review) as
a single screen with local step state rather than one route per step —
there's no reason to navigate away and lose back-button history for what's
fundamentally one linear form. Finishing either inserts a `profiles` row and
generates a routine from the chosen split template (`createRoutineFromTemplate`
in `db/routines.ts`, reusing the Day 3 seed templates), or — for "I'll build
my own routine" — inserts a bare profile with no routine, landing on an
empty Routines tab that Day 5's manual builder will fill in.

Routing the gate itself was the interesting part: used `Stack.Protected`
(new-ish Expo Router API, `<Stack.Protected guard={...}>`) to show either
the tab shell or `/onboarding` depending on whether a profile row exists,
checked once in the root layout alongside the migration/seed gate. Cleaner
than a manual `<Redirect>` — it also handles redirecting away if the guard
flips while a protected route is already active.

Couldn't tap through the flow interactively on the simulator — no
Accessibility/automation permissions available in this environment for
`osascript`, and `idb` isn't installed. Visually confirmed the welcome step
renders correctly, then wrote a real component test
(`onboarding/index.test.tsx`) that drives the entire wizard via
`fireEvent.press`/`changeText` end to end, including the disabled-Continue
validation and both the "create a routine" and "skip" exit paths — stronger
coverage than a manual tap-through would have given anyway, and it stays
useful as a regression check going forward. Learned `fireEvent.press` is
async in this Testing Library version, same as `render` (Day 1) — needs
`await` or the next assertion runs before the state update lands.

## 2025-09-04 — Manual routine builder

Built out the real Routines tab: a list of the active routine's days, a day
detail screen (exercises with weight/reps/sets, tap to edit, X to remove),
and an exercise-form screen that's a searchable picker from the seeded
library when adding, or a pre-filled edit form when tapping an existing
entry — the same screen handles both, keyed off whether an `entryId` param
is present. `routines-store.ts` (Zustand) owns the CRUD, following the Day 3
explicit-reload-after-mutation pattern; every mutation just calls `load()`
again rather than trying to patch state in place, which is simple enough at
this data size not to be worth optimizing away.

Hit a real Metro bundling bug getting here: Expo Router's file-based routing
uses a `require.context` over the whole `app/` directory to discover routes,
and it has no built-in exclusion for `.test.tsx` files — so the Day 4
`onboarding/index.test.tsx`, co-located next to the screen it tested, was
getting eagerly bundled into the actual app bundle and pulling in
`@testing-library/react-native`, which broke bundling entirely. Moved it to
`src/__tests__/onboarding-screen.test.tsx` (importing the screen via the
`@/` alias) — outside the router's scan root. Established this as the
convention going forward: test files for anything under `src/app/` live in
`src/__tests__/`, not co-located; component tests for things outside
`src/app/` (like `src/components/ui/button.test.tsx`) can stay co-located
since Metro's route scanner never sees them.

Verification was more limited than I'd like: confirmed the app boots into
the tab shell correctly (inserted a `profiles` row directly into the
simulator's SQLite file via `sqlite3` to get past the onboarding gate
without being able to tap through it), and confirmed via `pnpm typecheck`
that every route reference (`router.push('/routines/exercise-form')` etc.)
resolves against Expo Router's generated typed routes. Tried deep-linking
straight to `/routines` as a workaround for not being able to tap
(`xcrun simctl openurl`), but iOS shows an "Open in PulseForge?"
confirmation dialog for externally-triggered scheme opens that I can't
dismiss without a tap either — so the CRUD screens themselves are verified
by code review and typechecking, not a live run. Worth deliberately setting
up simulator UI automation (or Maestro, already planned for Day 7+ E2E)
before Day 6, since the Today/workout-session flow is exactly the kind of
interactive, multi-step screen that most needs a real tap-through.
