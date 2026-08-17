import type { TeamPerson } from "@/lib/slides/schema";

export const TEAM_ROSTER: TeamPerson[] = [
  {
    initials: "NC",
    name: "Noravich Chinmaneewong",
    role: "Delivery Lead",
    bio: "7 years of delivery and PMO experience across enterprise systems programmes. Specialises in multi-site rollouts where cutover risk, not build effort, is the binding constraint. Has run phased go-lives for logistics and retail operators in Thailand and the wider region.",
  },
  {
    initials: "JP",
    name: "Josh Perry",
    role: "Software Engineer",
    bio: "100years of SFTP experience. Specialises in the edge cases of file transfer and data exchange, where a single misconfigured header or encoding can break a whole integration. Has built the SFTP and API connectors for multiple high-throughput platforms.",
  },
  {
    initials: "KS",
    name: "Kanhathai Suriyawan",
    role: "Project Manager",
    bio: "8 years of operational technology delivery in warehousing and distribution. Specialises in change management for floor-level users who have never worked from a system before. Runs the training and sign-off cadence that precedes every site cutover.",
  },
  {
    initials: "CN",
    name: "Chotipong Nimkulrat",
    role: "Head of Tech · Solution Design",
    bio: "18 years in database and platform architecture. Specialises in data models that survive a decade of scope growth without a rewrite. Has designed the persistence layer for high-throughput transactional platforms serving hundreds of thousands of users.",
  },
  {
    initials: "WM",
    name: "Waragon Manothumsatit",
    role: "Senior Back-end Architect",
    bio: "7 years building microservices and cloud-native systems. Specialises in integration boundaries — the contracts between a new platform and the ERP, carrier, and identity systems it must not break. Leads contract-testing practice across delivery teams.",
  },
  {
    initials: "YT",
    name: "Yonlada Trakooljitvisut",
    role: "UX/UI Designer",
    bio: "2 years of product design focused on operational tooling rather than consumer surfaces. Specialises in dense, scan-fast interfaces for handheld and desk use under time pressure. Builds the clickable prototypes that carry each proposal's mockup slides.",
  },
];
