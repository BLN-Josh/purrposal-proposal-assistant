"use client";

import { create } from "zustand";
import { toast } from "sonner";
import type { Slide, DeckTheme } from "@/lib/slides/schema";
import { parseFile, streamGenerate, postEdit, fetchExportPptx } from "@/lib/api-client";
import { downloadBlob, slugify } from "@/lib/download";
import { DEFAULT_EDIT_MODEL, DEFAULT_GENERATE_MODEL } from "@/lib/models";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, MAX_FILE_LABEL, UNSUPPORTED_FILE_MESSAGE } from "@/config/upload";
import { DEFAULT_DECK_SHAPE, DEFAULT_DEPTH, type DeckShapeId, type DepthId } from "@/config/deck-shapes";

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
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function labelFor(sel: string[], slides: Slide[]): string {
  const nums = slides
    .map((s, i) => (sel.includes(s.id) ? i + 1 : null))
    .filter((n): n is number => n !== null);
  if (!nums.length) return "Whole deck";
  return nums.length === 1 ? `Slide ${nums[0]}` : `Slides ${nums.join(", ")}`;
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
    if (!ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
      toast.error("Unsupported file", { description: UNSUPPORTED_FILE_MESSAGE });
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
    set({ screen: "generating", genStepIndex: 0, genLabel: "Extracting source document…" });
    try {
      await streamGenerate(
        { brief, fileText, model, deckShape, depth, sourceFileName: fileName },
        (evt) => {
          if (evt.type === "progress") {
            set((s) => ({ genStepIndex: s.genStepIndex + 1, genLabel: evt.label }));
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
        }
      );
    } catch (e) {
      set({ screen: "landing" });
      toast.error("Generation failed", {
        description: e instanceof Error ? e.message : "Retry, or try a shorter brief.",
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
        return { sel: s.sel.length === 1 && s.sel[0] === id ? [] : [id], errIds: [] };
      }
      return {
        sel: s.sel.includes(id) ? s.sel.filter((x) => x !== id) : [...s.sel, id],
        errIds: [],
      };
    }),

  clearSelection: () => set({ sel: [], errIds: [] }),
  setDraft: (draft) => set({ draft }),

  send: async () => {
    const { draft, busy, screen, sel, slides, model } = get();
    const instruction = draft.trim();
    if (!instruction || busy || screen !== "workspace") return;
    const targets = sel.length ? sel : slides.map((s) => s.id);
    const scope = labelFor(sel, slides);
    set({ busy: true, errIds: [] });

    try {
      const res = await postEdit({ slideIds: targets, instruction, model, slides });
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

      const patched = new Map(res.results.filter((r) => r.slide).map((r) => [r.id, r.slide!]));
      const notes = Array.from(new Set(res.results.map((r) => r.note).filter(Boolean)));
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
        description: e instanceof Error ? e.message : "Try again — the instruction is still in the composer.",
      });
    }
  },

  setMenu: (open) => set({ menu: open }),
  setExporting: (kind) => set({ exporting: kind }),

  exportPptx: async () => {
    const { exporting, slides, deckTitle } = get();
    if (exporting) return;
    set({ exporting: "pptx" });

    const filename = `${slugify(deckTitle || "proposal")}.pptx`;
    const job = fetchExportPptx(slides, deckTitle || "Proposal", get().deckTheme).then((blob) => {
      downloadBlob(blob, filename);
      return filename;
    });

    toast.promise(job, {
      loading: "Exporting PowerPoint…",
      success: (name) => `${name} · ${slides.length} slides`,
      error: (e) => (e instanceof Error ? e.message : "Export failed. Try again."),
    });

    await job.catch(() => {});
    set({ exporting: null, menu: false });
  },
}));

export { labelFor };
