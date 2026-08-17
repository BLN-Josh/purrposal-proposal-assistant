import type { ComparisonContent } from "@/lib/slides/schema";

/**
 * Cross-field repairs for model-authored slide content, shared by the
 * generate and edit paths.
 *
 * The schema cannot carry these: `ComparisonContent` declares them as
 * `.refine()`s, but the `Slide` union is built from the unrefined base — a
 * zod union cannot hold refined members — so they ran on no path at all.
 * Repaired rather than rejected, since both have a knowable answer and a
 * refinement failure would cost a model round-trip.
 */

/** Spec V06: exactly one recommended option. If the model marks none or
 * several, keep the last — the source decks put it last (spec §4.10). */
export function normalizeRecommended(
  content: ComparisonContent,
): ComparisonContent {
  const flagged = content.options.filter((o) => o.recommended).length;
  if (flagged === 1) return content;
  const lastIdx = content.options.length - 1;
  return {
    ...content,
    options: content.options.map((o, i) => ({
      ...o,
      recommended: i === lastIdx,
    })),
  };
}

/** Trim or pad each option's verdict list so it stays index-aligned to the
 * criteria — a mismatch would silently blank cells in the matrix. */
export function alignCells(content: ComparisonContent): ComparisonContent {
  const n = content.criteria.length;
  return {
    ...content,
    options: content.options.map((o) => ({
      ...o,
      cells: Array.from({ length: n }, (_, i) => o.cells[i] ?? "—"),
    })),
  };
}

/** Both comparison repairs, in the order the pipeline applies them. */
export function repairComparison(
  content: ComparisonContent,
): ComparisonContent {
  return alignCells(normalizeRecommended(content));
}

/** Tolerance for rounding: 33.33 x3 is fine, 40/40 is not. */
const PCT_TOLERANCE = 0.5;

/**
 * Spec V10: payment percentages must total 100.
 *
 * Thrown rather than repaired — there is no knowable answer to which
 * milestone absorbs the difference, and silently rescaling a payment
 * schedule is worse than refusing the edit.
 */
export function assertPaymentTermsSum(
  terms: { pct: number }[] | undefined,
): void {
  if (!terms?.length) return;
  const total = terms.reduce((sum, t) => sum + t.pct, 0);
  if (Math.abs(total - 100) > PCT_TOLERANCE) {
    throw new Error(
      `Payment terms must add up to 100% — these come to ${Number(total.toFixed(2))}%.`,
    );
  }
}
