"use client";

import { useRef, useState } from "react";
import { ChevronDown, FileText, FileType2, History, Loader2, MessageSquarePlus, X } from "lucide-react";
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
import { MODEL_OPTIONS, MODEL_LABEL } from "@/lib/models";
import { exportSlidesToPdf } from "@/lib/export-pdf";
import { slugify } from "@/lib/download";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function WorkspaceScreen() {
  const gridRef = useRef<HTMLDivElement>(null);

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

  async function handleExportPdf() {
    if (exporting) return;
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
      success: (name) => `${name} · ${slides.length} slides`,
      error: (e) => (e instanceof Error ? e.message : "Export failed. Try again."),
    });

    await job.catch(() => {});
    setPdfBusy(false);
    setExporting(null);
  }

  return (
    <div className="animate-fade-up flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 flex-none items-center justify-between border-b border-border bg-card px-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="font-display text-[19px] font-semibold text-foreground">
            Proposal Assistant
          </span>
          <span className="h-5 w-px bg-border" />
          <span className="truncate text-[13.5px] font-medium text-foreground">{deckTitle}</span>
          <Badge variant="outline" className="font-mono text-[11px] font-normal text-detail">
            {fileName ?? "typed brief"}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-mono text-[11px] font-normal">
            {MODEL_LABEL[model]}
          </Badge>
          <Button variant="outline" size="sm" onClick={reset}>
            Start over
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-[38%] min-h-0 flex-none flex-col border-r border-border bg-card">
          <div className="flex flex-none flex-col gap-1.5 border-b border-border p-4">
            <label htmlFor="model-ws" className="text-xs font-semibold text-body">
              Model
            </label>
            <Select value={model} onValueChange={(v) => v && setModel(v)}>
              <SelectTrigger id="model-ws" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4">
              <div className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.09em] text-detail uppercase">
                <History className="size-3" />
                Edit history
              </div>
              {log.length === 0 ? (
                <div className="mt-3.5 flex flex-col items-start gap-2 rounded-lg border border-dashed border-border bg-card p-4 text-[13px] leading-[1.6] text-detail">
                  <MessageSquarePlus className="size-4 text-detail" />
                  No edits yet. Click a slide on the right, then describe the change below.
                </div>
              ) : (
                <div className="mt-3.5 flex flex-col gap-2.5">
                  {log.map((e) => (
                    <div
                      key={e.id}
                      className={cn(
                        "animate-fade-up rounded-lg border-l-2 bg-card p-3 shadow-soft",
                        e.failed ? "border-l-destructive" : "border-l-ring/50"
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2.5">
                        <span className="font-mono text-[10.5px] text-foreground">{e.scope}</span>
                        <span className="font-mono text-[10.5px] text-detail">{e.time}</span>
                      </div>
                      <div className="mt-1.5 text-[13.5px] leading-normal text-foreground">
                        {e.instruction}
                      </div>
                      {e.ok ? (
                        <div className="mt-1.5 text-[12.5px] leading-normal text-body">{e.note}</div>
                      ) : null}
                      {e.failed ? (
                        <div role="alert" className="mt-1.5 text-[12.5px] leading-normal text-destructive">
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
                  className="animate-ring-in h-7 gap-2 rounded-full py-0 pr-1.5 pl-3 text-[12.5px] font-medium"
                >
                  Editing: {selectionLabel}
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
                <span className="font-mono text-[11.5px] text-detail">
                  No selection — instruction applies to the whole deck
                </span>
              )}
            </div>
            <label htmlFor="composer" className="text-xs font-semibold text-body">
              Instruction
            </label>
            <Textarea
              id="composer"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="e.g. Cut this to 3 bullets · Change the timeline to 8 months · Add a row for API integration"
              className="h-22 resize-none bg-card text-[14px] leading-[1.55]"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] text-detail">⌘⏎ to send</span>
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

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-13 flex-none items-center justify-between border-b border-border bg-card px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-8 items-center gap-2.5">
                <Switch id="select-multiple" checked={multi} onCheckedChange={toggleMulti} />
                <label
                  htmlFor="select-multiple"
                  className="cursor-pointer text-[13px] font-medium text-foreground select-none"
                >
                  Select multiple
                </label>
              </div>
              <span className="font-mono text-[11.5px] text-detail">
                {slides.length} slides · 16:9
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
                <DropdownMenuItem onClick={() => void exportPptx()} className="justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <FileType2 className="size-3.5 text-detail" />
                    PowerPoint (.pptx)
                  </span>
                  <span className="font-mono text-[10.5px] text-detail">
                    {exporting === "pptx" ? "Exporting…" : ""}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleExportPdf()} className="justify-between gap-3">
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

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-6 py-6 pb-16">
              <div ref={gridRef} className="mx-auto flex max-w-230 flex-col gap-5.5">
                {slides.map((s, i) => (
                  <SlideCard
                    key={s.id}
                    slide={s}
                    index={i}
                    selected={sel.includes(s.id)}
                    flashing={flash.includes(s.id)}
                    errored={errIds.includes(s.id)}
                    onSelect={() => pick(s.id)}
                  />
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
