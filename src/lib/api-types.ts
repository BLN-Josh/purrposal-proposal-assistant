import type { Deck, Slide } from "@/lib/slides/schema";

/** NDJSON events streamed by POST /api/generate (one JSON object per line). */
export type GenerateEvent =
  | { type: "progress"; step: string; label: string }
  | { type: "done"; deck: Deck }
  | { type: "error"; message: string };

export interface GenerateRequest {
  brief: string;
  fileText?: string | null;
  model: string;
  deckShape: string;
  depth: string;
  sourceFileName?: string | null;
}

export interface EditRequest {
  slideIds: string[];
  instruction: string;
  model: string;
  slides: Slide[];
}

export interface EditResult {
  id: string;
  slide?: Slide;
  note?: string;
  error?: string;
}

export interface EditResponse {
  results: EditResult[];
}
