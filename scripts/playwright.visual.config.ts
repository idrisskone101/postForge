import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "visual-regression.spec.ts",
  timeout: 180_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.LH_BASE ?? "http://127.0.0.1:3000",
    screenshot: "off",
    video: "off",
  },
});
