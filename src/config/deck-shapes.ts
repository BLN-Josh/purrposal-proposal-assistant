export type DeckShapeId = "full" | "discovery" | "exec";
export type DepthId = "concise" | "standard" | "detailed";

/** Every section the pipeline can produce, in fixed deck order. */
export type SectionId =
  | "cover"
  | "exec"
  | "understanding"
  | "options"
  | "solution"
  | "features"
  | "method"
  | "change"
  | "team"
  | "commercial";

export const SECTION_ORDER: SectionId[] = [
  "cover",
  "exec",
  "understanding",
  "options",
  "solution",
  "features",
  "method",
  "change",
  "team",
  "commercial",
];

export interface DeckShapeOption {
  id: DeckShapeId;
  label: string;
  description: string;
  /** Which sections this shape renders as slides — always emitted in SECTION_ORDER. */
  sections: SectionId[];
}

export const DECK_SHAPE_OPTIONS: DeckShapeOption[] = [
  {
    id: "full",
    label: "Full proposal",
    description: "Every section, commercials included.",
    sections: SECTION_ORDER.slice(),
  },
  {
    id: "discovery",
    label: "Discovery pitch",
    description: "Problem, options, approach. No pricing.",
    sections: ["cover", "understanding", "options", "solution", "method"],
  },
  {
    id: "exec",
    label: "Exec summary",
    description: "Board-length. Answer, plan, number.",
    sections: ["cover", "exec", "solution", "commercial"],
  },
];

export const DEFAULT_DECK_SHAPE: DeckShapeId = "full";

export function getDeckShape(id: string): DeckShapeOption {
  return DECK_SHAPE_OPTIONS.find((s) => s.id === id) ?? DECK_SHAPE_OPTIONS[0];
}

export interface DepthOption {
  id: DepthId;
  label: string;
  /** Relative multiplier for the landing page's estimated read time only. */
  readFactor: number;
}

export const DEPTH_OPTIONS: DepthOption[] = [
  { id: "concise", label: "Concise", readFactor: 0.55 },
  { id: "standard", label: "Standard", readFactor: 0.85 },
  { id: "detailed", label: "Detailed", readFactor: 1.2 },
];

export const DEFAULT_DEPTH: DepthId = "standard";

export function getDepth(id: string): DepthOption {
  return DEPTH_OPTIONS.find((d) => d.id === id) ?? DEPTH_OPTIONS[1];
}

export function estimateReadMinutes(shapeId: string, depthId: string): number {
  const slideCount = getDeckShape(shapeId).sections.length;
  const factor = getDepth(depthId).readFactor;
  return Math.max(1, Math.round(slideCount * 1.4 * factor));
}
