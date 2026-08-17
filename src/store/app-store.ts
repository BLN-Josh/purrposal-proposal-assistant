"use client";

import { create } from "zustand";
import { toast } from "sonner";
import type { Slide, DeckTheme } from "@/lib/slides/schema";
import {
  parseFile,
  streamGenerate,
  postEdit,
  fetchExportPptx,
  deckOutline,
} from "@/lib/api-client";
import { downloadBlob, slugify } from "@/lib/download";
import { DEFAULT_EDIT_MODEL, DEFAULT_GENERATE_MODEL } from "@/lib/models";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_BYTES,
  MAX_FILE_LABEL,
  UNSUPPORTED_FILE_MESSAGE,
} from "@/config/upload";
import {
  DEFAULT_DECK_SHAPE,
  DEFAULT_DEPTH,
  type DeckShapeId,
  type DepthId,
} from "@/config/deck-shapes";

export type Screen = "landing" | "generating" | "workspace";

export interface LogEntry {
  id: string;
  instruction: string;
  scope: string;
  note: string;
  ok: boolean;
  failed: boolean;
  time: string;
}

function nowLabel() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Slide numbers spelled out before the list is elided. Past a handful the
 * run stops being readable and starts overflowing the badge. */
const MAX_LISTED_SLIDES = 5;

/** "Slide 3", "Slides 1, 2, 4", or an elided "Slides 1, 2, 3, 4, 5…".
 * Pass `Infinity` for the full list — the badge uses it as a tooltip. */
function labelFor(
  sel: string[],
  slides: Slide[],
  limit: number = MAX_LISTED_SLIDES,
): string {
  const nums = slides
    .map((s, i) => (sel.includes(s.id) ? i + 1 : null))
    .filter((n): n is number => n !== null);
  if (!nums.length) return "Whole deck";
  if (nums.length === 1) return `Slide ${nums[0]}`;
  if (nums.length <= limit) return `Slides ${nums.join(", ")}`;
  return `Slides ${nums.slice(0, limit).join(", ")}…`;
}

interface AppState {
  screen: Screen;
  started: boolean;
  model: string;
  deckShape: DeckShapeId;
  depth: DepthId;
  brief: string;
  fileName: string | null;
  fileText: string | null;
  dragging: boolean;
  parsing: boolean;

  genLabel: string;
  genStepIndex: number;

  deckId: string | null;
  deckTitle: string;
  slides: Slide[];
  /** Per-deck restyle (accent ramp, font, logo, footer, page numbers) sent
   * to the exporter. Undefined means the Balerion default theme. */
  deckTheme: DeckTheme | undefined;
  sel: string[];
  multi: boolean;
  draft: string;
  log: LogEntry[];
  busy: boolean;
  errIds: string[];
  flash: string[];
  menu: boolean;
  exporting: "pptx" | "pdf" | null;
  /** Bumped whenever a new empty slide is inserted. The workspace watches it
   * to scroll the card into view and drop the caret in the composer, so the
   * next thing the user does after clicking + is type. */
  composerCue: number;

  start: () => void;
  setModel: (model: string) => void;
  setDeckShape: (deckShape: DeckShapeId) => void;
  setDepth: (depth: DepthId) => void;
  setBrief: (brief: string) => void;
  setDragging: (dragging: boolean) => void;
  onFile: (file: File) => Promise<void>;
  clearFile: () => void;
  generate: () => Promise<void>;
  reset: () => void;

  toggleMulti: () => void;
  pick: (id: string) => void;
  clearSelection: () => void;
  setDraft: (draft: string) => void;
  send: () => Promise<void>;
  /** Insert an empty slide before position `index` (0 = top of deck). */
  addSlideAt: (index: number) => void;
  removeSlide: (id: string) => void;

  setMenu: (open: boolean) => void;
  setExporting: (kind: "pptx" | "pdf" | null) => void;
  exportPptx: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  screen: "landing",
  started: false,
  model: DEFAULT_GENERATE_MODEL,
  deckShape: DEFAULT_DECK_SHAPE,
  depth: DEFAULT_DEPTH,
  brief: "",
  fileName: null,
  fileText: null,
  dragging: false,
  parsing: false,

  genLabel: "Extracting source document…",
  genStepIndex: 0,

  deckId: null,
  deckTitle: "",
  slides: [],
  deckTheme: undefined,
  sel: [],
  multi: false,
  draft: "",
  log: [],
  busy: false,
  errIds: [],
  flash: [],
  menu: false,
  exporting: null,
  composerCue: 0,

