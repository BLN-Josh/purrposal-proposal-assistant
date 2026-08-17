/**
 * The money-guard (PRD §7.3 / NFR-2): classifies whether an edit touches
 * pricing before any LLM call, so a financial figure can never be silently
 * rewritten by a completion. Keyword classification is the documented
 * starting point (Technical Design Document §3.2).
 *
 * Two failure modes shape the rules below, both found in testing: scope-add
 * must be detected without a money keyword (the wording this file's own
 * error message recommends contains none), and a bare mention of money off
 * the commercial slide is usually the client's own figures, not our price.
 */

/** Words that name money at all. Necessary for a pricing edit, not sufficient. */
const MONEY_RE =
  /(thb|฿|baht|price|pricing|budget|cost|fee|rate|quote|million|\bmn\b|\d[\d,.]*\s*(m|mn|k)\b)/i;

/** Wording that sets a price *to a value* — a price noun followed by
 * "to"/"at"/"by" and a number. A bare verb near a money word is not enough:
 * "reduce the cost of downtime" is copy, not a pricing instruction. */
const SETS_FIGURE_RE =
  /\b(price|pricing|cost|fee|rate|total|budget|quote|amount)\b[^.]{0,30}?\b(to|at|by|=)\s*(thb|฿)?\s*\d/i;

/** Asking for a new scope item, with or without any money word. */
const ADD_SCOPE_RE = /^\s*(please\s+)?(add|include|insert|append)\b/i;

/** A scope-add is only a pricing action when it asks for a billable line —
 * "add a bullet about downtime" must not be hijacked. */
const SCOPE_NOUN_RE =
  /\b(line|row|item|scope|workstream|module|phase|package|service)\b/i;

export type EditIntent =
  "wrong-slide" | "scope-add" | "not-in-rate-card" | "content";

export function classifyEditIntent(
  instruction: string,
  isCommercialSlide: boolean,
): EditIntent {
  const mentionsMoney = MONEY_RE.test(instruction);
  const addsScopeLine =
    ADD_SCOPE_RE.test(instruction) && SCOPE_NOUN_RE.test(instruction);

  // First, and independently of any money keyword — this is the path that
  // recomputes the total from the rate card.
  if (isCommercialSlide && addsScopeLine) return "scope-add";

  if (!mentionsMoney) return "content";

  // Off the commercial slide, a money word alone is usually the client's own
  // numbers being quoted back.
  if (!isCommercialSlide) {
    return SETS_FIGURE_RE.test(instruction) ? "wrong-slide" : "content";
  }

  return "not-in-rate-card";
}

export function extractScopeLabel(instruction: string): string {
  const stripped = instruction
    .replace(
      /^\s*(please\s+)?(add|include|insert|append)\s+(a\s+|an\s+|the\s+)?/i,
      "",
    )
    .replace(/^(line|row|item|scope line)\s+(for|about|covering)\s+/i, "")
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
