export const MODEL_OPTIONS = [
  { value: "claude-sonnet-5", label: "Sonnet 5" },
  { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
  { value: "claude-opus-5", label: "Opus 5" },
] as const;

export const MODEL_LABEL: Record<string, string> = Object.fromEntries(
  MODEL_OPTIONS.map((m) => [m.value, m.label])
);

/** Single-slide edits default to the fast/cheap tier regardless of the deck
 * generation model (Technical Design Document §3.4) — the dropdown remains
 * an override, this is just the fallback when the caller doesn't specify. */
export const DEFAULT_EDIT_MODEL = "claude-haiku-4-5-20251001";
export const DEFAULT_GENERATE_MODEL = "claude-sonnet-5";