  start: () => set({ started: true }),
  setModel: (model) => set({ model }),
  setDeckShape: (deckShape) => set({ deckShape }),
  setDepth: (depth) => set({ depth }),
  setBrief: (brief) => set({ brief }),
  setDragging: (dragging) => set({ dragging }),

  clearFile: () => set({ fileName: null, fileText: null }),

  onFile: async (file: File) => {
    set({ dragging: false });
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (
      !ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])
    ) {
      toast.error("Unsupported file", {
        description: UNSUPPORTED_FILE_MESSAGE,
      });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File too large", {
        description: `Keep the source document under ${MAX_FILE_LABEL.replace(" max", "")}, or paste the text instead.`,
      });
      return;
    }
    set({ fileName: file.name, parsing: true });
    try {
      const { extractedText } = await parseFile(file);
      set({ fileText: extractedText, parsing: false });
    } catch (e) {
      set({ fileName: null, fileText: null, parsing: false });
      toast.error("Couldn't read that file", {
        description: e instanceof Error ? e.message : UNSUPPORTED_FILE_MESSAGE,
      });
    }
  },

  generate: async () => {
    const { fileName, fileText, brief, model, deckShape, depth } = get();
    if (!fileName && brief.trim().length < 20) return;
    set({
      screen: "generating",
      genStepIndex: 0,
      genLabel: "Extracting source document…",
    });
    try {
      await streamGenerate(
        { brief, fileText, model, deckShape, depth, sourceFileName: fileName },
        (evt) => {
          if (evt.type === "progress") {
            set((s) => ({
              genStepIndex: s.genStepIndex + 1,
              genLabel: evt.label,
            }));
          } else if (evt.type === "done") {
            set({
              screen: "workspace",
              // Edits default to the fast/cheap tier regardless of the
              // generation model (Technical Design Document §3.4) — the
              // dropdown remains a per-edit override from here.
              model: DEFAULT_EDIT_MODEL,
              deckId: evt.deck.deckId,
              deckTitle: evt.deck.meta.title,
              slides: evt.deck.slides,
              sel: [],
              multi: false,
              draft: "",
              log: [],
            });
            toast.success("Deck drafted", {
              description: `${evt.deck.slides.length} slides · click a slide to edit it.`,
            });
          } else if (evt.type === "error") {
            throw new Error(evt.message);
          }
        },
      );
    } catch (e) {
      set({ screen: "landing" });
      toast.error("Generation failed", {
        description:
          e instanceof Error ? e.message : "Retry, or try a shorter brief.",
      });
    }
  },

  reset: () =>
    set({
      screen: "landing",
      started: false,
      model: DEFAULT_GENERATE_MODEL,
      deckId: null,
      deckTitle: "",
      slides: [],
      sel: [],
      multi: false,
      draft: "",
      log: [],
      errIds: [],
      flash: [],
      menu: false,
      fileName: null,
      fileText: null,
      brief: "",
    }),

  toggleMulti: () =>
    set((s) => ({ multi: !s.multi, sel: s.multi ? s.sel.slice(0, 1) : s.sel })),

  pick: (id) =>
    set((s) => {
      if (!s.multi) {
        return {
          sel: s.sel.length === 1 && s.sel[0] === id ? [] : [id],
          errIds: [],
        };
      }
      return {
        sel: s.sel.includes(id)
          ? s.sel.filter((x) => x !== id)
          : [...s.sel, id],
        errIds: [],
      };
    }),

  clearSelection: () => set({ sel: [], errIds: [] }),
  setDraft: (draft) => set({ draft }),

  send: async () => {
    const { draft, busy, screen, sel, slides, model } = get();
    const instruction = draft.trim();
    if (!instruction || busy || screen !== "workspace") return;
    // Send only the slides being edited plus a titles-only deck map: a
    // one-slide edit used to ship the entire deck's JSON on every request.
    const targetSlides = sel.length
      ? slides.filter((s) => sel.includes(s.id))
      : slides;
    if (!targetSlides.length) return;
    const targets = targetSlides.map((s) => s.id);
    const scope = labelFor(sel, slides);
    set({ busy: true, errIds: [] });

    try {
      const res = await postEdit({
        instruction,
        model,
        slides: targetSlides,
        outline: deckOutline(slides),
      });
      const failed = res.results.filter((r) => r.error);
      if (failed.length) {
        set({ busy: false, errIds: failed.map((r) => r.id) });
        set((s) => ({
          log: [
            {
              id: crypto.randomUUID(),
              instruction,
              scope,
              note: failed[0].error!,
              ok: false,
              failed: true,
              time: nowLabel(),
            },
            ...s.log,
          ],
        }));
        toast.error("Edit failed", { description: failed[0].error });
        setTimeout(() => set({ errIds: [] }), 3000);
        return;
      }

      const patched = new Map(
        res.results.filter((r) => r.slide).map((r) => [r.id, r.slide!]),
      );
      const notes = Array.from(
        new Set(res.results.map((r) => r.note).filter(Boolean)),
      );
      set((s) => ({
        slides: s.slides.map((sl) => patched.get(sl.id) ?? sl),
        busy: false,
        draft: "",
        flash: targets,
        log: [
          {
            id: crypto.randomUUID(),
            instruction,
            scope,
            note: `${notes.join(" ")} ${targets.length} slide${targets.length === 1 ? "" : "s"} updated.`,
            ok: true,
            failed: false,
            time: nowLabel(),
          },
          ...s.log,
        ],
      }));
      setTimeout(() => set({ flash: [] }), 950);
    } catch (e) {
      set({ busy: false });
      toast.error("Edit failed", {
        description:
          e instanceof Error
            ? e.message
            : "Try again — the instruction is still in the composer.",
      });
    }
  },

  addSlideAt: (index) => {
    const id = crypto.randomUUID();
    set((s) => {
      const slides = [...s.slides];
      slides.splice(Math.max(0, Math.min(index, slides.length)), 0, {
        id,
        kind: "placeholder",
      });
      // Force single-select: the new slide is the one thing the next
      // instruction should apply to, and inheriting a multi-selection here
      // would silently rewrite unrelated slides.
      return {
        slides,
        sel: [id],
        multi: false,
        errIds: [],
        composerCue: s.composerCue + 1,
      };
    });
  },

  /**
   * Drop a slide from the deck.
   *
   * There is no separate "deleted" state to filter downstream: the slide
   * leaves `slides`, which is the single source for the edit payload, the
   * deck outline, the PPTX request and the PDF capture alike. Removing it
   * here removes it everywhere by construction.
   *
   * The undo lives in the toast rather than behind a confirm dialog. A
   * generated slide costs a model call and a paragraph of someone's
   * thinking, and this button is one hover away from every card — a misclick
   * has to be recoverable, but not at the price of a modal on every delete.
   */
  removeSlide: (id) => {
    const { slides } = get();
    const index = slides.findIndex((s) => s.id === id);
    if (index === -1) return;
    const removed = slides[index];

    set((s) => ({
      slides: s.slides.filter((x) => x.id !== id),
      sel: s.sel.filter((x) => x !== id),
      errIds: s.errIds.filter((x) => x !== id),
      flash: s.flash.filter((x) => x !== id),
    }));

    const remaining = get().slides.length;
    toast(
      `${removed.kind === "placeholder" ? "Empty slide" : `Slide ${index + 1}`} removed`,
      {
        description: remaining
          ? `${remaining} slide${remaining === 1 ? "" : "s"} left in the deck.`
          : "The deck is empty.",
        action: {
          label: "Undo",
          onClick: () =>
            set((s) => {
              // The toast outlives the click, so guard against a second undo
              // putting a duplicate id into the deck.
              if (s.slides.some((x) => x.id === removed.id)) return {};
              const next = [...s.slides];
              next.splice(Math.min(index, next.length), 0, removed);
              return { slides: next, sel: [removed.id] };
            }),
        },
      },
    );
  },

  setMenu: (open) => set({ menu: open }),
  setExporting: (kind) => set({ exporting: kind }),

  exportPptx: async () => {
    const { exporting, slides, deckTitle } = get();
    if (exporting) return;

    // An empty slide has no layout to render, so it is dropped rather than
    // exported blank — and the toast says so, because silently shipping a
    // deck one slide short of what's on screen is worse than either.
    const exportable = slides.filter((s) => s.kind !== "placeholder");
    const skipped = slides.length - exportable.length;
    if (!exportable.length) {
      toast.error("Nothing to export yet", {
        description:
          "Describe your empty slides first — an empty slide has no layout to export.",
      });
      return;
    }
    set({ exporting: "pptx" });

    const filename = `${slugify(deckTitle || "proposal")}.pptx`;
    const job = fetchExportPptx(
      exportable,
      deckTitle || "Proposal",
      get().deckTheme,
    ).then((blob) => {
      downloadBlob(blob, filename);
      return filename;
    });

    toast.promise(job, {
      loading: "Exporting PowerPoint…",
      success: (name) =>
        `${name} · ${exportable.length} slides${skipped ? ` · ${skipped} empty slide${skipped === 1 ? "" : "s"} skipped` : ""}`,
      error: (e) =>
        e instanceof Error ? e.message : "Export failed. Try again.",
    });

    await job.catch(() => {});
    set({ exporting: null, menu: false });
  },
}));

export { labelFor };
