export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".txt",
  ".md",
] as const;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_FILE_LABEL = "100MB max";
export const UNSUPPORTED_FILE_MESSAGE =
  "Try a .pdf, .docx, .pptx, .txt, or .md file, or paste the text directly.";

export const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
export const MAX_JSON_BODY_BYTES = 4 * 1024 * 1024;
export const OVERSIZE_BODY_MESSAGE = `That request is too large — keep it under ${MAX_JSON_BODY_BYTES / (1024 * 1024)}MB of text and try again.`;

export function exceedsDeclaredSize(request: Request, limit: number): boolean {
  const declared = Number(request.headers.get("content-length"));
  return Number.isFinite(declared) && declared > limit;
}
