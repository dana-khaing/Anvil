# PulseForge — mobile app

Expo (React Native, TypeScript) client. See the [project README](../README.md)
for what PulseForge is, the full stack, and setup instructions.

## Local development

```bash
pnpm install
pnpm --filter @pulseforge/app start
```

Requires the `expo-dev-client` build once native modules (WatermelonDB) land
— plain Expo Go will not work after that point. See the project README for
details.
