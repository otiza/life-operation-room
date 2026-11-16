import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Icons come from components/ui/icons so skins can swap glyphs (THEMES-PLAN).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/icons.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: [{ name: "lucide-react", message: "Import icons from components/ui/icons instead." }] }],
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
