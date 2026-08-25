import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function main(): void {
  const result = spawnSync(
    "npx",
    [
      "--yes",
      "playwright@1.55.0",
      "test",
      "-c",
      "scripts/playwright.visual.config.ts",
    ],
    { stdio: "inherit", env: process.env }
  );
  process.exit(result.status ?? 1);
}

function isCliEntry(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
}

if (isCliEntry()) {
  main();
}
