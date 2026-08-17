import {
  WORKSTREAM_RATE_THB,
  WORKSTREAM_LABEL,
  HYPER_CARE_MAN_DAYS,
  PAYMENT_SCHEDULE,
  COMMERCIAL_FOOTNOTE,
} from "@/config/rate-card";
import type { ProposalConfig, Workstream } from "@/config/types";
import type { CommercialContent } from "@/lib/slides/schema";

/**
 * Deterministic Commercial Terms calculation (PRD FR-3.4 / NFR-2). This is
 * arithmetic over the rate card, not an LLM completion — the /api/generate
 * and /api/edit routes must call this instead of asking the model for a
 * THB figure. Every row traces to config/rate-card.ts.
 */

const WORKSTREAM_ORDER: Workstream[] = [
  "architecture",
  "development",
  "integration",
  "change_management",
  "hyper_care",
];

export function computeCommercialTerms(
  config: ProposalConfig,
  selectedModuleKeys: string[],
): CommercialContent {
  const selected = config.modules.filter((m) =>
    selectedModuleKeys.includes(m.key),
  );
  const manDaysByWorkstream = new Map<Workstream, number>();

  for (const m of selected) {
    manDaysByWorkstream.set(
      m.workstream,
      (manDaysByWorkstream.get(m.workstream) ?? 0) + m.manDays,
    );
  }

  // Change management is always part of the engagement, sized off total
  // feature effort rather than left as a free-typed figure.
  const featureManDays = selected.reduce((sum, m) => sum + m.manDays, 0);
  const changeMgmtManDays = Math.max(10, Math.round(featureManDays * 0.15));
  manDaysByWorkstream.set(
    "change_management",
    (manDaysByWorkstream.get("change_management") ?? 0) + changeMgmtManDays,
  );
  manDaysByWorkstream.set(
    "hyper_care",
    (manDaysByWorkstream.get("hyper_care") ?? 0) + HYPER_CARE_MAN_DAYS,
  );

  let totalTHB = 0;
  const rows = WORKSTREAM_ORDER.filter((w) => manDaysByWorkstream.has(w)).map(
    (w) => {
      const manDays = manDaysByWorkstream.get(w)!;
      const cost = manDays * WORKSTREAM_RATE_THB[w];
      totalTHB += cost;
      return {
        item: WORKSTREAM_LABEL[w],
        description: `${manDays} man-days at the ${WORKSTREAM_LABEL[w].toLowerCase()} blended day rate`,
        cost: `THB ${cost.toLocaleString("en-US")}`,
      };
    },
  );

  return {
    rows,
    totalLabel: "Total investment",
    total: `THB ${totalTHB.toLocaleString("en-US")}`,
    paymentTerms: PAYMENT_SCHEDULE,
    footnote: COMMERCIAL_FOOTNOTE,
  };
}

/**
 * Applied by the /api/edit money-guard when an instruction describes a
 * scope change on the Commercial Terms slide (e.g. "add a line for API
 * integration"). Recomputes the total from the new line instead of trusting
 * a free-typed number.
 */
export function addScopeLine(
  current: CommercialContent,
  label: string,
  manDays = 24,
): CommercialContent {
  const rate = WORKSTREAM_RATE_THB.development;
  const cost = manDays * rate;
  const rows = [
    ...current.rows,
    {
      item: label,
      description: `${manDays} man-days at the application development blended day rate`,
      cost: `THB ${cost.toLocaleString("en-US")}`,
    },
  ];
  const priorTotal = parseTotalTHB(current.total);

  // Drop the total rather than derive one from this line alone — an unread
  // total is visibly absent, where a wrong one is not.
  if (priorTotal === null) {
    return { ...current, rows, total: undefined };
  }

  const total = `THB ${(priorTotal + cost).toLocaleString("en-US")}`;
  return { ...current, rows, total };
}

/**
 * Reads a stored total back into a number, or `null` when it cannot be read.
 * Stripping non-digits (the old approach) turned "THB 1,000,000.50" into
 * 100000050 — a 100x error on a client-facing price — so anything that is
 * not an unambiguous figure is reported unreadable rather than guessed at.
 */
function parseTotalTHB(total: string | undefined): number | null {
  if (!total) return null;

  const match = /(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?/.exec(total);
  if (!match) return null;

  const remainder = total.slice(match.index + match[0].length);

  // "THB 5.4M" is 5,400,000, not 5.4.
  if (/^\s*(m|mn|k|bn|b|million|thousand|billion)\b/i.test(remainder))
    return null;

  // A second number ("1,000,000 (ex VAT 7%)") makes the total a guess.
  if (/\d/.test(remainder)) return null;

  const value = Number(`${match[1].replace(/,/g, "")}${match[2] ?? ""}`);
  return Number.isFinite(value) ? value : null;
}
