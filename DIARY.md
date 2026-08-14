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

## 2025-09-08 — Workout session (Today) flow

Built the real Today screen: resolves which day to train next
(`resolveNextDay` — the day after whichever one the most recent *completed*
session covered, wrapping back to the start; resumes in place if a session
is already `in_progress` rather than advancing), shows the current exercise
one at a time with a `ProgressRing` tracking completed/total, and a
"Finished" action that logs `targetSets` set rows at the target weight/reps
and advances to the next uncompleted exercise. Once every exercise is
logged, the session flips to `completed` and the screen shows a completion
state. Deliberately kept logging at the exercise level (not per-set input)
for this iteration — "Finished" logs all sets at the prescribed target, not
actual per-set weight/reps entry, which would be a nicer but bigger feature
for another day.

Pulled `resolveNextDay` out as a standalone pure function specifically so it
could be unit tested without mocking Drizzle's query chain — the rotation
math (advance/wrap/handle-a-deleted-day) is exactly the kind of logic that's
cheap to get subtly wrong and expensive to notice in person, so it got 5
direct test cases instead of being buried in the store's `load()`.

Actually got real interactive-ish verification this time, working around
the tap limitation: inserted rows directly into the simulator's SQLite file
via `sqlite3` to simulate the *results* of tapping through a session (one
exercise logged, then all three, then session marked complete), and
reloaded the app after each step. Confirmed: the progress ring fills
correctly (~1/3 → visibly a gradient arc, not just text), the screen
correctly resumes on "Incline Dumbbell Press" (the first *uncompleted*
exercise, correctly skipping the logged one) after an app restart, and —
the best find — confirmed the single-day wrap-around actually works live,
not just in the unit test: completing the routine's only day rolled back
around to a fresh "0/3, Start Workout" state for the same day, exactly as
`resolveNextDay` predicts for a 1-day routine.

Also fixed a real deprecation warning surfaced by this being the first
screen to render `ProgressRing` "for real": `Skia.Path.Make().addCircle()`
is deprecated in favor of `Skia.Path.Circle(x, y, r)` — a one-line fix once
noticed, but wouldn't have shown up without actually running the app (it's
a runtime warning, not a type or lint error).

Hit the stuck-dialog issue again from Day 5's `simctl openurl` attempt — an
"Open in PulseForge?" prompt kept reappearing on every relaunch even without
calling `openurl` again. `xcrun simctl terminate` + relaunch didn't clear
it; a full `simctl shutdown` + `boot` of the simulator did. Worth remembering
that a stuck system-level dialog might survive an app restart and need a
device-level reset instead.

## 2025-09-11 — Refactor-and-refine pass #1

First scheduled cleanup pass, surveying everything built across Days 1-6.
Found four real, evidenced issues rather than manufacturing busywork:

