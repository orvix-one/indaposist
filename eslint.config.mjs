import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const moduleInternals = {
  group: ["@/modules/*/*", "!@/modules/*/server"],
  message: "Import from module's public API: @/modules/<modulo> (or @/modules/<modulo>/server on the server).",
};

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [moduleInternals] }],
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/modules", "@/modules/*", "@/app", "@/app/*"], message: "shared no depende de modules ni de app." },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "coverage/**", "next-env.d.ts", "public/pdfjs/**"]),
]);
