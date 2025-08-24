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
