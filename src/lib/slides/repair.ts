import type { ComparisonContent } from "@/lib/slides/schema";

/**
 * Cross-field repairs for model-authored slide content.
 *
 * These live here rather than inside the generation pipeline because both
 * entry points need them and only one used to have them: `/api/generate`
 * repaired a comparison slide on the way out, while `/api/edit` did not — so
 * an *edit* could produce a matrix that generation never would, with blank
 * cells and either two recommended columns or none. The schema cannot cover
 * it either: `ComparisonContent` carries the invariants as `.refine()`s, but
 * the `Slide` discriminated union is built from the unrefined base (a zod
 * union cannot hold refined members), so nothing enforced them on any path.
 *
 * Repair rather than reject, deliberately: both rules have a knowable correct
 * answer, and a refinement failure would cost a whole model round-trip to fix
 * something we can fix here for free.
 */

/**
 * Deck-system spec V06 requires exactly one recommended option. If the model
 * marks none or several, keep the last — the source decks always place the
 * recommended column last (spec §4.10 "the recommended column is last").
 */
export function normalizeRecommended(content: ComparisonContent): ComparisonContent {
  const flagged = content.options.filter((o) => o.recommended).length;
  if (flagged === 1) return content;
  const lastIdx = content.options.length - 1;
  return {
    ...content,
    options: content.options.map((o, i) => ({ ...o, recommended: i === lastIdx })),
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
export function repairComparison(content: ComparisonContent): ComparisonContent {
  return alignCells(normalizeRecommended(content));
}

/** Percentage points a payment schedule may be off 100 before it is wrong
 * rather than rounded — three terms of 33.33 are fine, 40/40 is not. */
const PCT_TOLERANCE = 0.5;

/**
 * Spec V10: payment percentages must total 100.
 *
 * Thrown rather than repaired, unlike the comparison rules above — there is
 * no knowable correct answer to "which milestone should absorb the missing
 * 60%?", and quietly rescaling someone's payment schedule is a worse failure
 * than refusing the edit. The generated schedule comes from the rate card and
 * always sums correctly; this guards the edit path, where the model can write
 * the field itself.
 */
export function assertPaymentTermsSum(terms: { pct: number }[] | undefined): void {
  if (!terms?.length) return;
  const total = terms.reduce((sum, t) => sum + t.pct, 0);
  if (Math.abs(total - 100) > PCT_TOLERANCE) {
    throw new Error(
      `Payment terms must add up to 100% — these come to ${Number(total.toFixed(2))}%.`
    );
  }
}
