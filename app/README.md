# Anvil — mobile app

Expo (React Native, TypeScript) client. See the [project README](../README.md)
for what Anvil is, the full stack, and setup instructions.

## Local development

```bash
pnpm install
pnpm --filter @anvil/app start
```

Requires the `expo-dev-client` build — plain Expo Go doesn't work once
native modules (Skia, `expo-sqlite`, ...) are wired in. See the project
README for details.
