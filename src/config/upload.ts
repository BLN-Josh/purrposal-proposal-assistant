/**
 * Single source of truth for source-document upload constraints, shared by
 * the client (dropzone, validation toasts) and the server (/api/parse) so
 * the two never drift. This app runs on a self-hosted Node server, not a
 * serverless platform with a fixed request-body ceiling — 100MB comfortably
 * covers a 100-page PDF or a large, image-heavy PowerPoint deck.
 */
export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".txt", ".md"] as const;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_FILE_LABEL = "100MB max";
export const UNSUPPORTED_FILE_MESSAGE = "Try a .pdf, .docx, .pptx, .txt, or .md file, or paste the text directly.";

/**
 * Slack over MAX_FILE_BYTES for multipart framing — the boundary lines and
 * part headers wrapped around the file itself. /api/parse can only bound an
 * upload by its declared Content-Length, which covers the whole envelope,
 * so a file at exactly the limit must not be rejected for its wrapper.
 */
export const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

/**
 * Ceiling on a JSON request body (/api/generate, /api/edit, /api/export).
 * These endpoints are unauthenticated and `request.json()` buffers whatever
 * it is handed, so without a bound an arbitrary body is arbitrary server
 * memory before a single field has been looked at. 4MB sits far above
 * anything legitimate: the largest field any of them carries is `fileText`,
 * and the prompt layer reads only its first 24k characters anyway.
 */
export const MAX_JSON_BODY_BYTES = 4 * 1024 * 1024;

export const OVERSIZE_BODY_MESSAGE = `That request is too large — keep it under ${MAX_JSON_BODY_BYTES / (1024 * 1024)}MB of text and try again.`;

/**
 * True when the caller *declared* a body bigger than `limit`. Content-Length
 * is client-supplied and so proves nothing about the bytes that follow, but
 * it is the only size a route can consult before `request.json()` or
 * `request.formData()` has already buffered the whole payload into memory —
 * which is the moment the cost is paid. A missing or unparseable header
 * reads as "no declared size" and falls through to the body-level limits.
 */
export function exceedsDeclaredSize(request: Request, limit: number): boolean {
  const declared = Number(request.headers.get("content-length"));
  return Number.isFinite(declared) && declared > limit;
}
