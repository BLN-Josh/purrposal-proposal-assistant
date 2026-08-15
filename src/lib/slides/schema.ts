import { z } from "zod";

/**
 * Slide contract, aligned to `balerion-deck-system.md` + the layout registry
 * in `balerion-slide-templates.json`.
 *
 * Two structural ideas from that spec drive everything here:
 *
 * 1. **Two-line title grammar (§2)** — every content slide carries a
 *    `sectionLabel` (red, UPPER, drawn from a closed taxonomy that repeats
 *    across slides) and an `assertion` (black, UPPER, the slide's actual
 *    conclusion, unique per slide). This replaces the old free-form
 *    title/subtitle pair. It is the single most reusable asset in the system
 *    and the main thing that makes output read as Balerion's rather than as
 *    generic AI slideware.
 * 2. **Layouts, not decorations** — each `kind` maps 1:1 onto a spec layout
 *    id (see LAYOUT_BY_KIND). Geometry lives in the builders; this file only
 *    describes the *content* each layout consumes.
 *
 * Scope note: the spec catalogues ~30 layouts and explicitly advises against
 * building all of them ("9 layouts cover ~70% of slide volume"). The kinds
 * below are that MVP set plus SOL-06. Tier-3 freeform diagram layouts
 * (UND-02, SOL-01, SOL-12) are deliberately absent — per spec §6 they are
 * not auto-generatable and should be human art.
 */

export const SLIDE_KINDS = [
  "title",
  "divider",
  "summary",
  "bullets",
  "comparison",
  "table",
  "valueChain",
  "timeline",
  "team",
  "commercial",
] as const;

export type SlideKind = (typeof SLIDE_KINDS)[number];

/** Traceability back to the spec's layout registry. */
export const LAYOUT_BY_KIND: Record<SlideKind, string> = {
  title: "COVER-01",
  divider: "DIV-01",
  summary: "EXEC-01",
  bullets: "UND-05",
  comparison: "UND-06",
  table: "SOL-08",
  valueChain: "SOL-06",
  timeline: "EXE-02",
  team: "EXE-06",
  commercial: "COM-01",
};

/**
 * Spec §2 closed taxonomy. Kept closed rather than free-text on purpose:
 * a constrained enum is what stops the model inventing a new section name
 * per slide, which is exactly the tell that makes generated decks look
 * generated. Add a product-name variant here per engagement if needed (the
 * source decks use e.g. "WAREHOUSE MANAGEMENT SYSTEM" in this slot).
 */
export const SECTION_LABELS = [
  "EXECUTIVE SUMMARY",
  "COMPANY INTRODUCTION",
  "PROJECT UNDERSTANDING",
  "PROJECT UNDERSTANDING – LANDSCAPE OVERVIEW",
  "PROJECT UNDERSTANDING – IMPACT IN-DEPTH",
  "UNDERSTANDING OF THE BUSINESS: OPTION ANALYSIS",
  "SOLUTION PROPOSAL",
  "SOLUTION PROPOSAL – IMPACT IN DETAILS",
  "SOLUTION MOCKUP",
  "EXECUTION METHODOLOGY",
  "EXECUTION METHODOLOGY: WHILE DEVELOPING",
  "EXECUTION METHODOLOGY: GO-LIVE",
  "COMMERCIAL TERM",
] as const;
export type SectionLabel = (typeof SECTION_LABELS)[number];

export const SectionLabelSchema = z.enum(SECTION_LABELS);

/** Spec §1.2: "exactly one accent family per slide. Never three." */
export const DomainSchema = z.enum(["primary", "secondary", "neutral"]);
export type Domain = z.infer<typeof DomainSchema>;

/** Spec §2 rule 6 — `(1/4)` suffix for content split across slides. */
export const PageRefSchema = z.object({ n: z.number().int().min(1), m: z.number().int().min(1) });

