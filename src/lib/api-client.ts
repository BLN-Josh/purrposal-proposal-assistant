import type { GenerateEvent, GenerateRequest, EditRequest, EditResponse } from "@/lib/api-types";

const NETWORK_FAILURE = "Couldn't reach the server. Check your connection and try again.";

export async function parseFile(file: File): Promise<{ extractedText: string }> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/parse", { method: "POST", body }).catch(() => {
    throw new Error(NETWORK_FAILURE);
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Couldn't read that file." }));
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
  signal?: AbortSignal
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
  title: string
): Promise<Blob> {
  const res = await fetch("/api/export/pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slides, title }),
  }).catch(() => {
    throw new Error(NETWORK_FAILURE);
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Export failed." }));
    throw new Error(err.error ?? "Export failed.");
  }
  return res.blob();
}
