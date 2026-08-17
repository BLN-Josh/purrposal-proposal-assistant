/**
 * Design tokens for the exported .pptx, per `balerion-deck-system.md` §1.
 * Deliberately NOT the editor UI's warm cream theme — the editor chrome and
 * the exported artifact are different surfaces; only the slide *content*
 * schema is shared between them (Technical Design Document §0/§3.3).
 *
 * PALETTE PROVENANCE — read before changing a hex here.
 * The deck-system spec was derived from the 2025 decks and lists
 * `brand.red E8352A` / `ui.redBar C00000` / `domain.secondary 1F5FA8`.
 * Those are superseded: the official brand palette is the 5-step red→amber
 * ramp in BRAND_GRADIENT. Every accent token below is mapped onto that ramp
 * instead of the spec's literal hexes, so the deck stays on-brand while
 * keeping the spec's *semantics* (which token is used where). The spec's
 * neutrals are kept verbatim — they're achromatic and don't conflict.
 *
 * The one deliberate divergence worth knowing: the spec runs a second
 * "domain" stream in blue. There is no blue in the brand palette, so the
 * secondary domain uses gradient step 4 (amber-orange). A deck therefore
 * never mixes a warm brand accent with a cold one.
 */

/** The official Balerion brand ramp, dark red → amber. Order is meaningful:
 * index 0 is the primary accent, index 4 the lightest. */
export const BRAND_GRADIENT = [
  "EF233C",
  "F23A3E",
  "F44F40",
  "F76C43",
  "FC9947",
] as const;

/** pptxgenjs rejects a leading '#'; brand values get pasted in with one
 * about half the time, so normalize rather than fail at render. */
export function normalizeHex(hex: string): string {
  return hex.trim().replace(/^#/, "").toUpperCase();
}

/** Mix `hex` toward white. Used to derive a tint that tracks a custom
 * accent instead of hard-coding one tint per brand colour. */
export function tint(hex: string, whiteRatio: number): string {
  const h = normalizeHex(hex);
  const mix = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16);
    return Math.round(c * (1 - whiteRatio) + 255 * whiteRatio);
  };
  return [0, 2, 4]
    .map((i) => mix(i).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * WCAG relative luminance → the contrast-legible text colour for a fill.
 *
 * The house rule is white type on brand fills, and the ramp mostly supports
 * it: measured against white, brand steps 1–4 run 4.22 / 3.85 / 3.48 / 2.92,
 * and step 5's amber only manages 2.15. The threshold sits at 2.8 rather
 * than WCAG's 3.0 for large text so that step 4 — which misses the bar by
 * 0.08 and is indistinguishable from step 3 in practice — keeps white type
 * and the ramp stays a ramp. Step 5 is genuinely unreadable in white and
 * takes ink instead. Mirrored by BRAND_STEP_ON_FILL in slide-primitives.tsx;
 * change one and you must change the other.
 */
export function textColorFor(bgHex: string): string {
  const h = normalizeHex(bgHex);
  const lin = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  return 1.05 / (lum + 0.05) >= 2.8 ? "FFFFFF" : "000000";
}

/**
 * Spec §1.1. pptxgenjs `LAYOUT_WIDE`.
 *
 * Derived from the renderer, which sizes slides in `cqw` — at 16:9 the slide
 * is 13.333in wide, so 1cqw = 0.13333in and the two reconcile exactly.
 * Change a value here and change its `cqw` counterpart in
 * slide-primitives.tsx, or the export drifts from the preview.
 */
export const PAGE = {
  w: 13.333,
  h: 7.5,
  /** 5cqw — matches the renderer frame's padding. */
  marginX: 0.667,
  marginTop: 0.667,
  marginBottom: 0.667,
  /** marginTop + the two-line title block + the renderer's 2cqw body gap. */
  bandTop: 1.95,
  bandBottom: 6.83,
  /** Height reserved for the two-line title, at the type sizes below. */
  titleH: 1.02,
} as const;

export const STROKE = { hairline: 0.75, accent: 1.0 } as const;
export const GAP = {
  tight: 0.06,
  normal: 0.12,
  column: 0.25,
  block: 0.35,
} as const;

/** Deck-level knobs. Every field is optional; `resolveTheme` fills defaults.
 * This is the customization surface — a caller can restyle a whole deck
 * without touching a builder. */
export interface DeckThemeOverrides {
  /** Primary accent. Defaults to BRAND_GRADIENT[0]. */
  accent?: string;
  /** Full accent ramp for kinds that enumerate items (timeline, team). */
  gradient?: readonly string[];
  /** Accent for the secondary domain/stream. Defaults to gradient step 4. */
  accentSecondary?: string;
  font?: string;
  /** Filename of the header logo *within* `LOGO_DIR`, or null to omit it.
   * A bare filename, never a path — see LOGO_DIR for why. */
  logoFile?: string | null;
  /** Footer confidentiality line, or null to omit. Spec §1.4 ships
   * "Strictly Confidential"; a client-shared deck often wants it gone. */
  footerLabel?: string | null;
  showPageNumbers?: boolean;
}

export interface ResolvedTheme {
  accent: string;
  accentSecondary: string;
  gradient: readonly string[];
  /** Spec `ui.*` neutrals — achromatic, taken verbatim from the spec. */
  black: string;
  white: string;
  gray700: string;
  gray500: string;
  gray100: string;
  border: string;
  /** Derived from `accent`/`accentSecondary` so custom accents stay coherent. */
  tintPrimary: string;
  tintSecondary: string;
  tintNeutral: string;
  statusCritical: string;
  statusModerate: string;
  disabled: string;
  font: string;
  logoFile: string | null;
  footerLabel: string | null;
  showPageNumbers: boolean;
}

/**
 * The one directory brand logos may be read from.
 *
 * This is a fixed literal rather than a caller-supplied path for two
 * reasons, and both matter:
 *
 * 1. Security. `theme` arrives in the POST body of /api/export/pptx, so a
 *    caller-controlled path joined onto process.cwd() is an arbitrary file
 *    read — `{"logoFile":"../../.env"}` would base64 the environment into
 *    the .pptx the caller then downloads. Constraining this to a filename
 *    inside a fixed folder (and re-checking the resolved path, see
 *    `resolveLogoPath`) removes the class of bug rather than one instance.
 * 2. Build output size. Turbopack statically traces filesystem access; a
 *    fully dynamic `path.join(process.cwd(), someVar)` makes it give up and
 *    bundle the entire project — including all of /public — into the route.
 *    Scoping the join to a literal subfolder is exactly the fix its warning
 *    asks for.
 */
export const LOGO_DIR = "public/brand";
export const DEFAULT_LOGO_FILE = "balerion-logo.png";

/** A bare image filename: no separators, no traversal, known extension. */
const SAFE_LOGO_FILE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*)\.(?:png|jpe?g)$/;

