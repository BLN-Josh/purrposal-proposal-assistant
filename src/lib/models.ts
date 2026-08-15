export const MODEL_OPTIONS = [
  { value: "claude-sonnet-5", label: "Sonnet 5" },
  { value: "claude-haiku-4-5", label: "Haiku 4.5" },
  { value: "claude-opus-5", label: "Opus 5" },
] as const;

export type ModelId = (typeof MODEL_OPTIONS)[number]["value"];

export const MODEL_LABEL: Record<string, string> = Object.fromEntries(
  MODEL_OPTIONS.map((m) => [m.value, m.label])
);

/** Single-slide edits default to the fast/cheap tier regardless of the deck
 * generation model (Technical Design Document §3.4) — the dropdown remains
 * an override, this is just the fallback when the caller doesn't specify. */
export const DEFAULT_EDIT_MODEL: ModelId = "claude-haiku-4-5";
export const DEFAULT_GENERATE_MODEL: ModelId = "claude-sonnet-5";

/**
 * `output_config.effort` is how much thinking and exploration the model
 * spends before answering. It is GA on the Sonnet 5 / Opus 5 generation and
 * *rejected with a 400* on Haiku 4.5, so every call site has to gate on this
 * rather than sending it unconditionally.
 *
 * It matters here beyond cost: these are structured, tightly-schema'd
 * completions where the answer shape is already pinned by the tool schema,
 * so deep deliberation buys little — and thinking tokens count against the
 * same `max_tokens` budget as the answer, so an unbounded think on a big
 * table schema is what truncates a slide mid-generation.
 */
const EFFORT_CAPABLE = new Set<string>(["claude-sonnet-5", "claude-opus-5"]);

export type Effort = "low" | "medium" | "high";

export function supportsEffort(model: string): boolean {
  return EFFORT_CAPABLE.has(model);
}

/** Guard the wire format at the boundary: an unknown model string reaching
 * the Anthropic SDK is a 404 the user can't act on, so requests carrying one
 * are rejected before the call. */
export function isKnownModel(model: string): model is ModelId {
  return MODEL_OPTIONS.some((m) => m.value === model);
}
