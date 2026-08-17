"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  FileText,
  FileType2,
  History,
  Loader2,
  MessageSquarePlus,
  Plus,
  X,
} from "lucide-react";
import { useAppStore, labelFor } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlideCard } from "@/components/slide-card";
import { AddSlideButton } from "@/components/add-slide-button";
import { DeckOutline } from "@/components/deck-outline";
import { MODEL_OPTIONS, MODEL_LABEL } from "@/lib/models";
import { exportSlidesToPdf } from "@/lib/export-pdf";
import { slugify } from "@/lib/download";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function WorkspaceScreen() {
  const gridRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const deckTitle = useAppStore((s) => s.deckTitle);
  const fileName = useAppStore((s) => s.fileName);
  const model = useAppStore((s) => s.model);
  const setModel = useAppStore((s) => s.setModel);
  const reset = useAppStore((s) => s.reset);

  const slides = useAppStore((s) => s.slides);
  const sel = useAppStore((s) => s.sel);
  const multi = useAppStore((s) => s.multi);
  const toggleMulti = useAppStore((s) => s.toggleMulti);
  const pick = useAppStore((s) => s.pick);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const errIds = useAppStore((s) => s.errIds);
  const flash = useAppStore((s) => s.flash);
  const addSlideAt = useAppStore((s) => s.addSlideAt);
  const removeSlide = useAppStore((s) => s.removeSlide);
  const composerCue = useAppStore((s) => s.composerCue);

  const draft = useAppStore((s) => s.draft);
  const setDraft = useAppStore((s) => s.setDraft);
  const send = useAppStore((s) => s.send);
  const busy = useAppStore((s) => s.busy);
  const log = useAppStore((s) => s.log);

  const menu = useAppStore((s) => s.menu);
  const setMenu = useAppStore((s) => s.setMenu);
  const exporting = useAppStore((s) => s.exporting);
  const setExporting = useAppStore((s) => s.setExporting);
  const exportPptx = useAppStore((s) => s.exportPptx);

  const [pdfBusy, setPdfBusy] = useState(false);

  const selectionLabel = labelFor(sel, slides);
  const fullSelectionLabel = labelFor(sel, slides, Infinity);
  const draftCount = slides.filter((s) => s.kind === "placeholder").length;
  const selectedIsDraft = slides.some(
    (s) => sel.includes(s.id) && s.kind === "placeholder",
  );

  useEffect(() => {
    if (!composerCue) return;
    const id = useAppStore.getState().sel[0];
    if (id) {
      document
        .getElementById(`slide-${id}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    composerRef.current?.focus();
  }, [composerCue]);

  async function handleExportPdf() {
    if (exporting) return;
    // Empty slides carry no `data-slide-surface`, so the capture pass skips
    // them on its own — this just keeps the count honest.
    const pageCount = slides.length - draftCount;
    if (!pageCount) {
      toast.error("Nothing to export yet", {
        description:
          "Describe your empty slides first — an empty slide has no layout to export.",
      });
      return;
    }
    setExporting("pdf");
    setPdfBusy(true);

    const filename = `${slugify(deckTitle || "proposal")}.pdf`;
    const job = (async () => {
      if (!gridRef.current) throw new Error("Nothing to export yet.");
      await exportSlidesToPdf(gridRef.current, filename);
      return filename;
    })();

    toast.promise(job, {
      loading: "Rendering PDF…",
      success: (name) =>
        `${name} · ${pageCount} slides${draftCount ? ` · ${draftCount} empty slide${draftCount === 1 ? "" : "s"} skipped` : ""}`,
      error: (e) =>
        e instanceof Error ? e.message : "Export failed. Try again.",
    });

    await job.catch(() => {});
    setPdfBusy(false);
    setExporting(null);
  }

  return (
    <div className="flex min-h-0 flex-1 animate-fade-up flex-col">
      <div className="flex h-14 flex-none items-center justify-between border-b border-border bg-card/85 px-5 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden font-mono text-[10.5px] tracking-[0.12em] text-detail uppercase lg:inline">
            Proposal Assistant
          </span>
          <span className="hidden h-5 w-px bg-border lg:block" />
          <span className="truncate font-display text-[17px] font-semibold text-foreground">
            {deckTitle}
          </span>
          <Badge
            variant="outline"
            className="font-mono text-[11px] font-normal text-detail"
          >
            {fileName ?? "typed brief"}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="font-mono text-[11px] font-normal"
          >
            {MODEL_LABEL[model]}
          </Badge>
          <Button variant="outline" size="sm" onClick={reset}>
            Start over
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 w-[34%] max-w-md min-w-80 flex-none flex-col border-r border-border bg-card">
          <DeckOutline slides={slides} sel={sel} />

          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4">
              <div className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.09em] text-detail uppercase">
                <History className="size-3" />
                Edit history
              </div>
              {log.length === 0 ? (
                <div className="mt-3.5 flex flex-col items-start gap-2 rounded-lg border border-dashed border-border bg-card p-4 text-[13px] leading-[1.6] text-detail">
                  <MessageSquarePlus className="size-4 text-detail" />
                  No edits yet. Click a slide on the right, then describe the
                  change below.
                </div>
              ) : (
                <div className="mt-3.5 flex flex-col gap-2.5">
                  {log.map((e) => (
                    <div
                      key={e.id}
                      className={cn(
                        "animate-fade-up rounded-lg border-l-2 bg-card p-3 shadow-soft transition-all duration-300 ease-(--ease-smooth) hover:-translate-y-0.5 hover:shadow-soft-lg",
                        e.failed ? "border-l-destructive" : "border-l-ring/50",
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2.5">
                        <span className="truncate font-mono text-[10.5px] text-foreground">
                          {e.scope}
                        </span>
                        <span className="flex-none font-mono text-[10.5px] text-detail">
                          {e.time}
                        </span>
                      </div>
                      <div className="mt-1.5 text-[13.5px] leading-normal text-foreground">
                        {e.instruction}
                      </div>
                      {e.ok ? (
                        <div className="mt-1.5 text-[12.5px] leading-normal text-body">
                          {e.note}
                        </div>
                      ) : null}
                      {e.failed ? (
                        <div
                          role="alert"
                          className="mt-1.5 text-[12.5px] leading-normal text-destructive"
                        >
                          {e.note}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex flex-none flex-col gap-2.5 border-t border-border bg-card p-4">
            <div className="flex min-h-7 items-center gap-2">
              {sel.length > 0 ? (
                <Badge
                  variant="secondary"
                  /* Badge shows five; tooltip shows all. */
                  title={
                    selectionLabel === fullSelectionLabel
                      ? undefined
                      : `Editing: ${fullSelectionLabel}`
                  }
                  className="h-7 min-w-0 shrink animate-ring-in gap-2 rounded-full py-0 pr-1.5 pl-3 text-[12.5px] font-medium"
                >
                  <span className="truncate">Editing: {selectionLabel}</span>
                  <button
                    type="button"
                    aria-label="Clear slide selection"
                    onClick={clearSelection}
                    className="flex size-5 cursor-pointer items-center justify-center rounded-full bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ) : (
                /* With nothing selected, one instruction rewrites the whole
                   deck — the most consequential state in the editor. */
                <span className="flex items-center gap-2 rounded-full bg-brand-5/12 py-1 pr-3 pl-2.5 font-mono text-[11.5px] text-brand-1 ring-1 ring-brand-5/30">
                  <AlertTriangle
                    className="size-3.25 shrink-0"
                    strokeWidth={2}
                  />
                  {slides.length === 1
                    ? "Applies to the whole deck"
                    : `Applies to all ${slides.length} slides`}
                </span>
              )}
            </div>
            <label
              htmlFor="composer"
              className="text-xs font-semibold text-body"
            >
              Instruction
            </label>
            <Textarea
              id="composer"
              ref={composerRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={
                selectedIsDraft
                  ? "Describe this new slide — e.g. Compare on-prem vs cloud hosting for the warehouse system"
                  : "e.g. Cut this to 3 bullets · Change the timeline to 8 months · Add a row for API integration"
              }
              className="h-22 resize-none bg-card text-[14px] leading-[1.55] transition-shadow duration-300 ease-(--ease-smooth) focus-visible:shadow-soft-lg"
            />
            <div className="flex items-center justify-between gap-3">
              <Select value={model} onValueChange={(v) => v && setModel(v)}>
                <SelectTrigger id="model-ws" className="h-11 w-32.5">
                  {/* Without a render child the primitive prints the raw
                      value — "claude-haiku-4-5" rather than "Haiku 4.5". */}
                  <SelectValue>
                    {(v) => MODEL_LABEL[v as string] ?? (v as string)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-3">
                <span className="hidden font-mono text-[11px] text-detail sm:inline">
                  ⌘⏎ to send
                </span>
                <Button
                  onClick={() => void send()}
                  disabled={busy || !draft.trim()}
                  className="h-11 min-w-26 gap-2 px-5"
                >
                  {busy ? <Loader2 className="size-3.25 animate-spin" /> : null}
                  {busy ? "Sending" : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-13 flex-none items-center justify-between border-b border-border bg-card px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-8 items-center gap-2.5">
                <Switch
                  id="select-multiple"
                  checked={multi}
                  onCheckedChange={toggleMulti}
                />
                <label
                  htmlFor="select-multiple"
                  className="cursor-pointer text-[13px] font-medium text-foreground select-none"
                >
                  Select multiple
                </label>
              </div>
              <span className="flex items-center gap-2 font-mono text-[11.5px] text-detail">
                <span>{slides.length} slides · 16:9</span>
                {/* Drop empty slides */}
                {draftCount ? (
                  <span className="rounded-full bg-brand-5/15 px-2 py-0.5 text-[11px] text-brand-1 ring-1 ring-brand-5/30">
                    {draftCount} empty
                  </span>
                ) : null}
              </span>
            </div>

            <DropdownMenu open={menu} onOpenChange={setMenu}>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-2">
                    Export
                    <ChevronDown className="size-3 text-body" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-55">
                <DropdownMenuItem
                  onClick={() => void exportPptx()}
                  className="justify-between gap-3"
                >
                  <span className="flex items-center gap-2">
                    <FileType2 className="size-3.5 text-detail" />
                    PowerPoint (.pptx)
                  </span>
                  <span className="font-mono text-[10.5px] text-detail">
                    {exporting === "pptx" ? "Exporting…" : ""}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void handleExportPdf()}
                  className="justify-between gap-3"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="size-3.5 text-detail" />
                    PDF (1280×720)
                  </span>
                  <span className="font-mono text-[10.5px] text-detail">
                    {pdfBusy ? "Exporting…" : ""}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ScrollArea className="min-h-0 flex-1 bg-muted shadow-[inset_0_8px_12px_-10px_rgba(47,16,0,0.18)]">
            <div className="px-6 py-6 pb-16">
              <div
                ref={gridRef}
                className="mx-auto flex max-w-230 flex-col gap-0"
              >
                {slides.map((s, i) => (
                  <Fragment key={s.id}>
                    <AddSlideButton
                      onAdd={() => addSlideAt(i)}
                      label={`Add a slide before slide ${i + 1}`}
                    />
                    <SlideCard
                      slide={s}
                      index={i}
                      selected={sel.includes(s.id)}
                      flashing={flash.includes(s.id)}
                      errored={errIds.includes(s.id)}
                      onSelect={() => pick(s.id)}
                      onRemove={() => removeSlide(s.id)}
                    />
                  </Fragment>
                ))}
                <AddSlideButton
                  onAdd={() => addSlideAt(slides.length)}
                  label="Add a slide at the end of the deck"
                />

                {/* The insertion affordance is hover-revealed, which is fine
                    between cards and useless when there are none — an empty
                    deck would be a blank pane with no visible way out. */}
                {slides.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => addSlideAt(0)}
                    className="group/empty flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card text-detail transition-all duration-300 [transition-timing-function:var(--ease-smooth)] hover:border-brand-1/50 hover:bg-highlight/20 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Plus className="size-6 transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover/empty:scale-125 group-hover/empty:rotate-90" />
                    <span className="text-[13.5px] font-medium">
                      Add the first slide
                    </span>
                    <span className="max-w-80 text-center text-[12.5px] leading-normal text-detail">
                      Every slide has been removed. Add one and describe it —
                      the layout is chosen for you.
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
