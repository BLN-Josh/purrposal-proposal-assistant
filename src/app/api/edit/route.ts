import { z } from "zod";
import { Slide, contentSchemaFor, type CommercialContent } from "@/lib/slides/schema";
import { generateStructured } from "@/lib/anthropic";
import { classifyEditIntent, extractScopeLabel, MONEY_GUARD_MESSAGES } from "@/lib/generation/edit-guard";
import { addScopeLine } from "@/lib/pricing";
import { classifyError } from "@/lib/errors";
import type { EditRequest, EditResponse, EditResult } from "@/lib/api-types";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  slideIds: z.array(z.string()).min(1),
  instruction: z.string().min(1),
  model: z.string().min(1),
  slides: z.array(Slide),
});

/**
 * The money-guard from the mock's `applyEdit()`, reimplemented against a
 * real LLM call (Technical Design Document §3.2). Classification happens in
 * code before any model call — the model is never trusted to self-police a
 * financial figure (NFR-2).
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid edit request." }, { status: 400 });
  }
  const { slideIds, instruction, model, slides } = parsed.data as EditRequest;

  const results = await Promise.all(
    slideIds.map((id) => editOneSlide(id, slides, instruction, model))
  );

  const response: EditResponse = { results };
  return Response.json(response);
}

async function editOneSlide(
  id: string,
  slides: Slide[],
  instruction: string,
  model: string
): Promise<EditResult> {
  const slide = slides.find((s) => s.id === id);
  if (!slide) return { id, error: "Slide not found." };

  const intent = classifyEditIntent(instruction, slide.kind === "commercial");

  if (intent === "wrong-slide") {
    return { id, error: MONEY_GUARD_MESSAGES.wrongSlide };
  }
  if (intent === "not-in-rate-card") {
    return { id, error: MONEY_GUARD_MESSAGES.notInRateCard };
  }
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

  // intent === "content" — a normal, scoped, structured-output regeneration.
  try {
    const schema = contentSchemaFor(slide.kind);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, kind: _kind, notes: _notes, revised: _revised, ...content } = slide;

    const system = `You are revising ONE slide of a client-facing technology-consulting proposal deck. The slide's kind is "${slide.kind}" and its field structure must stay identical — same keys, same shapes, same array lengths where the schema requires them. Only change what the instruction asks; keep everything else faithful to the original. Never invent a specific price or currency figure.`;
    const prompt = `Current slide content (JSON):\n${JSON.stringify(content)}\n\nInstruction: "${instruction}"\n\nReturn the complete revised slide content in the same shape.`;

    const revisedContent = (await generateStructured({ model, schema, system, prompt })) as Record<
      string,
      unknown
    >;
    return { id, slide: { ...slide, ...revisedContent, revised: true } as Slide, note: "" };
  } catch (err) {
    console.error("[api/edit]", err);
    return { id, error: classifyError(err).message };
  }
}
