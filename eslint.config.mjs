import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Last, so it can switch off the stylistic rules Prettier now owns —
  // otherwise the two disagree on a save and fight each other.
  prettier,
  {
    rules: {
      /**
       * `ignoreRestSiblings` covers the omit-by-rest idiom
       * (`const { id, ...content } = slide`), which is otherwise only
       * silenceable with a `eslint-disable-next-line` — and that directive
       * stops covering the statement the moment Prettier wraps it onto
       * several lines.
       */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
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
