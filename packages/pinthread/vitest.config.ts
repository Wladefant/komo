import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    hookTimeout: 60000,
    testTimeout: 20000,
    fileParallelism: false,
  },
});
