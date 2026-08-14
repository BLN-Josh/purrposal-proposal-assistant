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
