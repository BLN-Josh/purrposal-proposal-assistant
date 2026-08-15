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

/**
 * One line of the deck map sent alongside an edit: enough for the model to
 * keep a revision consistent with its neighbours, small enough that sending
 * it costs nothing. Deliberately titles-only — a full slide body is ~25x
 * the tokens and the model has no business rewriting slides it wasn't asked
 * about.
 */
export interface SlideOutlineEntry {
  /** Lets the server locate an edited slide's position without the client
   * sending positions separately. Never rendered into a prompt. */
  id: string;
  /** 1-based position in the deck, matching the number on the card. */
  index: number;
  kind: Slide["kind"];
  /** Content slides carry the two-line title; the cover carries a title. */
  assertion?: string;
  title?: string;
}

export interface EditRequest {
  instruction: string;
  model: string;
  /**
   * ONLY the slides being edited — not the whole deck. Deck-wide context
   * travels in `outline` instead.
   */
  slides: Slide[];
  outline?: SlideOutlineEntry[];
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
