import type { Workstream } from "./types";

/**
 * The one master rate card (PRD FR-2.2). All Commercial Terms figures must
 * trace back to this file — never to an LLM completion (NFR-2). Day rates
 * are a placeholder MVP rate card (THB, excluding VAT); swap in the real
 * one before this leaves demo use.
 */
export const RATE_CARD: Record<string, number> = {
  "Solution Architect": 35000,
  "Backend Developer": 22000,
  "Frontend Developer": 20000,
  "DevOps Engineer": 24000,
  "QA Engineer": 18000,
  "Change Management Lead": 20000,
  "Business Consultant": 28000,
};

/**
 * Blended day rate per workstream, documented against the roles above so a
 * judge asking "where does this number come from" always has a one-line
 * answer traceable to RATE_CARD.
 */
export const WORKSTREAM_RATE_THB: Record<Workstream, number> = {
  // Solution Architect, full rate.
  architecture: RATE_CARD["Solution Architect"],
  // Blend of Backend + Frontend + DevOps.
  development: Math.round(
    (RATE_CARD["Backend Developer"] +
      RATE_CARD["Frontend Developer"] +
      RATE_CARD["DevOps Engineer"]) /
      3
  ),
  // Backend Developer rate — integration work is primarily API/back-end.
  integration: RATE_CARD["Backend Developer"],
  change_management: RATE_CARD["Change Management Lead"],
  // Blend of QA + Change Management, reflects hyper-care's mixed bug-fix /
  // re-training scope (see the source proposal's hyper-care package).
  hyper_care: Math.round(
    (RATE_CARD["QA Engineer"] + RATE_CARD["Change Management Lead"]) / 2
  ),
};

export const WORKSTREAM_LABEL: Record<Workstream, string> = {
  architecture: "Solution architecture & design",
  development: "Application development",
  integration: "Data migration & integration",
  change_management: "Change management & training",
  hyper_care: "Hyper-care (4 weeks)",
};

export const HYPER_CARE_MAN_DAYS = 20;
export const PAYMENT_TERMS =
  "40% on signature · 30% at Phase 1 milestone · 30% at Phase 2 milestone · excludes VAT";
