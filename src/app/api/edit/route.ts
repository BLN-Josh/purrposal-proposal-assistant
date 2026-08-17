import { z } from "zod";
import {
  Slide,
  editSchemaFor,
  KIND_LABEL,
  NewSlideKindSchema,
  type CommercialContent,
  type ComparisonContent,
  type SlideKind,
} from "@/lib/slides/schema";
import { repairComparison, assertPaymentTermsSum } from "@/lib/slides/repair";
import { generateStructured } from "@/lib/anthropic";
import {
  classifyEditIntent,
  extractScopeLabel,
  MONEY_GUARD_MESSAGES,
} from "@/lib/generation/edit-guard";
import {
  editSlidePrompt,
  newSlidePrompt,
  slideKindPrompt,
} from "@/lib/generation/prompts";
import { addScopeLine } from "@/lib/pricing";
import { classifyError } from "@/lib/errors";
import { isKnownModel } from "@/lib/models";
import {
  MAX_JSON_BODY_BYTES,
  OVERSIZE_BODY_MESSAGE,
  exceedsDeclaredSize,
} from "@/config/upload";
import type {
  EditResponse,
  EditResult,
  SlideOutlineEntry,
} from "@/lib/api-types";

export const dynamic = "force-dynamic";

const OutlineEntrySchema = z.object({
  id: z.string(),
  index: z.number().int().min(1),
  kind: z.string(),
  assertion: z.string().optional(),
  title: z.string().optional(),
});

const RequestSchema = z.object({
  instruction: z.string().trim().min(1).max(2000),
  model: z.string().refine(isKnownModel, "Unknown model."),
  /** Only the slides being edited — the rest of the deck rides in `outline`. */
  slides: z.array(Slide).min(1).max(60),
  outline: z.array(OutlineEntrySchema).max(200).default([]),
});

/**
 * `max_tokens` bounds thinking *and* answer, so it has to scale with how
 * much JSON the layout actually needs a six-row feature table is an order
 * of magnitude more output than a divider. One flat budget either truncates
 * the big layouts or over-provisions every call.
 */
const MAX_TOKENS_BY_KIND: Record<SlideKind, number> = {
  title: 1024,
  divider: 1024,
  summary: 4096,
  bullets: 3072,
  comparison: 4096,
  table: 6144,
  valueChain: 6144,
  timeline: 3072,
  team: 4096,
  commercial: 4096,
};

/**
 * A whole-deck instruction fans out to one model call per slide. Firing 15
 * at once is the fastest way to collect a 429 and turn a working edit into a
 * partial failure, so the fan-out runs against a small worker pool instead —
 * roughly the same wall-clock for the deck sizes this produces, without the
 * burst.
 */
const CONCURRENCY = 4;

/**
 * The money-guard from the mock's `applyEdit()`, reimplemented against a
 * real LLM call (Technical Design Document §3.2). Classification happens in
 * code before any model call — the model is never trusted to self-police a
 * financial figure (NFR-2).
 */
export async function POST(request: Request) {
  if (exceedsDeclaredSize(request, MAX_JSON_BODY_BYTES)) {
    return Response.json({ error: OVERSIZE_BODY_MESSAGE }, { status: 413 });
  }

  const json = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid edit request." }, { status: 400 });
  }
  const { slides, instruction, model, outline } = parsed.data;

  const ctx: EditContext = {
    instruction,
    model,
    outline: outline as SlideOutlineEntry[],
    positionOf: buildPositionLookup(outline as SlideOutlineEntry[]),
  };

  const results = await mapLimit(slides, CONCURRENCY, (slide) =>
    editOneSlide(slide, ctx),
  );
  const response: EditResponse = { results };
  return Response.json(response);
}

interface EditContext {
  instruction: string;
  model: string;
  outline: SlideOutlineEntry[];
  positionOf: (id: string) => number;
}

async function editOneSlide(
  slide: Slide,
  ctx: EditContext,
): Promise<EditResult> {
  const { instruction } = ctx;
  const id = slide.id;

  // An empty slide has no figures to protect, but it is also not a licence to
  // invent them: the guard runs the same way, and the model can never choose
  // the commercial layout (NEW_SLIDE_KINDS excludes it).
  const intent = classifyEditIntent(instruction, slide.kind === "commercial");

  if (intent === "wrong-slide")
    return { id, error: MONEY_GUARD_MESSAGES.wrongSlide };
  if (intent === "not-in-rate-card")
    return { id, error: MONEY_GUARD_MESSAGES.notInRateCard };
  if (intent === "scope-add") {
    // slide.kind === "commercial" is guaranteed here — classifyEditIntent
    // only returns "scope-add" when isCommercialSlide was true.
    const label = extractScopeLabel(instruction);
    const patched = addScopeLine(slide as CommercialContent, label);
    return {
      id,
      slide: { ...slide, ...patched, revised: true } as Slide,
      note: "Added a rate-card line and recomputed the total.",
    };
  }

  try {
    return slide.kind === "placeholder"
      ? await fillPlaceholder(slide.id, ctx)
      : await reviseSlide(slide, ctx);
  } catch (err) {
    console.error("[api/edit]", err);
    return { id, error: classifyError(err).message };
  }
}