// ---- Per-kind content schemas -------------------------------------------
// These are the exact shape the LLM must return for a section *and* the exact
// shape each renderer consumes — one schema serves both, so there is no
// separate parse step.

/** COVER-01. Spec slots: title (≤6 words), optional subtitle, date. */
export const TitleContent = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  date: z.string(),
});
export type TitleContent = z.infer<typeof TitleContent>;

/** DIV-01 — chapter break before Solution / Execution / Appendix. */
export const DividerContent = z.object({
  sectionName: z.string(),
  deckSubtitle: z.string().optional(),
  scopeNote: z.string().optional(),
});
export type DividerContent = z.infer<typeof DividerContent>;

/** EXEC-01 row-label stack. `options` renders the spec's split-row variant
 * (two side-by-side option boxes inside one row) instead of plain bullets. */
export const SummaryOptionBox = z.object({
  heading: z.string(),
  bullets: z.array(z.string()).min(1).max(4),
});
/** A row renders EITHER `bullets` or — in the spec's split-row variant —
 * two side-by-side `options` boxes. `bullets` is therefore allowed to be
 * empty rather than required-but-ignored, so a split row carries no dead
 * data. The linter flags a row that supplies neither. */
export const SummaryRow = z.object({
  label: z.string(),
  bullets: z.array(z.string()).max(5).default([]),
  options: z.array(SummaryOptionBox).length(2).optional(),
});
export type SummaryRow = z.infer<typeof SummaryRow>;
export const SummaryContent = z.object({
  rows: z.array(SummaryRow).min(4).max(5),
});
export type SummaryContent = z.infer<typeof SummaryContent>;

/** UND-05 row stack. `label` is optional: with it, the row renders as the
 * spec's two-column pain-point row (tinted label cell + grey description);
 * without it, as a single full-width tinted row. One layout, two densities. */
export const BulletRow = z.object({
  label: z.string().optional(),
  text: z.string(),
});
export type BulletRow = z.infer<typeof BulletRow>;
export const BulletsContent = z.object({
  intro: z.string().optional(),
  rows: z.array(BulletRow).min(2).max(6),
  /** Black full-width conclusion banner (spec UND-05 zone `conclusion`). */
  conclusion: z.string().optional(),
});
export type BulletsContent = z.infer<typeof BulletsContent>;

/** UND-06 option matrix — criteria down, options across. */
export const ComparisonCriterion = z.object({
  label: z.string(),
  descriptor: z.string().optional(),
});
export const ComparisonOption = z.object({
  name: z.string(),
  recommended: z.boolean(),
  /** One verdict per criterion, index-aligned to `criteria`. */
  cells: z.array(z.string()).min(3).max(6),
});
/** Plain object form — this is what the slide union extends, so the union
 * stays a true discriminated union. The cross-field rules live on
 * `ComparisonContent` below rather than here. */
export const ComparisonContentBase = z.object({
  criteria: z.array(ComparisonCriterion).min(3).max(6),
  options: z.array(ComparisonOption).min(2).max(3),
});

/** Validated form, used where the content arrives from outside (generation)
 * and the cross-field invariants must actually hold. */
export const ComparisonContent = ComparisonContentBase
  .refine((c) => c.options.every((o) => o.cells.length === c.criteria.length), {
    message: "Each option must have exactly one cell per criterion.",
    path: ["options"],
  })
  .refine((c) => c.options.filter((o) => o.recommended).length === 1, {
    message: "Exactly one option must be marked recommended (spec V06).",
    path: ["options"],
  });
export type ComparisonContent = z.infer<typeof ComparisonContentBase>;

/** SOL-08 feature detail. `group` is the vertical band label on the tinted
 * panel; spec caps 3 feature rows per group per slide. */
