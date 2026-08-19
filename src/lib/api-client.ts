import type {
  GenerateEvent,
  GenerateRequest,
  EditRequest,
  EditResponse,
  SlideOutlineEntry,
} from "@/lib/api-types";
import { timestampedPathname } from "@/lib/blob-pathname";

const NETWORK_FAILURE =
  "Couldn't reach the server. Check your connection and try again.";

/**
 * Uploads straight from the browser to Blob storage (bypassing the ~4.5MB
 * body limit a request through our own server would hit on Vercel), then
 * asks `/api/parse` to fetch that blob back and extract its text.
 *
 * `@vercel/blob/client` is dynamically imported so it never lands in the
 * landing page's initial bundle — only visitors who actually attach a file
 * pay for it.
 */
export async function parseFile(
  file: File,
): Promise<{ extractedText: string }> {
  const { upload } = await import("@vercel/blob/client");

  const blob = await upload(timestampedPathname(file.name), file, {
    access: "private",
    handleUploadUrl: "/api/blob/upload",
  }).catch((err) => {
    throw new Error(
      err instanceof Error ? err.message : "Couldn't upload that file.",
    );
  });

  const res = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pathname: blob.pathname }),
  }).catch(() => {
    throw new Error(NETWORK_FAILURE);
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Couldn't read that file." }));
    throw new Error(err.error ?? "Couldn't read that file.");
  }
  return res.json();
}

/**
 * Reads the NDJSON stream from /api/generate and invokes `onEvent` for each
 * line — real pipeline progress, not a fake timer (Technical Design
 * Document §2.2).
 */
export async function streamGenerate(
  payload: GenerateRequest,
  onEvent: (event: GenerateEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  }).catch((e) => {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new Error(NETWORK_FAILURE);
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: "Generation failed." }));
    throw new Error(err.error ?? "Generation failed.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const emit = (line: string) => {
    const parsed = JSON.parse(line) as GenerateEvent;
    onEvent(parsed);
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        emit(line);
      }
    }
    if (buffer.trim()) emit(buffer);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new Error("Generation failed. Retry, or try a shorter brief.");
  }
}

/** Titles-only map of the deck, sent alongside an edit so the model can stay
 * consistent with slides it isn't being shown. See SlideOutlineEntry. */
export function deckOutline(
  slides: import("@/lib/slides/schema").Slide[],
): SlideOutlineEntry[] {
  return slides.map((s, i) => ({
    id: s.id,
    index: i + 1,
    kind: s.kind,
    ...("assertion" in s && s.assertion ? { assertion: s.assertion } : {}),
    ...(s.kind === "title" ? { title: s.title } : {}),
    ...(s.kind === "divider" ? { title: s.sectionName } : {}),
  }));
}

export async function postEdit(payload: EditRequest): Promise<EditResponse> {
  const res = await fetch("/api/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    throw new Error(NETWORK_FAILURE);
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Edit failed." }));
    throw new Error(err.error ?? "Edit failed.");
  }
  return res.json();
}

export async function fetchExportPptx(
  slides: import("@/lib/slides/schema").Slide[],
  title: string,
  theme?: import("@/lib/slides/schema").DeckTheme,
): Promise<Blob> {
  const res = await fetch("/api/export/pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slides, title, theme }),
  }).catch(() => {
    throw new Error(NETWORK_FAILURE);
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Export failed." }));
    throw new Error(err.error ?? "Export failed.");
  }
  return res.blob();
}
