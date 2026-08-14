import type { TeamPerson } from "@/lib/slides/schema";

/**
 * The one team roster (PRD FR-2.3). Retrieved verbatim into the Team Bios
 * slide — never LLM-generated. This is Balerion's own delivery-team
 * roster (public bio copy), not client-engagement data, so it carries none
 * of the NFR-1 confidentiality risk that real client names/figures would.
 */
export const TEAM_ROSTER: TeamPerson[] = [
  { initials: "NC", name: "Noravich Chinmaneewong", role: "Delivery Lead", yrs: "7 yrs · delivery PMO" },
  { initials: "WT", name: "Waranthorn Tananuchittikul", role: "Head of Product", yrs: "5 yrs · tech solution & service design" },
  { initials: "KS", name: "Kanhathai Suriyawan", role: "Project Manager", yrs: "8 yrs · operational tech delivery" },
  { initials: "CN", name: "Chotipong Nimkulrat", role: "Head of Tech · Solution Design", yrs: "18 yrs · database & platform architecture" },
  { initials: "WM", name: "Waragon Manothumsatit", role: "Senior Back-end Architect", yrs: "7 yrs · microservices & cloud" },
  { initials: "YT", name: "Yonlada Trakooljitvisut", role: "UX/UI Designer", yrs: "2 yrs · product design" },
];
