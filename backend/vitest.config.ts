// Source - https://stackoverflow.com/a/78802309
// Posted by c4k, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-15, License - CC BY-SA 4.0

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  test: {
    // mode defines what ".env.{mode}" file to choose if exists
    env: {...loadEnv(mode, process.cwd(), "")},
    environment: "node",
    fileParallelism: true,
    globals: true,
    globalSetup: ['./test-setup.globalSetup.ts'],
    hookTimeout: 10000,
    testTimeout: 10000,
  },
}));
