import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export function automationsBuilderSource() {
  const dir = new URL("../../src/app/(app)/automations/new/", import.meta.url);
  const chunks: string[] = [];

  function walk(relative: string) {
    const full = new URL(relative, dir);
    for (const entry of readdirSync(full)) {
      const child = `${relative}${entry}`;
      const abs = join(full.pathname, entry);
      if (statSync(abs).isDirectory()) {
        walk(`${child}/`);
        continue;
      }
      if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
        chunks.push(readFileSync(abs, "utf8"));
      }
    }
  }

  walk("");
  return chunks.join("\n");
}