export const FeatureRow = z.object({
  feature: z.string(),
  description: z.string(),
  details: z.string(),
  actionSupport: z.string(),
});
export type FeatureRow = z.infer<typeof FeatureRow>;
export const TableContent = z.object({
  group: z.string().optional(),
  rows: z.array(FeatureRow).min(1).max(6),
});
export type TableContent = z.infer<typeof TableContent>;

/** SOL-06 feature→benefit value chain. The five columns carry a semantic
 * contract (spec §4.17) that the prompt enforces: Task = what we build,
 * Output = artefact, Outcome = behaviour change, Benefit = business gain. */
export const ValueChainRow = z.object({
  feature: z.string(),
  task: z.string(),
  output: z.string(),
  outcome: z.string(),
  benefit: z.string(),
});
export type ValueChainRow = z.infer<typeof ValueChainRow>;
export const ValueChainBlock = z.object({
  caption: z.string().optional(),
  rows: z.array(ValueChainRow).min(1).max(5),
});
export const ValueChainContent = z.object({
  blocks: z.array(ValueChainBlock).min(1).max(3),
});
export type ValueChainContent = z.infer<typeof ValueChainContent>;

/** EXE-02 — chevron phase ribbon + per-phase detail column. */
export const TimelinePhase = z.object({
  name: z.string(),
  weeks: z.string(),
  detail: z.string(),
});
export type TimelinePhase = z.infer<typeof TimelinePhase>;
export const TimelineContent = z.object({
  phases: z.array(TimelinePhase).min(3).max(5),
  footnote: z.string().optional(),
});
export type TimelineContent = z.infer<typeof TimelineContent>;

/** EXE-06 team profile grid. `dark` is the spec's inverted variant (the
 * only inverted slide in the system) used for the tech-stream slide. */
export const TeamPerson = z.object({
  initials: z.string(),
  name: z.string(),
  role: z.string(),
  bio: z.string(),
});
export type TeamPerson = z.infer<typeof TeamPerson>;
export const TeamContent = z.object({
  variant: z.enum(["light", "dark"]).optional(),
  people: z.array(TeamPerson).min(2).max(6),
});
export type TeamContent = z.infer<typeof TeamContent>;

/** COM-01. `paymentTerms` percentages must sum to 100 (spec V10). */
export const CommercialRow = z.object({
  item: z.string(),
  description: z.string(),
  cost: z.string(),
});
export type CommercialRow = z.infer<typeof CommercialRow>;
export const PaymentTerm = z.object({
  pct: z.number().min(0).max(100),
  milestone: z.string(),
});
export type PaymentTerm = z.infer<typeof PaymentTerm>;
export const CommercialContent = z.object({
  rows: z.array(CommercialRow).min(1).max(8),
  totalLabel: z.string().optional(),
  total: z.string().optional(),
  paymentTerms: z.array(PaymentTerm).min(1).max(6).optional(),
  footnote: z.string().optional(),
});
export type CommercialContent = z.infer<typeof CommercialContent>;

export const CONTENT_SCHEMA_BY_KIND = {
  title: TitleContent,
  divider: DividerContent,
  summary: SummaryContent,
  bullets: BulletsContent,
  comparison: ComparisonContentBase,
  table: TableContent,
  valueChain: ValueChainContent,
  timeline: TimelineContent,
  team: TeamContent,
  commercial: CommercialContent,
} as const satisfies Record<SlideKind, z.ZodTypeAny>;

// ---- Full slide (content + envelope) ------------------------------------

/** Carried by every slide. `sectionLabel`/`assertion` are the spec's
 * two-line title; cover and divider render their own title treatment and
 * so make both optional. */
const SlideEnvelope = z.object({
  id: z.string(),
  sectionLabel: SectionLabelSchema.optional(),
  assertion: z.string().optional(),
  /** Accent family for this slide. Defaults to `primary`. */
  domain: DomainSchema.optional(),
  /** Renders a `(n/m)` suffix on the assertion for split content. */
  page: PageRefSchema.optional(),
  notes: z.string().optional(),
  revised: z.boolean().optional(),
});

