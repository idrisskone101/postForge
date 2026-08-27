import { createJiti } from "jiti";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const jiti = createJiti(import.meta.url);
const kodeTasteMod = jiti("./scripts/eslint-plugin-kode-taste.ts");
const kodeTaste = kodeTasteMod.default ?? kodeTasteMod;

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.tsx"],
    rules: {
      "no-nested-ternary": "warn",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/generated/**", "src/components/ui/**"],
    plugins: { "kode-taste": kodeTaste },
    rules: {
      "kode-taste/file-layout": "error",
      "kode-taste/prop-bags": "error",
      "kode-taste/use-state": "error",
      "kode-taste/use-effect": "error",
      "kode-taste/inner-html": "error",
      "kode-taste/hook-size": "error",
      "kode-taste/effect-fns": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
