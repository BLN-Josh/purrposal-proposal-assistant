import { z } from "zod";
import { runGenerationPipeline } from "@/lib/generation/pipeline";
import { classifyError } from "@/lib/errors";
import { isKnownModel } from "@/lib/models";
import { DECK_SHAPE_OPTIONS, DEPTH_OPTIONS } from "@/config/deck-shapes";
import { MAX_JSON_BODY_BYTES, OVERSIZE_BODY_MESSAGE, exceedsDeclaredSize } from "@/config/upload";
import type { GenerateEvent } from "@/lib/api-types";

export const dynamic = "force-dynamic";

const DECK_SHAPE_IDS: string[] = DECK_SHAPE_OPTIONS.map((s) => s.id);
const DEPTH_IDS: string[] = DEPTH_OPTIONS.map((d) => d.id);

/**
 * The whole body is validated up front rather than duck-typed field by
 * field. It arrives unauthenticated and every field is used unguarded
 * downstream — `.trim()` on a non-string threw *inside* the handler and came
 * back as an empty 500, an unknown model reached the SDK and surfaced as a
 * mid-stream "please retry" for something that can never succeed, and an
 * unknown deckShape/depth silently fell back to full/standard, handing the
 * user a deck they did not ask for. All three are 400s, decided here.
 */
const RequestSchema = z.object({
  brief: z.string().default(""),
  fileText: z.string().nullish(),
  model: z.string().refine(isKnownModel),
  deckShape: z.string().refine((id) => DECK_SHAPE_IDS.includes(id)),
  depth: z.string().refine((id) => DEPTH_IDS.includes(id)),
  sourceFileName: z.string().nullish(),
});

/**
 * Keyed by the field that failed, because zod's own wording ("Invalid
 * input: expected string, received number") is written for whoever wrote the
 * client, and this string is read by whoever is staring at the toast.
 */
const FIELD_MESSAGE: Record<string, string> = {
  brief: "Provide a brief (20+ characters) or a source document.",
  fileText: "That source document didn't come through as text. Re-upload it, or paste the text.",
  model: "Unknown model.",
  deckShape: `Unknown deck shape — choose one of: ${DECK_SHAPE_IDS.join(", ")}.`,
  depth: `Unknown depth — choose one of: ${DEPTH_IDS.join(", ")}.`,
  sourceFileName: "That source file name didn't come through as text. Re-upload the file.",
};

/**
 * Streams NDJSON progress events (Technical Design Document §2.2) followed
 * by a final `done` event carrying the full Deck. Every value this handler
 * needs travels in the request body — no module-level state — so concurrent
 * demo users can never cross wires (Technical Design Document §6.1-6.2).
 */
export async function POST(request: Request) {
  if (exceedsDeclaredSize(request, MAX_JSON_BODY_BYTES)) {
    return Response.json({ error: OVERSIZE_BODY_MESSAGE }, { status: 413 });
  }

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    // A body that isn't an object at all fails at the root, where there is
    // no field to name.
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return Response.json(
      { error: FIELD_MESSAGE[field] ?? "Invalid request body." },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // The 20-character floor bounds what a human types; a source document
  // stands in for it entirely, so it is checked after parsing rather than in
  // the schema, where `brief` alone cannot see `fileText`.
  const hasFile = !!body.fileText && body.fileText.trim().length > 0;
  if (!hasFile && body.brief.trim().length < 20) {
    return Response.json({ error: FIELD_MESSAGE.brief }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: GenerateEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        const deck = await runGenerationPipeline(body, (step, label) =>
          send({ type: "progress", step, label })
        );
        send({ type: "done", deck });
      } catch (err) {
        console.error("[api/generate]", err);
        send({ type: "error", message: classifyError(err).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
