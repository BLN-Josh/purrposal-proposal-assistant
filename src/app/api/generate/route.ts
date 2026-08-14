import { runGenerationPipeline } from "@/lib/generation/pipeline";
import { classifyError } from "@/lib/errors";
import type { GenerateRequest, GenerateEvent } from "@/lib/api-types";

export const dynamic = "force-dynamic";

/**
 * Streams NDJSON progress events (Technical Design Document §2.2) followed
 * by a final `done` event carrying the full Deck. Every value this handler
 * needs travels in the request body — no module-level state — so concurrent
 * demo users can never cross wires (Technical Design Document §6.1-6.2).
 */
export async function POST(request: Request) {
  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const hasFile = !!body.fileText && body.fileText.trim().length > 0;
  if (!hasFile && (body.brief ?? "").trim().length < 20) {
    return Response.json(
      { error: "Provide a brief (20+ characters) or a source document." },
      { status: 400 }
    );
  }
  if (!body.model || !body.deckShape || !body.depth) {
    return Response.json({ error: "Missing model, deckShape, or depth." }, { status: 400 });
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
