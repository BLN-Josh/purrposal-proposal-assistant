/**
 * Config-driven "knowledge" the generator draws on instead of retrieval or
 * free invention (PRD §5.2, FR-2.1-2.4). Everything here is static and
 * loaded at server start — no database for this build (see Technical Design
 * Document §4.1).
 */

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