/** Content kinds must carry the two-line title; cover/divider must not be
 * required to. Applied per-kind below rather than on the shared envelope. */
const titled = { sectionLabel: SectionLabelSchema, assertion: z.string() };

/**
 * A user-inserted empty slide, awaiting its first instruction.
 *
 * Deliberately *not* a member of SLIDE_KINDS: it maps to no spec layout, it
 * never exports, and it exists only between "user clicked +" and "the model
 * decided what this slide should be". The first edit replaces it wholesale
 * with one of the real kinds — see NEW_SLIDE_KINDS below for which ones the
 * model may choose. Keeping it out of SLIDE_KINDS means LAYOUT_BY_KIND,
 * CONTENT_SCHEMA_BY_KIND and editSchemaFor all stay honest about covering
 * only real layouts.
 */
export const PlaceholderContent = z.object({
  /** Free-text note the user typed while creating it, shown on the card. */
  hint: z.string().optional(),
});
export type PlaceholderContent = z.infer<typeof PlaceholderContent>;

export const TitleSlide = SlideEnvelope.extend({ kind: z.literal("title") }).extend(TitleContent.shape);
export const DividerSlide = SlideEnvelope.extend({ kind: z.literal("divider") }).extend(DividerContent.shape);
export const SummarySlide = SlideEnvelope.extend({ kind: z.literal("summary"), ...titled }).extend(SummaryContent.shape);
export const BulletsSlide = SlideEnvelope.extend({ kind: z.literal("bullets"), ...titled }).extend(BulletsContent.shape);
export const ComparisonSlide = SlideEnvelope.extend({ kind: z.literal("comparison"), ...titled }).extend(ComparisonContentBase.shape);
export const TableSlide = SlideEnvelope.extend({ kind: z.literal("table"), ...titled }).extend(TableContent.shape);
export const ValueChainSlide = SlideEnvelope.extend({ kind: z.literal("valueChain"), ...titled }).extend(ValueChainContent.shape);
export const TimelineSlide = SlideEnvelope.extend({ kind: z.literal("timeline"), ...titled }).extend(TimelineContent.shape);
export const TeamSlide = SlideEnvelope.extend({ kind: z.literal("team"), ...titled }).extend(TeamContent.shape);
export const CommercialSlide = SlideEnvelope.extend({ kind: z.literal("commercial"), ...titled }).extend(CommercialContent.shape);
export const PlaceholderSlide = SlideEnvelope.extend({ kind: z.literal("placeholder") }).extend(PlaceholderContent.shape);

export const Slide = z.discriminatedUnion("kind", [
  TitleSlide,
  DividerSlide,
  SummarySlide,
  BulletsSlide,
  ComparisonSlide,
  TableSlide,
  ValueChainSlide,
  TimelineSlide,
  TeamSlide,
  CommercialSlide,
  PlaceholderSlide,
]);

export type Slide = z.infer<typeof Slide>;
export type TitleSlide = z.infer<typeof TitleSlide>;
export type DividerSlide = z.infer<typeof DividerSlide>;
export type SummarySlide = z.infer<typeof SummarySlide>;
export type BulletsSlide = z.infer<typeof BulletsSlide>;
export type ComparisonSlide = z.infer<typeof ComparisonSlide>;
export type TableSlide = z.infer<typeof TableSlide>;
export type ValueChainSlide = z.infer<typeof ValueChainSlide>;
export type TimelineSlide = z.infer<typeof TimelineSlide>;
export type TeamSlide = z.infer<typeof TeamSlide>;
export type CommercialSlide = z.infer<typeof CommercialSlide>;
export type PlaceholderSlide = z.infer<typeof PlaceholderSlide>;

/**
 * The layouts the model may choose when filling an empty slide.
 *
 * Two exclusions, both structural rather than stylistic: `title` is the
 * cover and a deck has exactly one, and `commercial` is computed from the
 * rate card (FR-3.4 / NFR-2) — letting a completion invent a totals table
 * would put fabricated money on a client-facing page.
 */
