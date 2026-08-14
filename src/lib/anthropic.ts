import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { toToolSchema } from "@/lib/slides/schema";

/**
 * A single shared client instance is safe to reuse across concurrent
 * requests — it holds no per-conversation state. Every call below builds
 * its own `messages` array from that call's arguments only, per the
 * concurrency-safety rules in the Technical Design Document §6.2.
 */
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.example)."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

const TOOL_NAME = "emit_structured_output";

interface ToolInputSchema {
  type: "object";
  properties?: unknown;
  required?: string[];
  [k: string]: unknown;
}

interface GenerateStructuredOptions<T> {
  model: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  maxTokens?: number;
}

/**
 * Forces the model to emit one structured tool call and validates it
 * against `schema` before returning — the "structured JSON output,
 * validated against a zod schema" pattern from the Technical Design
 * Document §3.1, used for every LLM-generated slide.
 */
export async function generateStructured<T>({
  model,
  schema,
  system,
  prompt,
  maxTokens = 2048,
}: GenerateStructuredOptions<T>): Promise<T> {
  const anthropic = getClient();

  const message = await withRetry(() =>
    anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          name: TOOL_NAME,
          description: "Emit the structured result for this task. Always call this tool.",
          input_schema: toToolSchema(schema) as ToolInputSchema,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
    })
  );

  const toolUse = message.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("The model did not return structured output.");
  }

  return schema.parse(toolUse.input);
}

/** Exponential backoff on 429/529 so a burst of demo traffic degrades to
 * "took a bit longer" rather than a visible error (Technical Design
 * Document §6.3). */
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number } | undefined)?.status;
      if (status !== 429 && status !== 529) throw err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw lastErr;
}
