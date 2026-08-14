/**
 * The money-guard (PRD §7.3 / NFR-2): classifies whether an edit
 * instruction touches pricing before any LLM call happens, so a financial
 * figure can never be silently rewritten by a model completion. Keyword
 * classification is the documented starting point (Technical Design
 * Document §3.2) — strengthening this with a small classifier LLM call is
 * the named next step if real usage shows it misses rephrased requests.
 */

const MONEY_RE = /(thb|price|pricing|budget|cost|million|\bmn\b|baht|\d[\d,.]*\s*(m|mn|k)\b)/i;
const ADD_SCOPE_RE = /^\s*(please\s+)?(add|include)\b/i;

export type EditIntent = "wrong-slide" | "scope-add" | "not-in-rate-card" | "content";

export function classifyEditIntent(instruction: string, isCommercialSlide: boolean): EditIntent {
  const mentionsMoney = MONEY_RE.test(instruction);
  if (!mentionsMoney) return "content";
  if (!isCommercialSlide) return "wrong-slide";
  if (ADD_SCOPE_RE.test(instruction)) return "scope-add";
  return "not-in-rate-card";
}

export function extractScopeLabel(instruction: string): string {
  const stripped = instruction
    .replace(/^\s*(please\s+)?(add|include)\s+(a\s+|an\s+|the\s+)?/i, "")
    .replace(/\.$/, "")
    .trim();
  const label = stripped || "Additional scope";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const MONEY_GUARD_MESSAGES = {
  wrongSlide:
    "Figures live in the rate card. Edit Commercial Terms directly, or say what scope changed.",
  notInRateCard:
    'That figure isn’t in the rate card. Change the scope line instead — e.g. "add a line for API integration" — and the total recomputes.',
};
