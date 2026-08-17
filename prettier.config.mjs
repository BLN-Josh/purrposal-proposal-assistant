/**
 * Defaults are kept wherever the codebase already agreed with them (double
 * quotes, semicolons, 80 columns, trailing commas) so adopting Prettier
 * reformats what was genuinely inconsistent rather than the whole tree.
 *
 * @type {import("prettier").Config}
 */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],

  /**
   * Tailwind v4 has no `tailwind.config.js` — the theme is declared in CSS,
   * so the class sorter has to be pointed at the stylesheet instead.
   */
  tailwindStylesheet: "./src/app/globals.css",

  /**
   * `cn(...)` and `cva(...)` take class strings positionally, so their
   * arguments are sorted too. Without this only literal `className` values
   * are ordered and every conditional branch drifts.
   */
  tailwindFunctions: ["cn", "cva", "clsx"],
};

export default config;
