/**
 * The money-guard (PRD §7.3 / NFR-2): classifies whether an edit
 * instruction touches pricing before any LLM call happens, so a financial
 * figure can never be silently rewritten by a model completion. Keyword
 * classification is the documented starting point (Technical Design
 * Document §3.2) — strengthening this with a small classifier LLM call is
 * the named next step if real usage shows it misses rephrased requests.
 *
 * Two failure modes drive the shape below, both found in testing:
 *
 * 1. FALSE NEGATIVE. `"add a line for API integration"` — the exact wording
 *    `MONEY_GUARD_MESSAGES.notInRateCard` tells the user to type — contains
 *    no money keyword, so it fell through to a model rewrite of the
 *    Commercial Terms slide and the model wrote the figures. Scope-add is
 *    therefore detected on its own terms now, before the money check, rather
 *    than being reachable only via a money keyword.
 *
 * 2. FALSE POSITIVE. `MONEY_RE` matched a bare `cost`/`budget` anywhere, so
 *    "make the headline state the THB 6.2M refund cost" on a *Project
 *    Understanding* slide was refused with a pricing message — even though
 *    THB 6.2M is the client's own stated problem, not our price. Off the
 *    commercial slide the guard now only fires on wording that reads as
 *    setting or changing a figure, not on any mention of money.
 */

/** Words that name money at all. Necessary for a pricing edit, not sufficient. */
const MONEY_RE = /(thb|฿|baht|price|pricing|budget|cost|fee|rate|quote|million|\bmn\b|\d[\d,.]*\s*(m|mn|k)\b)/i;

/**
 * Wording that reads as *setting a price to a value*, rather than mentioning
 * money at all.
 *
 * A bare verb is not enough — "make the headline state the THB 6.2M refund
 * cost" and "reduce the cost of downtime" both carry an action verb next to
 * a money word, and both are ordinary copy about the client's problem. What
 * actually distinguishes an attempt on our pricing is a *target figure*: a
 * price noun followed by "to"/"at"/"by" and a number. "change the price to
 * THB 5,000,000" has one; the two examples above do not.
 */
const SETS_FIGURE_RE =
  /\b(price|pricing|cost|fee|rate|total|budget|quote|amount)\b[^.]{0,30}?\b(to|at|by|=)\s*(thb|฿)?\s*\d/i;

/** Asking for a new scope item, with or without any money word. */
const ADD_SCOPE_RE = /^\s*(please\s+)?(add|include|insert|append)\b/i;

/**
 * A scope-add is only a *pricing* action when it is asking for a billable
 * line. "add a line for API integration" is; "add a bullet about downtime"
 * is ordinary copy and must not be hijacked.
 */
const SCOPE_NOUN_RE = /\b(line|row|item|scope|workstream|module|phase|package|service)\b/i;

export type EditIntent = "wrong-slide" | "scope-add" | "not-in-rate-card" | "content";

export function classifyEditIntent(instruction: string, isCommercialSlide: boolean): EditIntent {
  const mentionsMoney = MONEY_RE.test(instruction);
  const addsScopeLine = ADD_SCOPE_RE.test(instruction) && SCOPE_NOUN_RE.test(instruction);

  // Checked first, and independently of any money keyword: this is the one
  // path that recomputes the total from the rate card, and it is the path the
  // guard's own error message advertises.
  if (isCommercialSlide && addsScopeLine) return "scope-add";

  if (!mentionsMoney) return "content";

  // Off the commercial slide, a money word alone is almost always the
  // client's own numbers being quoted back at them. Only wording that would
  // rewrite a figure is worth refusing.
  if (!isCommercialSlide) {
    return SETS_FIGURE_RE.test(instruction) ? "wrong-slide" : "content";
  }

  return "not-in-rate-card";
}

export function extractScopeLabel(instruction: string): string {
  const stripped = instruction
    .replace(/^\s*(please\s+)?(add|include|insert|append)\s+(a\s+|an\s+|the\s+)?/i, "")
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
