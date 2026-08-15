/**
 * Every server-side failure collapses into one of these codes before it
 * reaches the client — never a raw SDK exception, zod error, or stack
 * trace. The raw cause is still `console.error`'d for server logs; only
 * the code's fixed definition below is ever sent to the browser.
 */
export const ERROR_DEFINITIONS = {
  CONFIG: "The AI service isn't configured on this server.",
  RATE_LIMITED: "The AI service is busy right now. Please try again in a moment.",
  AI_UNAVAILABLE: "The AI service is temporarily unavailable. Please try again.",
  INVALID_RESPONSE: "The AI returned something unexpected. Please retry the request.",
  TRUNCATED: "The answer ran past the length limit. Ask for something shorter, or retry.",
  REFUSED: "The AI declined this request. Try rewording the instruction.",
  TIMEOUT: "That took too long. Try a shorter brief or a smaller instruction.",
  UNKNOWN: "Something went wrong. Please try again.",
} as const;

export type ErrorCode = keyof typeof ERROR_DEFINITIONS;

function entry(code: ErrorCode) {
  return { code, message: ERROR_DEFINITIONS[code] };
}

/**
 * Classifies a raw, possibly-sensitive error (Anthropic SDK exception,
 * zod validation error, a config throw, a library internal) into a safe
 * code + message pair. Always call `console.error` on the raw `err`
 * yourself before using this — this function intentionally discards it.
 */
export function classifyError(err: unknown): { code: ErrorCode; message: string } {
  const status = (err as { status?: number } | undefined)?.status;
  if (status === 401 || status === 403) return entry("CONFIG");
  if (status === 429) return entry("RATE_LIMITED");
  if (status === 404 || status === 400) return entry("INVALID_RESPONSE");
  if (status && status >= 500) return entry("AI_UNAVAILABLE");

  if (err instanceof Error) {
    if (err.name === "ZodError") return entry("INVALID_RESPONSE");
    // The SDK surfaces connection drops and its own request timeout as named
    // error classes rather than a status code, so they land here.
    if (err.name === "APIConnectionTimeoutError") return entry("TIMEOUT");
    if (err.name === "APIConnectionError") return entry("AI_UNAVAILABLE");
    if (/ANTHROPIC_API_KEY/.test(err.message)) return entry("CONFIG");
    if (/did not return structured output/.test(err.message)) return entry("INVALID_RESPONSE");
    if (/truncated/i.test(err.message)) return entry("TRUNCATED");
    if (/declined/i.test(err.message)) return entry("REFUSED");
  }

  return entry("UNKNOWN");
}
