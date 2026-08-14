/**
 * Single source of truth for the design system's colors as raw hex values,
 * for the places NativeWind classNames can't reach -- `Ionicons` `color`,
 * `placeholderTextColor`, Skia `colors`/`color` props. Must be kept in sync
 * with the palette in `tailwind.config.js` by hand (NativeWind doesn't
 * expose its resolved theme to plain JS/TS at this project's current
 * tooling version). This exists because that drift already happened once,
 * silently, for `ink-faint` -- see DIARY.md, Day 16.
 */
export const colors = {
  background: '#05060B',
  ink: '#F4F5FA',
  inkMuted: '#9AA1B8',
  inkFaint: '#7A8099',
  pulse400: '#9C82FF',
  pulse500: '#7C5CFF',
  cyan400: '#22D3EE',
  flame500: '#FF7A1A',
  danger: '#F87171',
} as const;
