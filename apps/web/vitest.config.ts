import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{app,components,hooks,lib}/**/*.test.{ts,tsx}"],
  },
});
