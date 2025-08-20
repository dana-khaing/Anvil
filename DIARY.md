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
