import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const postcssPath = require.resolve("postcss", {
  paths: [path.dirname(require.resolve("@tailwindcss/postcss"))],
});
const postcss = require(postcssPath);
const tailwindcss = require("@tailwindcss/postcss");

const input = path.join(repoRoot, "src/app/globals.css");
const output = path.join(repoRoot, "public/dashboard.css");
const css = await readFile(input, "utf8");
const result = await postcss([
  tailwindcss({ base: repoRoot, optimize: { minify: true } }),
]).process(css, { from: input, to: output });

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, result.css);
process.stdout.write(
  `wrote ${path.relative(repoRoot, output)} (${Buffer.byteLength(result.css)} bytes)\n`
);