1. **Duplication + a real correctness bug**: onboarding's `NumberField` and
   the exercise form's `FormField` were byte-for-byte identical, and both
   let a user type more than one decimal point (`"1.2.3"` passed straight
   through, then `Number("1.2.3")` is `NaN`, and that would have hit a
   `real` column in SQLite). Extracted a shared `components/ui/number-field.tsx`
   with `sanitizeNumericInput` (keeps at most one decimal point during
   typing) and `parseOptionalNumber` (returns `null` instead of `NaN` at
   parse time, catching the edge cases typing can't, like a lone `"."`).
   Both are unit tested; both call sites (onboarding, exercise-form) now
   use the shared component instead of their own copy.
2. **Dead code**: `constants/theme.ts`'s `Fonts`/`Spacing`/`BottomTabInset`/
   `MaxContentWidth` and `hooks/use-color-scheme.ts`/`.web.ts` had zero
   remaining importers since Day 2's move to NativeWind — removed rather
   than kept "in case it's useful later," per the skill's own guidance
   against designing for hypothetical future needs. Trivial to re-add if
   actually needed.
3. **Coverage gap on code Day 8 depends on**: `alternativesFor`'s
   `JSON.parse(exercise.alternativeIds)` had no error handling — malformed
   data would throw synchronously inside a Zustand selector and crash
   whatever called it. Extracted `parseAlternativeIds` as a pure,
   try/caught, unit-tested function, since Day 8 (exercise substitution)
   is about to build directly on top of this exact code path.
4. **Missing empty state**: the exercise picker's search had no "no
   results" feedback — a query with zero matches just showed a blank list,
   inconsistent with the Routines tab's existing empty-state pattern.
   Added one.

Considered and deliberately deferred: comprehensive error handling around
every DB mutation (SQLite writes failing isn't a real observed risk here,
unlike a network call — didn't meet the bar for "concrete cost"), and
accessibility labels beyond what came free with the NumberField extraction
(full pass is explicitly Day 16's job; doing it piecemeal now risks
inconsistency with whatever systematic approach that day takes).

Validated the same way as every feature day: typecheck, lint, full test
suite (26 passing across 6 suites after this pass, up from 12), and an app
boot/smoke check on the simulator to confirm nothing broke — no full
tap-through needed since every change here was either covered by a new unit
test or was a pure removal/rename with no behavior change.

## 2025-09-15 — Exercise substitution

Added a "Swap" action next to "Finished" on the Today screen's current
exercise, opening an equipment-filterable list of alternates sourced from
`alternativesFor` (hardened just in time, Day 7). Swapping is scoped to the
current session only — it doesn't edit the routine, since the point is
"the machine isn't free right now," not "I want to change my plan."

The rep/set adjustment is deterministic, documented rules, not a guess —
matches the plan's explicit requirement that this work offline:
`adjustForSubstitution` (unit tested, 5 cases) keeps reps/sets/weight
unchanged between any two weighted equipment types (barbell/dumbbell/
machine/cable all carry over — the weight is a starting estimate, not a
recalculated conversion, since there's no reliable ratio between e.g.
barbell and dumbbell bench numbers), bumps reps ~50% and clears weight when
swapping *to* bodyweight (no external load to compensate for), and reverts
to a standard 8-12 rep range when swapping *off* bodyweight back to
something weighted. `finishExercise` now records which exercise variant was
actually used via `set_logs.substituted_exercise_id` — already in the Day 3
schema, unused until now.

Couldn't tap through the picker interactively (same simulator-automation
gap as prior days), but `SubstitutionPicker` takes its data as plain
props — no store or DB involved — so it got direct component tests instead
of a store-mocking workaround: default list, equipment-filter narrowing, the
empty-filter-result message, `onSelect`/`onCancel` firing correctly. Visually
confirmed the Today screen's new Swap/Finished button row renders correctly
on the simulator. 36 tests passing across 7 suites, up from 26.

## 2025-09-19 — Exercise video (in-app playback)

Real scope cut before starting: the plan's Day 9 called for auto-recommended
video search proxied through a Supabase Edge Function, but Supabase doesn't
exist until Day 10, and it also needs a YouTube Data API key that hasn't
been provided. Shipping a feature that references infrastructure that
doesn't exist yet isn't a real feature, so split it: today ships in-app
playback for the manual `videoUrl` field that's existed on routine exercises
since Day 5 (and was already editable, just never actually played anywhere).
The search-recommendation half moves to land after Day 10, once there's a
real Supabase project and Edge Function to proxy through, and once a
YouTube key exists. Updated the plan file to record this rather than let it
silently drop.

`VideoPlayerSheet` wraps `react-native-youtube-iframe` in a modal sheet —
plays inside the app, never redirects to the YouTube app or browser, per
the original ask. `extractYoutubeVideoId` (unit tested, 8 cases: watch
urls with and without extra query params, `youtu.be`, `/shorts/`, `/embed/`,
non-YouTube urls, empty/whitespace input) parses whatever URL shape a user
pastes into a video id, since the iframe player needs a bare id, not a full
link. Wired a "watch video" icon into both the Routines day-detail list
(every exercise row that has a link) and the Today screen's current
exercise card, falling back from the routine-specific `videoUrl` to the
exercise catalog's `defaultVideoUrl` when swapped to a substitute (which
has no per-routine link of its own).

`react-native-webview` (a new native dependency, since the iframe player is
a WebView under the hood) needed a fresh `expo run:ios` to link — checked
its and `react-native-youtube-iframe`'s freshness before installing, given
how much bleeding-edge friction this stack has already produced (both
current, `react-native-webview` is the actively-maintained
community-standard package, lower risk than Skia/WatermelonDB were). Also
had to mock `react-native-youtube-iframe` in its own test file, same pattern
as `expo-haptics` in Day 8 — the pure `extractYoutubeVideoId` function lives
in the same file as the component per the established number-field.tsx
pattern, but the component import alone pulls in the native WebView module,
which isn't mocked under Jest by default.

## 2025-09-22 — Cloud account + sync

Created a real Supabase project via CLI (`supabase projects create`,
authenticated session already logged in) rather than fabricating
connection details — ref `rldzgxehjnvzyqpttwpm`, `eu-west-1`, under the
same org as this account's other projects. Wrote the Postgres schema as a
proper migration (`supabase/migrations/..._init_schema.sql`) mirroring the
six syncable local tables (the exercise catalog stays local-only — it's
static seed data shipped in the app, nothing to sync), every table scoped
by `user_id` with RLS policies restricting access to `auth.uid() =
user_id`, and pushed it with `supabase db push` — confirmed all six tables
exist on the actual remote database afterward, not just assumed the push
succeeded.

