import type { ProposalConfig } from "./types";

/**
 * The one standardized module catalog every deck draws from (PRD FR-2.1)
 * — domain-specific catalogs were removed in favor of a single generic
 * layout; the model still picks a relevant subset per brief (FR-3.1 steps
 * 3-4), it just no longer chooses which catalog to pick from.
 */
export const MODULE_CATALOG: ProposalConfig = {
  kpis: ["Process Cycle Time", "Data Accuracy", "User Adoption Rate"],
  comparisonDefaults: {
    extend: "Extend current system",
    buy: "Buy top-tier off-the-shelf",
    build: "Custom build",
  },
  modules: [
    {
      key: "core-records",
      name: "Core Records Management",
      description: "Central record-keeping for the operation's primary entities",
      details: "CRUD, search, audit trail",
      actionSupport: "Identity/RBAC service",
      phase: "Phase 1",
      workstream: "development",
      manDays: 24,
    },
    {
      key: "workflow-approvals",
      name: "Workflow & Approvals",
      description: "Configurable workflow and approval routing",
      details: "Status tracking, notifications, escalation rules",
      actionSupport: "Notification service (email/SMS)",
      phase: "Phase 1",
      workstream: "development",
      manDays: 20,
    },
    {
      key: "reporting-configuration",
      name: "Reporting & Configuration",
      description: "Operational reporting and system configuration",
      details: "Exportable reports, role-based configuration",
      actionSupport: "ERP GL export",
      phase: "Phase 2",
      workstream: "architecture",
      manDays: 16,
    },
  ],
};