export function isSafeLogoFile(name: string): boolean {
  return SAFE_LOGO_FILE.test(name) && !name.includes("..");
}

export function resolveTheme(o: DeckThemeOverrides = {}): ResolvedTheme {
  const gradient = (o.gradient?.length ? o.gradient : BRAND_GRADIENT).map(
    normalizeHex,
  );
  const accent = normalizeHex(o.accent ?? gradient[0]);
  const accentSecondary = normalizeHex(
    o.accentSecondary ?? gradient[Math.min(3, gradient.length - 1)],
  );
  return {
    accent,
    accentSecondary,
    gradient,
    black: "000000",
    white: "FFFFFF",
    gray700: "595959",
    gray500: "808080",
    gray100: "F2F2F2",
    border: "BFBFBF",
    tintPrimary: tint(accent, 0.88),
    tintSecondary: tint(accentSecondary, 0.88),
    tintNeutral: "F2F2F2",
    statusCritical: accent,
    statusModerate: "000000",
    disabled: "D9D9D9",
    font: o.font ?? "Arial",
    logoFile: o.logoFile === undefined ? DEFAULT_LOGO_FILE : o.logoFile,
    footerLabel:
      o.footerLabel === undefined ? "Strictly Confidential" : o.footerLabel,
    showPageNumbers: o.showPageNumbers ?? true,
  };
}

/**
 * Spec §1.3 type ramp. Sizes are pt; every role is Arial (the source decks
 * use one family). Values are the renderer's `cqw` sizes converted at
 * 1cqw = 9.6pt, so the export keeps the preview's hierarchy.
 */
export const TYPE = {
  /** 1.3cqw */
  sectionLabel: { size: 12, bold: true },
  /** 2.5cqw — the slide's conclusion, and the largest type on it. */
  assertion: { size: 23, bold: true },
  coverTitle: { size: 26, bold: true },
  coverDate: { size: 14, bold: true },
  boxHeading: { size: 10, bold: true },
  tableHeader: { size: 8, bold: true },
  tableBody: { size: 8, bold: false },
  bulletBody: { size: 9, bold: false },
  bannerText: { size: 11, bold: false },
  footnote: { size: 8, bold: false, italic: true },
  footerLabel: { size: 9, bold: false },
  footerPage: { size: 10, bold: true },
} as const;

/** Spec §1.4: logo top-right on every non-cover slide. */
export const LOGO = { x: 11.35, y: 0.4, w: 1.45, aspect: 603 / 105 } as const;

export const LIGHT_MASTER = "BLN_LIGHT";
export const DARK_MASTER = "BLN_DARK";
/** Cover/divider: the reference deck footers page 1 like every other page,
 * but shows no corner wordmark there — the cover carries its own large one. */
export const COVER_MASTER = "BLN_COVER";
