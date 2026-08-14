import { z } from "zod";

/**
 * Every slide kind the product supports. Kept to exactly the 8 kinds proven
 * out in the approved mock (AI Proposal Assistant.dc.html) — this is the
 * validated 10-slide skeleton (title + summary + 8 content slides), not a
 * re-derivation. Do not add a 9th kind without a matching mock update.
 */
export const SLIDE_KINDS = [
  "title",
  "summary",
  "bullets",
  "comparison",
  "table",
  "timeline",
  "team",
  "commercial",
] as const;

export type SlideKind = (typeof SLIDE_KINDS)[number];

// ---- Per-kind content schemas -------------------------------------------
// These are intentionally the exact shape the LLM must return for a given
// section (see src/lib/prompts) *and* the exact shape each slide component
// renders — one schema serves both jobs, so there is no separate parse step.

export const TitleContent = z.object({
  eyebrow: z.string(),
  title: z.string(),
  subtitle: z.string(),
  footer: z.string(),
});
export type TitleContent = z.infer<typeof TitleContent>;

export const SummaryRow = z.object({
  label: z.string(),
  text: z.string(),
});
export type SummaryRow = z.infer<typeof SummaryRow>;
export const SummaryContent = z.object({
  title: z.string(),
  subtitle: z.string(),
  rows: z.array(SummaryRow).length(4),
});
export type SummaryContent = z.infer<typeof SummaryContent>;

export const Bullet = z.object({ text: z.string() });
export type Bullet = z.infer<typeof Bullet>;
export const BulletsContent = z.object({
  title: z.string(),
  subtitle: z.string(),
  bullets: z.array(Bullet).min(2).max(6),
});
export type BulletsContent = z.infer<typeof BulletsContent>;

export const ComparisonColumn = z.object({
  name: z.string(),
  cost: z.string(),
  time: z.string(),
  fit: z.string(),
  recommended: z.boolean(),
});
export type ComparisonColumn = z.infer<typeof ComparisonColumn>;
export const ComparisonContent = z.object({
  title: z.string(),
  subtitle: z.string(),
  cols: z.array(ComparisonColumn).length(3),
});
export type ComparisonContent = z.infer<typeof ComparisonContent>;

export const TableRow = z.object({
  c1: z.string(),
  c2: z.string(),
  c3: z.string(),
  c4: z.string(),
});
export type TableRow = z.infer<typeof TableRow>;
export const TableContent = z.object({
  title: z.string(),
  subtitle: z.string(),
  rows: z.array(TableRow).min(2).max(8),
});
export type TableContent = z.infer<typeof TableContent>;

export const TimelinePhase = z.object({
  n: z.string(),
  name: z.string(),
  weeks: z.string(),
  detail: z.string(),
});
export type TimelinePhase = z.infer<typeof TimelinePhase>;
export const TimelineContent = z.object({
  title: z.string(),
  subtitle: z.string(),
  phases: z.array(TimelinePhase).min(3).max(5),
});
export type TimelineContent = z.infer<typeof TimelineContent>;

export const TeamPerson = z.object({
  initials: z.string(),
  name: z.string(),
  role: z.string(),
  yrs: z.string(),
});
export type TeamPerson = z.infer<typeof TeamPerson>;
export const TeamContent = z.object({
  title: z.string(),
  subtitle: z.string(),
  people: z.array(TeamPerson).min(2).max(6),
});
export type TeamContent = z.infer<typeof TeamContent>;

export const CommercialRow = z.object({
  c1: z.string(),
  c2: z.string(),
  c3: z.string(),
});
export type CommercialRow = z.infer<typeof CommercialRow>;
export const CommercialContent = z.object({
  title: z.string(),
  subtitle: z.string(),
  rows: z.array(CommercialRow).min(2).max(8),
  totalLabel: z.string(),
  total: z.string(),
  footnote: z.string(),
});
export type CommercialContent = z.infer<typeof CommercialContent>;

export const CONTENT_SCHEMA_BY_KIND = {
  title: TitleContent,
  summary: SummaryContent,
  bullets: BulletsContent,
  comparison: ComparisonContent,
  table: TableContent,
  timeline: TimelineContent,
  team: TeamContent,
  commercial: CommercialContent,
} as const satisfies Record<SlideKind, z.ZodTypeAny>;

// ---- Full slide (content + envelope) ------------------------------------

const SlideEnvelope = z.object({
  id: z.string(),
  notes: z.string().optional(),
  revised: z.boolean().optional(),
});

export const TitleSlide = SlideEnvelope.extend({ kind: z.literal("title") }).extend(
  TitleContent.shape
);
export const SummarySlide = SlideEnvelope.extend({ kind: z.literal("summary") }).extend(
  SummaryContent.shape
);
export const BulletsSlide = SlideEnvelope.extend({ kind: z.literal("bullets") }).extend(
  BulletsContent.shape
);
export const ComparisonSlide = SlideEnvelope.extend({
  kind: z.literal("comparison"),
}).extend(ComparisonContent.shape);
export const TableSlide = SlideEnvelope.extend({ kind: z.literal("table") }).extend(
  TableContent.shape
);
export const TimelineSlide = SlideEnvelope.extend({
  kind: z.literal("timeline"),
}).extend(TimelineContent.shape);
export const TeamSlide = SlideEnvelope.extend({ kind: z.literal("team") }).extend(
  TeamContent.shape
);
export const CommercialSlide = SlideEnvelope.extend({
  kind: z.literal("commercial"),
}).extend(CommercialContent.shape);

export const Slide = z.discriminatedUnion("kind", [
  TitleSlide,
  SummarySlide,
  BulletsSlide,
  ComparisonSlide,
  TableSlide,
  TimelineSlide,
  TeamSlide,
  CommercialSlide,
]);

export type Slide = z.infer<typeof Slide>;
export type TitleSlide = z.infer<typeof TitleSlide>;
export type SummarySlide = z.infer<typeof SummarySlide>;
export type BulletsSlide = z.infer<typeof BulletsSlide>;
export type ComparisonSlide = z.infer<typeof ComparisonSlide>;
export type TableSlide = z.infer<typeof TableSlide>;
export type TimelineSlide = z.infer<typeof TimelineSlide>;
export type TeamSlide = z.infer<typeof TeamSlide>;
export type CommercialSlide = z.infer<typeof CommercialSlide>;

export const Deck = z.object({
  deckId: z.string(),
  meta: z.object({
    title: z.string(),
    deckShape: z.string(),
    depth: z.string(),
    createdWithModel: z.string(),
    sourceFileName: z.string().nullable(),
  }),
  slides: z.array(Slide),
});
export type Deck = z.infer<typeof Deck>;

/** Strip the JSON-Schema-unfriendly `$schema` key zod v4 emits by default. */
export function toToolSchema(schema: z.ZodTypeAny) {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

export function contentSchemaFor(kind: SlideKind): z.ZodTypeAny {
  return CONTENT_SCHEMA_BY_KIND[kind];
}
