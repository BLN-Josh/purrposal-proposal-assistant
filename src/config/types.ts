export type Workstream =
  | "architecture"
  | "development"
  | "integration"
  | "change_management"
  | "hyper_care";

export interface ProposalModule {
  /** Stable key referenced by generation + edit prompts and by pricing. */
  key: string;
  name: string;
  description: string;
  details: string;
  actionSupport: string;
  phase: "Phase 1" | "Phase 2";
  workstream: Workstream;
  /** Deterministic effort estimate — the only place "man-days" originate. */
  manDays: number;
}

export interface ProposalConfig {
  kpis: string[];
  modules: ProposalModule[];
  comparisonDefaults: {
    extend: string;
    buy: string;
    build: string;
  };
}
