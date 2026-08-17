import type { BulletsSlide } from "@/lib/slides/schema";

export const CHANGE_MANAGEMENT_SLIDE: Omit<BulletsSlide, "id" | "kind"> = {
  sectionLabel: "EXECUTION METHODOLOGY: GO-LIVE",
  assertion:
    "GOVERNANCE, TRAINING AND ONE MONTH OF HYPER-CARE PROTECT ADOPTION BEFORE STANDARD SLA SUPPORT BEGINS",
  rows: [
    {
      label: "Delivery cadence",
      text: "Agile delivery in four stages — Prepare, Explore, Realize, Deploy — with a joint client/vendor steering call throughout.",
    },
    {
      label: "Named governance",
      text: "Client Project Manager and vendor Product Manager act as joint decision-makers, backed by engineering, QA, and change-management leads.",
    },
    {
      label: "Training",
      text: "Key-user and on-duty training run before go-live, with written sign-off required ahead of cutover.",
    },
    {
      label: "Hyper-care",
      text: "One month at full capacity after go-live: bug fixes, UI adjustments, and on-site support before standard SLA tiers begin.",
    },
  ],
};

export const COMPANY_INTRO_NOTE =
  "Company Introduction (value chain: Business Analysis → Solution Design → Innovation Engineering → Deployment & Integration → Support & Maintenance) is standard leave-behind boilerplate, held in this config for reuse but not rendered as its own slide in the 10-slide deck.";
