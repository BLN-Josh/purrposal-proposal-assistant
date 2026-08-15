import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { toToolSchema } from "@/lib/slides/schema";
import { supportsEffort, type Effort } from "@/lib/models";

/**
 * A single shared client instance is safe to reuse across concurrent
 * requests — it holds no per-conversation state. Every call below builds
 * its own `messages` array from that call's arguments only, per the
 * concurrency-safety rules in the Technical Design Document §6.2.
 *
 * Retries and timeouts are the SDK's job, not ours: it already retries
 * 408/409/429/5xx **and connection errors** with exponential backoff and
 * honours the `retry-after` header, which a hand-rolled `429 || 529` loop
 * does not. What is worth writing by hand is the *validation* retry below —
 * that one the SDK can't do, because only we know the schema.
 */
const REQUEST_TIMEOUT_MS = 120_000;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.example)."
      );
    }
    client = new Anthropic({ apiKey, maxRetries: 3, timeout: REQUEST_TIMEOUT_MS });
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
  /**
   * Caps thinking **plus** answer. The current models think by default, so a
   * budget sized for the answer alone is what truncates a slide mid-table.
   */
  maxTokens?: number;
  /** Ignored on models that don't support it (see lib/models). */
  effort?: Effort;
  /** Short tag for server logs — which pipeline step this call belongs to. */
  label?: string;
}

/**
 * Forces the model to emit one structured tool call and validates it
 * against `schema` before returning — the "structured JSON output,
 * validated against a zod schema" pattern from the Technical Design
 * Document §3.1, used for every LLM-generated slide.
 *
 * On a validation failure the conversation continues rather than restarting:
 * the rejected tool call is echoed back with an `is_error` tool_result
 * naming the offending fields, so the retry is a targeted correction against
 * a cached prefix instead of a blind second guess. One repair attempt — if
 * the model can't satisfy its own schema twice, the answer is not one more
 * round-trip away.
 */
export async function generateStructured<T>({
  model,
  schema,
  system,
  prompt,
  maxTokens = 4096,
  effort,
  label,
}: GenerateStructuredOptions<T>): Promise<T> {
  const anthropic = getClient();
  const started = Date.now();

  const tool = {
    name: TOOL_NAME,
    description: "Emit the structured result for this task. Always call this tool.",
    input_schema: toToolSchema(schema) as ToolInputSchema,
  };

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  for (let attempt = 0; ; attempt++) {
    const message = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      tools: [tool],
      tool_choice: { type: "tool", name: TOOL_NAME },
      ...(effort && supportsEffort(model) ? { output_config: { effort } } : {}),
    });

    // Check why generation stopped before trusting the content: a truncated
    // tool call still arrives as a `tool_use` block, just with a half-written
    // input object, and would otherwise fail validation with a misleading
    // "the model returned the wrong shape" instead of "it ran out of room".
    if (message.stop_reason === "max_tokens") {
      throw new Error(`Structured output was truncated at ${maxTokens} tokens.`);
    }
    if (message.stop_reason === "refusal") {
      throw new Error("The model declined this request.");
    }

    const toolUse = message.content.find(
      (block): block is Extract<typeof block, { type: "tool_use" }> => block.type === "tool_use"
    );
    if (!toolUse) {
      throw new Error("The model did not return structured output.");
    }

    const parsed = schema.safeParse(toolUse.input);
    if (parsed.success) {
      if (label) {
        const { input_tokens: i, output_tokens: o } = message.usage;
        console.info(`[anthropic] ${label} ${model} ${Date.now() - started}ms in=${i} out=${o} retries=${attempt}`);
      }
      return parsed.data;
    }

    if (attempt >= 1) throw parsed.error;

    messages.push(
      { role: "assistant", content: message.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: `That did not match the schema. Fix exactly these problems and call the tool again:\n${describeIssues(parsed.error)}`,
          },
        ],
      }
    );
  }
}

/** Zod issues as a short, model-actionable list — path plus what was wrong. */
function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 12)
    .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}