export const NEW_SLIDE_KINDS = [
  "divider",
  "summary",
  "bullets",
  "comparison",
  "table",
  "valueChain",
  "timeline",
  "team",
] as const satisfies readonly SlideKind[];

export type NewSlideKind = (typeof NEW_SLIDE_KINDS)[number];
export const NewSlideKindSchema = z.enum(NEW_SLIDE_KINDS);

/** Human label for a kind, for toasts and the edit log. */
export const KIND_LABEL: Record<SlideKind | "placeholder", string> = {
  title: "cover",
  divider: "section divider",
  summary: "executive summary",
  bullets: "row stack",
  comparison: "option matrix",
  table: "feature table",
  valueChain: "value chain",
  timeline: "phase timeline",
  team: "team grid",
  commercial: "commercial terms",
  placeholder: "empty slide",
};

/** Deck-level theme overrides travel with the deck so an export reproduces
 * exactly what the editor previewed. Mirrors DeckThemeOverrides in
 * lib/pptx/theme.ts; kept as a loose object here so the slide schema does
 * not depend on the pptx layer. */
const HEX = /^#?[0-9A-Fa-f]{6}$/;

export const DeckThemeSchema = z.object({
  accent: z.string().regex(HEX).optional(),
  gradient: z.array(z.string().regex(HEX)).min(2).max(8).optional(),
  accentSecondary: z.string().regex(HEX).optional(),
  font: z.string().max(64).optional(),
  /**
   * A bare image filename inside `public/brand` — NOT a path. This arrives
   * over the wire, so anything path-shaped is rejected here at the boundary
   * rather than deeper in: joining a caller-supplied path onto process.cwd()
   * and reading it is an arbitrary file read, and the bytes would come back
   * base64'd inside the .pptx the caller downloads. `null` omits the logo.
   */
  logoFile: z
    .string()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpe?g)$/, "Must be an image filename in public/brand, not a path.")
    .refine((s) => !s.includes(".."), "Must not contain '..'.")
    .nullable()
    .optional(),
  footerLabel: z.string().max(120).nullable().optional(),
  showPageNumbers: z.boolean().optional(),
});
export type DeckTheme = z.infer<typeof DeckThemeSchema>;

export const Deck = z.object({
  deckId: z.string(),
  meta: z.object({
    title: z.string(),
    deckShape: z.string(),
    depth: z.string(),
    createdWithModel: z.string(),
    sourceFileName: z.string().nullable(),
  }),
  theme: DeckThemeSchema.optional(),
  slides: z.array(Slide),
});
export type Deck = z.infer<typeof Deck>;

/** Strip the JSON-Schema-unfriendly `$schema` key zod v4 emits by default. */
export function toToolSchema(schema: z.ZodTypeAny) {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/** Kinds that carry the two-line title. Cover and divider render their own
 * title treatment and have no section label or assertion. */
const TITLED_KINDS = new Set<SlideKind>([
  "summary", "bullets", "comparison", "table", "valueChain", "timeline", "team", "commercial",
]);

/**
 * Schema for a single-slide edit. This is the content schema *plus* the
 * two-line title, because the assertion is now the most consequential line
 * on a slide — "make this headline state the number" is one of the most
 * natural edit requests there is, and it would be impossible if the model
 * could only return the body. Cover/divider fall back to plain content.
 */
export function editSchemaFor(kind: SlideKind): z.ZodTypeAny {
  const base = CONTENT_SCHEMA_BY_KIND[kind];
  if (!TITLED_KINDS.has(kind)) return base;
  return base.extend({
    sectionLabel: SectionLabelSchema,
    assertion: z.string().describe("An 8-18 word claim in UPPERCASE, quantified where the slide's data allows."),
  });
}
