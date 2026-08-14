/**
 * Balerion brand tokens for the exported .pptx (red/black/white, per the
 * source proposal decks) — deliberately NOT the editor UI's warm cream
 * theme. The editor chrome and the exported artifact are different
 * surfaces; only the slide *content* schema is shared between them
 * (Technical Design Document §0/§3.3).
 */
export const PPTX_THEME = {
  red: "E4002B",
  ink: "1A1A1A",
  gray: "5A5A5A",
  faint: "888888",
  border: "DDDDDD",
  gold: "C9A227",
  highlightTint: "FBF1DD",
  white: "FFFFFF",
  font: "Arial",
} as const;

export const PPTX_PAGE = {
  w: 13.333,
  h: 7.5,
  marginX: 0.6,
} as const;

export const LIGHT_MASTER = "PA_LIGHT";
export const DARK_MASTER = "PA_DARK";
