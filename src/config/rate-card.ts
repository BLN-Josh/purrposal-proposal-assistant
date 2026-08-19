import type { Workstream } from "./types";

export const RATE_CARD: Record<string, number> = {
  "Solution Architect": 33000,
  "Backend Developer": 42000,
  "Frontend Developer": 40000,
  "DevOps Engineer": 74000,
  "QA Engineer": 64000,
  "Change Management Lead": 25000,
  "Business Consultant": 50000,
};

export const WORKSTREAM_RATE_THB: Record<Workstream, number> = {
  architecture: RATE_CARD["Solution Architect"],
  development: Math.round(
    (RATE_CARD["Backend Developer"] +
      RATE_CARD["Frontend Developer"] +
      RATE_CARD["DevOps Engineer"]) /
      3,
  ),
  integration: RATE_CARD["Backend Developer"],
  change_management: RATE_CARD["Change Management Lead"],
  hyper_care: Math.round(
    (RATE_CARD["QA Engineer"] + RATE_CARD["Change Management Lead"]) / 2,
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

export const PAYMENT_SCHEDULE: { pct: number; milestone: string }[] = [
  { pct: 40, milestone: "on signature" },
  { pct: 30, milestone: "at Phase 1 milestone" },
  { pct: 30, milestone: "at Phase 2 milestone" },
];

export const COMMERCIAL_FOOTNOTE =
  "All figures exclude VAT. Cloud infrastructure billed at actual usage.";