/** A normal, scoped, structured-output regeneration of an existing slide. */
async function reviseSlide(
  slide: Slide,
  ctx: EditContext,
): Promise<EditResult> {
  const kind = slide.kind as SlideKind;

  const {
    id: _id,
    kind: _kind,
    notes: _notes,
    revised: _revised,
    ...content
  } = slide;

  const revisedContent = await generateStructured({
    model: ctx.model,
    schema: editSchemaFor(kind),
    maxTokens: MAX_TOKENS_BY_KIND[kind],
    effort: "medium",
    label: `edit:${kind}`,
    ...editSlidePrompt({
      kind,
      content,
      instruction: ctx.instruction,
      outline: ctx.outline,
      position: ctx.positionOf(slide.id),
    }),
  });

  // Envelope fields the model was never shown, and so cannot have preserved.
  const envelope = {
    id: slide.id,
    domain: slide.domain,
    page: slide.page,
    notes: slide.notes,
  };
  return {
    id: slide.id,
    slide: assemble(kind, revisedContent, envelope),
    note: "",
  };
}

/**
 * Fill an empty slide the user inserted with the + button.
 *
 * Two calls, not one. The first picks a layout from the closed set and
 * writes a one-line editorial plan; the second writes that layout's content
 * against the *same* per-kind schema an ordinary edit uses. The alternative —
 * a single call whose tool schema unions all ten content shapes — saves a
 * round trip and buys a much worse failure mode, because a model that picks
 * the wrong branch mid-generation produces a slide that validates and reads
 * as nonsense. The picker call is small and runs at low effort, so the extra
 * hop costs well under a second.
 */
async function fillPlaceholder(
  id: string,
  ctx: EditContext,
): Promise<EditResult> {
  const position = ctx.positionOf(id);

  const pick = await generateStructured({
    model: ctx.model,
    schema: z.object({
      kind: NewSlideKindSchema.describe(
        "The layout id that best fits the requested content.",
      ),
      plan: z
        .string()
        .describe(
          "One sentence, max 25 words, naming what this slide will actually assert.",
        ),
    }),
    maxTokens: 1024,
    effort: "low",
    label: "new-slide:pick",
    ...slideKindPrompt(ctx.instruction, ctx.outline, position),
  });

  const content = await generateStructured({
    model: ctx.model,
    schema: editSchemaFor(pick.kind),
    maxTokens: MAX_TOKENS_BY_KIND[pick.kind],
    effort: "medium",
    label: `new-slide:${pick.kind}`,
    ...newSlidePrompt({
      kind: pick.kind,
      instruction: ctx.instruction,
      plan: pick.plan,
      outline: ctx.outline,
      position,
    }),
  });

  const label = KIND_LABEL[pick.kind];
  return {
    id,
    slide: assemble(pick.kind, content, { id }),
    note: `Built this as ${/^[aeiou]/i.test(label) ? "an" : "a"} ${label} slide.`,
  };
}

interface SlideEnvelopeFields {
  id: string;
  domain?: Slide["domain"];
  page?: { n: number; m: number };
  notes?: string;
}

/**
 * Envelope + generated content → a slide, re-validated as a whole.
 *
 * Parsing here is not belt-and-braces: `editSchemaFor` validates the content
 * fields but knows nothing about the envelope, and the placeholder path
 * assembles a slide of a *different kind* than the one it started from. The
 * union parse is what guarantees the object leaving this route is a slide
 * every renderer and the exporter can handle — and it strips the leftover
 * placeholder `hint` on the way through.
 */
function assemble(
  kind: SlideKind,
  content: unknown,
  envelope: SlideEnvelopeFields,
): Slide {
  let fields = content as Record<string, unknown>;

  // Cross-field rules the schema cannot carry — the union is built from
  // `ComparisonContentBase`, so its `.refine()`s never ran. See
  // lib/slides/repair.ts.
  if (kind === "comparison") {
    fields = {
      ...fields,
      ...repairComparison(fields as unknown as ComparisonContent),
    };
  }
  if (kind === "commercial") {
    assertPaymentTermsSum(fields.paymentTerms as { pct: number }[] | undefined);
  }

  return Slide.parse({
    ...envelope,
    ...fields,
    kind,
    revised: true,
  });
}

/** Deck position for a slide id, 1-based, falling back to the end of the
 * deck when the client sent no outline (a single-slide edit still works). */
function buildPositionLookup(outline: SlideOutlineEntry[]) {
  const byId = new Map(outline.map((s) => [s.id, s.index]));
  return (id: string) => byId.get(id) ?? outline.length + 1;
}

/** Run `fn` over `items` with at most `limit` in flight, preserving order.
 * `fn` is expected never to reject — every call site catches internally. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return out;
}