Added `remote_id` (nullable, set once a row is first pushed) and
`updated_at` columns to the local schema for every syncable table, via a
proper Drizzle migration — SQLite's `DEFAULT (current_timestamp)` only
fires on `INSERT`, so anything that mutates a row after creation needs to
set `updated_at` itself (worth remembering for Day 14's refactor pass —
`routines-store`'s `updateExercise` and `workout-session-store`'s session
completion don't do this yet).

**Honest scope call on "sync":** true continuous bidirectional multi-device
merge is a genuinely hard problem (conflict resolution, tombstones for
deletes, FK remapping across devices) — not a one-day feature done right.
Built what's actually valuable and honestly deliverable: a "back up and
restore" sync. Signing in pushes every local row that doesn't have a
`remote_id` yet (parent-to-child order: routines → days → exercises →
sessions → set logs, since each child needs its parent's freshly-minted
Supabase UUID for the FK), and — only if this device has *no* local routine
data at all — pulls the account's existing data down instead of pushing
into it. That covers the two scenarios that actually matter for a solo
fitness-tracker user: back up what you built, and restore it on a new
phone. What it deliberately does not do: merge two devices that both have
independent local edits, or handle a delete on one device while the other
still has the row. Documented rather than silently shipped as if it were
full sync.

Auth is Supabase email/password, session persisted via
`@react-native-async-storage/async-storage` (required by `supabase-js` for
RN — without it, sessions don't survive an app restart). Local-only stays
the default and fully-functional mode; the Profile tab's sign-in form is
opt-in, matching the "guest/local-only mode" requirement from the plan.

Verified the actual database, not just the code: ran `supabase db query`
against the live project to confirm the six tables and their columns exist
post-migration, matching the pattern from every other day of not trusting a
tool's "success" output without an independent check.

That check covered the remote side but missed the local one: launching the
app on the simulator (which already had Day 4–9 test data — a real profile,
routine, and session) crashed on boot with `Database error: Failed to run
the query 'ALTER TABLE profiles ADD updated_at text DEFAULT
(current_timestamp) NOT NULL;'`. Root cause, confirmed directly against the
SQLite CLI before touching the fix: SQLite refuses `ALTER TABLE ADD COLUMN`
with a non-constant default (`CURRENT_TIMESTAMP`, `random()`, etc.) on any
table that already has rows — regardless of `NOT NULL` — and only lifts the
restriction when the table is empty. That's exactly backwards from what
this feature needs: a fresh install hits an empty `profiles` table and
would've sailed through, while every device that had already been used
through Day 9 (i.e. every real device, once this ships) would crash on
launch. `drizzle-kit`'s SQLite generator emitted the naive `ALTER TABLE`
form and doesn't fall back to a rebuild for this case.

Fixed by hand-writing the migration using SQLite's supported table-rebuild
procedure for the five tables that gained `updated_at` (`profiles`,
`routines`, `routine_days`, `routine_exercises`, `workout_sessions`):
create a `__new_<table>` with the final column set, `INSERT ... SELECT`
across with `updated_at` backfilled to `current_timestamp` for existing
rows, drop the old table, rename. `set_logs` only gained `remote_id` (no
`updated_at` in its schema), and a plain nullable `ADD COLUMN` for that is
unaffected by the restriction, so it kept the simple `ALTER TABLE` form.
Validated both paths before trusting it: copied the simulator's actual
`pulseforge.db` and replayed the rewritten migration against it
(succeeded, all 6 rows across the 5 tables preserved with real backfilled
timestamps, `id`s unchanged), and separately ran migrations 0000+0001
against a brand-new empty database to confirm fresh installs still work
and that a subsequent insert still picks up the real `DEFAULT
(current_timestamp)` automatically (table-level defaults in `CREATE TABLE`
aren't subject to the `ALTER TABLE` restriction, so the rebuild's new
tables keep working exactly like the original schema for all future
inserts).

Hit Day 3's stale-Metro-cache bug again getting the fix to actually load —
relaunching the app kept showing the byte-identical old error message even
after the SQL file was already rewritten on disk, because Metro's bundler
cache hadn't picked up the change. Same remedy as Day 3: killed the running
Metro process, `watchman watch-del-all`, `expo start --clear`. Confirmed
the real fix this time by watching Metro report a genuine rebuild ("iOS
Bundled ... entry.js (2247 modules)") before checking the simulator again
— app now boots straight past onboarding into the Today screen with the
existing routine/session data intact ("D1 - Chest and Tricep", Barbell
Bench Press 60kg 8-10x3, exactly the Day 6 test data). Worth escalating
this from a one-off Day 3 fluke to a pattern: a stale Metro cache surviving
a full app terminate+relaunch seems to specifically follow native-adjacent
changes (a rebuild-heavy SQLite migration this time, a native module
install last time), not just any code change.

Couldn't tap through to the Profile tab itself for a live sign-in/sync
run — same simulator-automation gap noted on Days 4/5/8 (no `idb`, no
accessibility permissions for `osascript`). Leaned on the same fallback as
those days: full test suite (44 passing across 8 suites, up from 36),
typecheck, and lint all green, plus the direct DB-level verification above
standing in for what a tap-through would otherwise confirm about the data
layer. The screen itself is simple, prop/store-driven conditional
rendering with no logic that a unit test wouldn't already catch. Still
the right thing to set up simulator UI automation before it blocks a day
that actually needs it — restating Day 5's note since it's now blocked
three features in a row.

## 2025-09-26 — Gamification

Built streaks, a monthly goal, and badges on top of the `streaks`/`goals`
tables that have existed since Day 3 but were unused until now — no schema
change needed today. Kept all three as one cohesive `progress-store.ts`
rather than three separate stores, since they're consumed together on one
screen and share the same underlying data (completed session dates); three
files would have meant three places re-deriving the same "which sessions
count" query.

Streak math (`updateStreakForCompletion`) is deliberately calendar-day
based, not session-based: a second workout on the same day is a no-op
(doesn't inflate the streak), the very next calendar day increments,
anything else resets to 1, and `longestStreak` only ever grows. Compares
`YYYY-MM-DD` strings via `Date.UTC` day-diffing rather than raw
millisecond subtraction between `Date` objects, specifically to avoid a
DST-related off-by-one — a 23-or-25-hour "day" near a clock change would
otherwise round to the wrong day gap. 6 unit tests cover first-ever
workout, same-day repeat, next-day increment, a new record raising
`longestStreak`, a gap resetting `currentStreak` while `longestStreak`
holds, and a reset across a month boundary specifically (to catch any
lingering month-arithmetic assumption in the day-diff).

Badges are computed, not stored: a fixed table of six thresholds
(`totalWorkouts`/`longestStreak`) evaluated fresh from data that's already
tracked, rather than a new `badges` table with its own earned-state to
keep in sync. Simpler and can't drift from the underlying stats by
construction — the tradeoff is no "earned on" timestamp for a specific
unlock date, which nothing in the plan actually asks for.

Scoped goals to monthly only, not daily-and-monthly as the README lists.
A literal daily target (e.g. "1 workout today") would just be a second,
redundant way of asking what the streak already answers — the honest
version of "daily goal" for this app *is* the streak. Monthly is the piece
that adds real information the streak doesn't have (total volume across
the month, independent of consecutive-day discipline).

Wired the streak update at the one real completion point:
`workout-session-store.ts`'s `finishExercise`, right where a session
flips to `completed`, calls `useProgressStore.getState().recordWorkoutCompletion(finishedAt)`
directly rather than making the Today screen responsible for noticing the
transition and calling it separately — the completion event and the
streak update should be impossible to get out of sync, and re-deriving
"did the session just complete" in the UI layer risked exactly that kind
of drift. Noticed and fixed a small pre-existing wrinkle while touching
this code: the session-completion write and the local state update were
each calling `new Date().toISOString()` separately, so the DB row and the
in-memory session could carry a few milliseconds apart — now computed
once and reused for both.

Verification hit the same simulator-automation wall as Days 4/5/8/10, plus
a new dead end: tried cold-launching with a `pulseforge://progress` deep
link argument on `simctl launch` hoping to land directly on the new tab
(no confirmation dialog on a cold, not-yet-running launch), but it's
ignored — `simctl launch`'s trailing arguments are process argv, not a URL
open event. `simctl openurl` while already foregrounded just errors
outright (`LSApplicationWorkspaceErrorDomain` -115), worse than Day 5's
stuck-dialog experience. Fell back to the Day 6 pattern instead: seeded a
completed session, a streak row, and a monthly goal directly into the
simulator's SQLite file, then confirmed indirectly — relaunching showed
the Today screen correctly re-deriving a fresh session for the routine's
one day (`resolveNextDay`'s wraparound, live, against the seeded
completed-session row), which is downstream of the exact same data
`progress-store` reads. Didn't get an actual screenshot of the Progress
tab rendering real streak/goal/badge data; leaning on the 14 unit tests
covering every piece of logic behind it instead. Simulator UI automation
is now four features running without it — worth actually setting up
before Day 12's notification permissions flow, which has no
DB-manipulation workaround at all.

## 2025-09-29 — Notifications & re-engagement

Added `expo-notifications` — the first new native dependency since Day 9's
WebView, so this needed a real `expo run:ios` rebuild, not just a JS
change (checked `AGENTS.md`'s standing instruction to read the current
Expo docs rather than assume the API from memory or an older SDK: the
installed version replaces `shouldShowAlert` on the notification handler
with separate `shouldShowBanner`/`shouldShowList` flags, and schedulable
triggers are now a discriminated union keyed on `SchedulableTriggerInputTypes`
rather than shape-inferred — writing against the actual installed
`.d.ts` files caught both before they became a runtime surprise).

Turned `profiles.notificationsEnabled` from a written-but-never-read
column (existed since Day 3, synced to Supabase since Day 10, never
actually set to `true` anywhere) into a real toggle — same "finish what
an earlier day's schema already promised" shape as Day 11's `streaks`/
`goals` tables.

Scoped to what a local-only, offline-first app can actually deliver
without a backend: no real push notifications (Simulator can't receive
those anyway, and there's no server to send them from), just locally
scheduled ones. Two kinds:

- **Daily reminder**: one notification a day carrying that day's tip
  rather than two separate notification categories that could both land
  the same day — "time to train" and "tip of the day" are more useful
  merged than doubled. `tipForDate` is a deterministic day-index into a
  fixed 10-tip list (`Date.UTC`-based, so it agrees with itself regardless
  of what hour it's called at); `buildDailyReminderPlan` schedules the
  next 14 days individually (each a one-off `DATE` trigger, not a
  repeating trigger, since the *content* needs to vary daily and a
  repeating trigger can't do that) and re-tops-up whenever notifications
  are (re-)enabled. Honest limitation, stated plainly rather than
  silently: there's no background task topping the queue back up to 14
  days while the app stays closed, so a user who doesn't open the app for
  two weeks straight runs out of scheduled reminders. A real background
  refresh job is more infrastructure than a solo day-by-day build
  justifies right now; the trade named explicitly rather than pretending
  this is a durable server-side scheduler.
- **Re-engagement nudge**: a single one-off notification, rescheduled
  (cancel + recreate) at the exact point `workout-session-store`'s
  `finishExercise` marks a session `completed` — same hook Day 11's
  streak update uses, so a workout completion updates the streak *and*
  pushes the "come back" nudge three days further out, in one place.
  `reengagementFireDate` is a pure function (3 unit tests, including a
  leap-year February rollover) so the date math is checked without
  needing a real 3-day wait.

Reused Day 11's `toCalendarDate` from `progress-store.ts` for turning
`finishedAt` into the plain date the reminder math needs, rather than
writing a second date-formatting helper that could quietly drift from the
first.

Verification: confirmed the meaningful regression risk directly — after
the native rebuild, relaunched and the Today tab (which transitively
imports `notifications-store` through `workout-session-store`) rendered
correctly with no crash, meaning the new native module linked and the
`Notifications.setNotificationHandler` module-load side effect didn't
blow up. Couldn't get further than that live: enabling notifications
needs a tap on the Profile tab's toggle, which then needs a tap on iOS's
system permission dialog — confirmed there's no `simctl` escape hatch for
this specifically (`simctl privacy grant` covers camera/location/contacts/
etc. but notification permission isn't a TCC service, so it's not in the
supported list), exactly the gap flagged as a risk at the end of Day 11.
Fell back to `pnpm typecheck`/`lint`/`test` (66/66 passing, 8 new for the
date-math functions) as the whole story for the actual notification
scheduling logic. Simulator UI automation has now blocked real
tap-through verification on five separate days (4, 5, 8, 10, 12) — it's
past due.

## 2025-10-03 — Gemini AI chat

Added a local-only `chat_messages` table (role/content/createdAt, plain
`CREATE TABLE` migration — no populated-table restriction to work around
this time, unlike Day 10) and a Chat tab: message list, text input,
sends through a new Supabase Edge Function (`supabase/functions/chat`)
rather than calling Gemini directly from the client, keeping the API key
server-side. Chat history is deliberately not one of the synced tables —
it's device-local scratch, not data worth a conflict-resolution story.

`buildRoutineContext` (4 unit tests) turns the user's profile and active
routine into a plain-text summary sent alongside every message, so the
coach answers about the user's actual plan ("your first push day exercise
is Barbell Bench Press at 60kg") instead of generic advice — this is
what makes it a routine coach and not a generic chatbot wrapper.

Real, evidenced surprise building this: Gemini's `generateContent`
endpoint is gone. `models/gemini-2.5-flash` 404s with "no longer
available to new users... use the Interactions API" — Google shipped a
genuinely different API surface (GA'd 2026-06-22) that restructures a
conversation as a `steps` timeline (`user_input`/`model_output`/`thought`
step objects) instead of `role: user/model` content blobs, and the actual
working endpoint (`/v1beta/interactions`) doesn't match what an
AI-generated summary of the migration guide first suggested
(`/v1beta2/interactions`, a 404 with an empty body — looked like a
plausible URL, wasn't real). Same lesson `AGENTS.md` already states for
Expo, apparently now just as true for Gemini: didn't fully trust a
one-shot doc summary either, and went back for the literal quoted
endpoint from the actual reference page before it worked. Picked
`gemini-3.6-flash` over the also-current `gemini-2.5-flash-lite` for the
better answer quality on what's meant to be a genuine coaching
conversation, not a low-latency utility call.

Verification here beat every other day so far, for a specific reason:
unlike a mobile UI tap, an Edge Function is directly `curl`-able. Deployed
for real (`supabase functions deploy chat`) and round-tripped it three
times against the live Gemini API before trusting the client code: a
plain single-turn question, a multi-turn conversation (confirming
"next time" in turn 3 correctly resolved against turn 2's bench-press
answer), and routine-context grounding (fed it the same "60kg, 8-10 reps"
context `buildRoutineContext` produces — got back concrete progressive-
overload advice citing that exact weight, not a generic answer). That's
the strongest end-to-end verification of any feature since Day 1, and it
came from the one part of this feature that *isn't* blocked by the
simulator-automation gap. The client-side chat screen itself is back to
the usual limitation — confirmed the app boots cleanly on the new
migration (chat_messages table present, all three migrations applied)
but couldn't tap into the Chat tab to see it rendered live; leaning on
typecheck/lint/the 4 new unit tests/70 total passing for that half.

## 2025-10-07 — Refactor-and-refine pass #2

Second scheduled cleanup pass, surveying Days 8-13. Four real, evidenced
issues, same bar as Day 7 — no manufactured busywork:

1. **A correctness bug named three days ago and left open**: Day 10's
   diary explicitly flagged that SQLite's `DEFAULT (current_timestamp)`
   only fires on `INSERT`, and that `routines-store`'s `updateExercise`
   and `workout-session-store`'s session completion both mutate existing
   rows without setting `updatedAt` themselves — "worth remembering for
   Day 14's refactor pass." Surveying for it surfaced a third instance in
   the same family: `notifications-store`'s `enable`/`disable` toggling
   `profiles.notificationsEnabled` without touching `updatedAt` either.
   All three now set `updatedAt: sql\`(current_timestamp)\`` — matching
   the DB's own insert-time default expression rather than a JS-computed
   ISO string, so the column never ends up mixing two timestamp formats
   depending on whether a row was last touched by an INSERT or an UPDATE.
   Concrete cost if left alone: Day 10's sync reads exactly these
   `updatedAt` values off exactly these tables.
2. **An edge case that worked by accident**: `rescheduleReengagement`
   runs immediately after `finishExercise` has already committed a
   session as completed — DB write and local state both done — as a
   best-effort side effect. If the native `scheduleNotificationAsync`
   call rejected, that exception propagated out of a fire-and-forget
   `onPress` handler as an unhandled rejection sitting on top of an
   already-successful workout completion. Wrapped it the same way the
   adjacent `cancelScheduledNotificationAsync` call already was, and
   added a regression test asserting the promise resolves even when the
   native call is mocked to reject.
3. **Duplication**: the exact one-liner `db.select().from(profiles).limit(1)`
   — "the single local profile row, or none yet" — was repeated 5 times
   across `profile-store`, `notifications-store` (×3), and `sync.ts`.
   Extracted `getLocalProfile()` into `db/profile.ts`, matching the
   existing pattern of `db/routines.ts`/`db/sync.ts` holding pure DB
   helpers separate from the Zustand stores.
4. **Dead code**: `ScreenPlaceholder` had zero remaining importers —
   its last two call sites (Progress, Chat) were replaced with real
   screens on Days 11 and 13. Removed rather than kept around, same
   reasoning as Day 7's `constants/theme.ts` removal.

Considered and deliberately deferred: rescheduling the re-engagement
nudge immediately when a user turns notifications on mid-inactivity
(currently it only gets (re)scheduled on the *next* workout completion,
so opting in while already quiet doesn't get a nudge until either a
workout happens or the streak resets). Real gap, but weaker and more
speculative than the four above — would need to decide whether to read
from `progress-store` or query `streaks` directly, and touches product
behavior more than it fixes a defect. Left named here rather than
silently dropped, candidate for a future day if it turns out to matter.

Validated the same way as Day 7: typecheck, lint, full suite (71 passing
across 11 suites, up from 70 — the one new test is the notification-
resilience regression test), and a simulator boot/smoke check to confirm
nothing broke. No full tap-through needed — every change here was either
covered by an existing or new test, or a pure removal/extraction with no
behavior change.

## 2025-10-11 — Progress & stats

Filled in what the Progress tab's original Day 2 placeholder promised
and Day 11 didn't get to: "history, weight-progression charts, and a
streak calendar." New `stats-store.ts` adds all three, reusing Day 11's
`completedSessionDates` (exported it from `progress-store.ts` rather than
re-querying the same thing a second way) for the calendar data.

Scope call on the weight chart: no exercise picker. `mostLoggedExerciseId`
auto-picks whichever exercise has the most logged sets and charts that
one — simpler than building a picker UI, and it's usually the exercise
the user actually cares about progress on (the one they do most). A
picker is a natural follow-up if it turns out people want to see a
different lift; didn't build it speculatively.

`WeightChart` is a small Skia line component (`components/ui/`, same
pattern as Day 2's `ProgressRing` — `Canvas`/`Path`/gradient stroke, no
new dependency) plotting the heaviest set per calendar date for the
picked exercise. Requires 2+ points to draw a line for the obvious
reason (a single point is a dot, not a trend) — falls back to a plain
"Xkg logged so far" line below that threshold rather than an empty
canvas.

Verification took a different shape than usual, and turned up something
genuinely useful: since unit tests mock `db` entirely, they can't catch
a wrong column name or a bad join condition. Seeded three real completed
sessions with real `set_logs` rows (varying weights across dates, mixed
exercises) directly into the simulator's SQLite file, then ran the exact
join queries `stats-store.load()` uses through the `sqlite3` CLI by hand
— confirmed the history query resolves day labels correctly and the
weight-progression source query correctly threads `substituted_exercise_id`
past `routine_exercises.exercise_id`. This is a real gap the 9 pure-function
unit tests alone don't cover (they test the logic *given* correctly-shaped
rows, not whether the query produces correctly-shaped rows), worth doing
again for future data-heavy features. Also tried one more deep-link angle
to actually see the tab rendered — `simctl openurl` from a fully
terminated app state this time, not just while foregrounded — got the
identical `LSApplicationWorkspaceErrorDomain` -115 either way, so it's
not a foreground/background distinction; the scheme just isn't resolving
in this dev-client build. Confirmed (again) that `osascript`/System
Events can list running processes — Simulator included — but the actual
click permission is the piece missing (`osascript is not allowed
assistive access`, -1719), a more precise diagnosis than prior days had.
Boot/smoke check confirmed no regression; leaning on the query
cross-check above plus the 9 unit tests for the rest.

## 2025-10-15 — Visual/accessibility polish

The day Day 7 explicitly reserved for this ("a full pass is explicitly
Day 16's job; doing it piecemeal now risks inconsistency with whatever
systematic approach that day takes"). Three real, measured issues rather
than a vague "improve accessibility" pass:

1. **WCAG contrast failure, calculated not guessed**: computed relative
   luminance by hand for every text-on-background color pair in the
   design system. `ink-faint` (`#5B6178`) on `background` (`#05060B`)
   comes out to ~3.3:1 — fails the 4.5:1 normal-text threshold, and it's
   the color for badge descriptions, timestamps, and every uppercase
   section label in the app (18 Tailwind-class usages, plus 11 more
   hardcoded as a raw hex literal in places a className can't reach —
   `Ionicons` `color`, `placeholderTextColor` — that would have silently
   drifted from the token otherwise). `#7A8099` keeps the same blue-gray
   hue and measures ~5.2:1. `ink-muted` and `danger` were already fine
   (~7.9:1 and ~7.3:1) — didn't touch what wasn't broken.
2. **Non-text information with zero screen-reader exposure**: the
   Day 11 badge grid conveyed earned/locked status *only* through border
   color and icon choice — nothing a screen reader could announce. The
   Day 15 streak calendar's 56 day-squares and the `WeightChart`'s trend
   line had the same problem in different shapes. Fixed each
   appropriately rather than applying one blanket pattern: badges became
   one accessible element per card with earned/locked stated in words;
   the calendar collapsed to one summary ("12 of 56 days completed") since
   56 individually-swiped unlabeled cells is a bad screen-reader
   experience regardless of labeling (the same reason GitHub-style
   contribution graphs don't expose per-cell semantics either); the chart
   got a real generated description (`summarizeWeightTrend`, 5 tests) since
   the trend between points genuinely isn't stated anywhere else. Also
   gave `ProgressRing` an opt-in `accessibilityLabel` prop but left both
   *current* call sites (Today's set-progress ring, the monthly-goal ring)
   without one and hidden from the accessibility tree by default — both
   sit directly next to text already stating the same number, so an
   unlabeled ring would have been a second, confusing stop for no new
   information.
3. **Inconsistent button semantics**: audited every raw `Pressable` in
   the app. Roughly half already had `accessibilityRole="button"` (tab
   bar, `OptionCard`, most icon-only buttons); the other half didn't —
   the same kind of element got different VoiceOver treatment depending
   on which screen it was on. Added the missing role to 7 of them, plus
   `accessibilityLabel` on 4 text inputs that only had a *visible* label
   via adjacent `Text` rather than a programmatic one. While in this code
   anyway, bumped three icon-only buttons (header back, video-player
   close, delete day) from a 40pt to a 44pt touch target to clear Apple's
   HIG minimum — they already had generous `hitSlop`, but the visible
   target itself was under the guideline.

Deliberately deferred, named rather than dropped: the real app icon.
Flagged back on Day 2 ("still Expo's placeholder... can land whenever
branding work happens") and still true — generating one means committing
to an actual visual identity (mark, color story beyond the existing UI
palette, platform-specific export sizes), which is a real design
decision this build hasn't made yet, not a mechanical fix like the three
above. Doing it as a rushed add-on today risked exactly the kind of
"inconsistent with whatever systematic approach" outcome this day was
supposed to avoid.

Verification: the contrast numbers are exact (hand-computed relative
luminance, not eyeballed), and a boot/smoke check confirmed the changes
render — no crash, tab bar icons visibly render in the new color. Could
not verify the actual VoiceOver experience end to end: turning VoiceOver
on in Settings needs the same tap access already unavailable in this
environment (Days 4/5/8/10/12/15), so every fix here is verified by
computed contrast numbers, code review, and the underlying RN
accessibility prop contracts (`accessible`, `accessibilityRole`,
`accessibilityLabel`) rather than by actually hearing a screen reader
announce it. Full typecheck/lint/85-test suite green throughout (5 new
tests, for `summarizeWeightTrend`).

## 2025-10-19 — Final refactor pass + report

Third and last scheduled cleanup pass. Two real bugs found by re-reading
what earlier diary entries actually promised versus what the code
actually did, plus one duplication fix with proven (not hypothetical)
drift risk:

1. **The daily-reminder queue never actually refilled.** Day 12's diary
   said the design was to "re-top up whenever notifications are
   (re-)enabled" — but the only call to `scheduleDailyReminders()` in the
   whole codebase was inside the explicit `enable()` toggle. There was no
   call anywhere on an ordinary app open. Since there's still no
   background job (an honest, stated limitation from Day 12), this meant
   *every* user's queue ran dry after 14 days regardless of how often
   they actually used the app — not just the "doesn't open the app for
   two weeks" edge case the diary's own wording implied was the risk.
   Wired `notifications-store`'s `load()` to re-top the queue
   (best-effort, caught) when notifications are already enabled, and call
   `load()` from the root layout's init effect so it fires on every cold
   launch — outside the `ready` gate, since a native scheduling call
   shouldn't hold up app boot.
2. **Enabling notifications didn't help someone already gone quiet.**
   Named and explicitly deferred on Day 11's diary, still unfixed two
   refactor passes later: opting into notifications while mid-inactivity
   didn't schedule a re-engagement nudge until the *next* workout
   completion — backwards, since that's exactly when the nudge matters
   most. `enable()` now reads the current streak's `lastWorkoutDate` and
   reschedules immediately if one exists. Last chance to close this out
   before the plan ends, so it earned its spot over a fresh, lower-stakes
   finding.
3. **Duplication with proven drift, not just theoretical risk**: audited
   every raw hex literal in the app (the places `Ionicons` `color`,
   `placeholderTextColor`, and Skia props need an actual value, not a
   Tailwind class) — 30 occurrences of 11 distinct colors across 15
   files. This is the exact bug class Day 16 had to hunt down and fix by
   grep for `ink-faint` specifically; nothing stopped the same silent
   drift from happening again for any of the other 10 colors. Extracted
   `src/constants/colors.ts` as the single source, cross-referenced with
   `tailwind.config.js` in a comment on both sides since this project has
   no tooling to derive one from the other automatically (building that
   would be more infrastructure than a 15-file color fix justifies).

Considered and passed on: a fourth issue purely for symmetry with Days
7/14's four-item pattern. Three real, well-evidenced fixes beat a
manufactured fourth — the skill's own instruction is to report findings,
not hit a quota.

Validated the same way as every pass: typecheck, lint, full suite (85
passing throughout, unchanged by this pass since none of the three fixes
needed new tests that weren't already natural extensions of existing
coverage — the queue/nudge fixes are DB+native-API orchestration, same
category the project has consistently left to code review rather than
mocking, and the color extraction is a pure rename with no behavior
change). Given the color refactor's blast radius (16 files touched), did
a live boot/smoke check specifically to catch anything a passing
typecheck could still miss — a botched sed replacement leaving a stray
literal or breaking JSX syntax entirely — and confirmed the app boots
clean with the tab bar rendering in the correct colors.

### Closing report

Seventeen days, start to finish: repo scaffold and CI on Day 1 through
this pass. What shipped: structured routines with a manual builder,
guided onboarding, a full workout session flow with exercise
substitution and adjustable targets, in-app YouTube playback, Supabase
auth with an honestly-scoped backup/restore sync, streaks/monthly
goals/badges, local notifications with a daily tip and a re-engagement
nudge, a Gemini-backed AI coach grounded in the user's actual routine,
workout history with a weight-progression chart and an 8-week streak
calendar, and a WCAG-AA accessibility pass. Three refactor passes kept
the codebase from just accumulating debt as features landed on top of
each other.

What's honestly still missing, named rather than silently absent: a
YouTube Data API key for auto-recommended videos (Day 9), a real app
icon (Day 2), a background job to keep the notification queue topped up
without requiring an app open (Day 12), true multi-device continuous
sync rather than backup/restore (Day 10), and a from-scratch VoiceOver
listening pass rather than contrast math and code review (Day 16). None
of these are secrets — every one is written down in this diary the day
it was cut, with the reasoning for why that was the right scope call at
the time rather than an oversight.

The other throughline worth naming plainly: simulator UI automation was
never available in this environment (no `idb`, no Accessibility
permission for `osascript`), which blocked live tap-through verification
on ten separate days. The fallback discipline held up across all of them
— direct SQLite state seeding to simulate real usage, real end-to-end
`curl` verification for anything server-side (the Gemini integration in
particular came out *better* verified than most UI features because of
this), and unit tests for every piece of pure logic — but it's the one
piece of infrastructure that would have made the most difference to
this build's velocity and confidence if it had existed from Day 1.
