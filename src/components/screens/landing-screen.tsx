"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, FileCheck2, Sparkles, Upload } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DECK_SHAPE_OPTIONS, DEPTH_OPTIONS, estimateReadMinutes } from "@/config/deck-shapes";
import { MODEL_OPTIONS } from "@/lib/models";
import { cn } from "@/lib/utils";
import { ACCEPTED_EXTENSIONS, MAX_FILE_LABEL } from "@/config/upload";

const START_FADE_MS = 260;

/** Purely illustrative — the same 10-section deck shape used by the "Full
 * proposal" shape, previewed here before the user has typed anything. */
const BANNER_SLIDES = [
  { kind: "title", title: "Warehouse Management System" },
  { kind: "summary", title: "Executive Summary" },
  { kind: "bullets", title: "Project Understanding" },
  { kind: "comparison", title: "Option Analysis" },
  { kind: "bullets", title: "Solution Proposal" },
  { kind: "table", title: "Feature Detail" },
  { kind: "timeline", title: "Execution Methodology" },
  { kind: "bullets", title: "Change Management & Governance" },
  { kind: "team", title: "Delivery Team" },
  { kind: "commercial", title: "Commercial Terms" },
].map((s, i) => ({ ...s, num: String(i + 1).padStart(2, "0") }));

const BANNER_TRACK = [...BANNER_SLIDES, ...BANNER_SLIDES];

export function LandingScreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [leaving, setLeaving] = useState(false);

  const started = useAppStore((s) => s.started);
  const start = useAppStore((s) => s.start);
  const brief = useAppStore((s) => s.brief);
  const setBrief = useAppStore((s) => s.setBrief);
  const useSample = useAppStore((s) => s.useSample);
  const fileName = useAppStore((s) => s.fileName);
  const parsing = useAppStore((s) => s.parsing);
  const dragging = useAppStore((s) => s.dragging);
  const setDragging = useAppStore((s) => s.setDragging);
  const onFile = useAppStore((s) => s.onFile);
  const model = useAppStore((s) => s.model);
  const setModel = useAppStore((s) => s.setModel);
  const deckShape = useAppStore((s) => s.deckShape);
  const setDeckShape = useAppStore((s) => s.setDeckShape);
  const depth = useAppStore((s) => s.depth);
  const setDepth = useAppStore((s) => s.setDepth);
  const generate = useAppStore((s) => s.generate);

  const chars = brief.trim().length;
  const canGenerate = (!!fileName && !parsing) || chars >= 20;

  const shape = DECK_SHAPE_OPTIONS.find((o) => o.id === deckShape) ?? DECK_SHAPE_OPTIONS[0];
  const depthOption = DEPTH_OPTIONS.find((o) => o.id === depth) ?? DEPTH_OPTIONS[1];
  const slideCount = shape.sections.length;
  const readMinutes = estimateReadMinutes(deckShape, depth);

  function handleStart() {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => {
      start();
      setLeaving(false);
    }, START_FADE_MS);
  }

  return (
    <div className="bg-grain relative flex flex-1 flex-col items-center overflow-y-auto px-6 py-8">
      <div className="flex w-full max-w-180 items-center justify-between">
        <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
          Balerion
        </span>
        <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.02em] text-detail">
          <span className="size-1.5 rounded-full bg-accent" />
          Balerion · nothing leaves this browser
        </span>
      </div>

      <div
        className={cn(
          "flex w-full max-w-180 flex-col items-center text-center transition-[padding-top] duration-500 ease-out",
          started ? "pt-8" : "pt-[12vh]"
        )}
      >
        <span className="font-mono text-[11px] tracking-[0.14em] text-detail uppercase">
          Proposal Assistant
        </span>
        <div
          className={cn(
            "font-display font-semibold text-foreground transition-all duration-500 ease-out",
            started ? "mt-3 text-[32px] leading-none" : "mt-4.5 text-[46px] leading-none"
          )}
        >
          Turn a brief into a pitch-ready deck.
        </div>
        <div className="mt-3.5 max-w-140 text-[16px] leading-[1.6] text-detail text-wrap-pretty">
          Hand it the client brief. It drafts the whole proposal — understanding, options,
          solution, methodology, team and commercials — then edits any slide from a plain-English
          instruction.
        </div>

        {!started ? (
          <div
            className={cn(
              "flex w-full flex-col items-center transition-opacity duration-250 ease-out",
              leaving ? "opacity-0" : "opacity-100"
            )}
          >
            <div className="mt-6.5 flex items-center gap-2.5 font-mono text-[11.5px] text-detail">
              <span>16:9 deck · up to 10 slides</span>
              <span className="size-1 rounded-full bg-border" />
              <span>PowerPoint or PDF</span>
              <span className="size-1 rounded-full bg-border" />
              <span>rate-card commercials</span>
            </div>
            <Button
              size="lg"
              onClick={handleStart}
              className="group mt-7.5 h-13 gap-2 rounded-full px-8 text-[15.5px] shadow-soft-lg"
            >
              Start
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Button>

            <div className="mt-11 w-full">
              <div className="w-full overflow-hidden [-webkit-mask-image:linear-gradient(90deg,transparent_0,black_9%,black_91%,transparent_100%)] [mask-image:linear-gradient(90deg,transparent_0,black_9%,black_91%,transparent_100%)]">
                <div className="animate-marquee flex w-max">
                  {BANNER_TRACK.map((s, i) => (
                    <div
                      key={i}
                      className="mr-3.5 flex aspect-video w-52 flex-none flex-col gap-1.5 overflow-hidden rounded-lg border border-border bg-card p-3.5 text-left shadow-soft"
                    >
                      <span className="font-mono text-[8.5px] tracking-[0.08em] text-detail">
                        {s.num} · {s.kind}
                      </span>
                      <span className="font-display text-[12.5px] leading-tight text-foreground text-wrap-pretty">
                        {s.title}
                      </span>
                      <span className="h-1 w-[82%] rounded-full bg-highlight/70" />
                      <span className="h-1 w-[68%] rounded-full bg-highlight/45" />
                      <span className="h-1 w-[74%] rounded-full bg-highlight/45" />
                      <span
                        className={cn(
                          "mt-auto h-1 w-[34%] rounded-full",
                          s.kind === "commercial" ? "bg-accent" : "bg-[#C9B385]"
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3.5 text-center font-mono text-[11px] text-detail">
                A drafted Northgate Logistics deck · 10 slides
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2.5 font-mono text-[11.5px] text-detail">
            <span>{String(slideCount).padStart(2, "0")} slides</span>
            <span className="size-1 rounded-full bg-border" />
            <span>{String(readMinutes).padStart(2, "0")} min read</span>
          </div>
        )}
      </div>

      {started ? (
        <div className="animate-fade-up mt-9 flex w-full max-w-180 flex-col gap-6 pb-12">
          <Card className="shadow-soft-lg">
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10.5px] tracking-[0.09em] text-detail uppercase">
                  01 · The input
                </span>
                <span className="font-mono text-[10.5px] text-detail">
                  {fileName ? "document attached" : chars >= 20 ? "brief typed" : "waiting"}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="src-file">
                  Source document <span className="font-normal text-detail">— optional</span>
                </Label>
                <input
                  ref={inputRef}
                  id="src-file"
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                  }}
                />
                <label
                  htmlFor="src-file"
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!dragging) setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) void onFile(f);
                    else setDragging(false);
                  }}
                  className={cn(
                    "group flex min-h-19 cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 transition-all duration-150",
                    dragging
                      ? "scale-[1.01] border-accent bg-highlight/40"
                      : "border-[#C9B385] bg-card hover:bg-highlight/25"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      fileName ? "border-accent/30 bg-accent/10" : "border-border bg-card"
                    )}
                  >
                    {fileName ? (
                      <FileCheck2 className="size-4.5 text-accent" strokeWidth={1.8} />
                    ) : (
                      <Upload
                        className="size-4.5 text-foreground transition-transform duration-150 group-hover:-translate-y-0.5"
                        strokeWidth={1.8}
                      />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-sm font-medium text-foreground">
                      {fileName ? fileName : dragging ? "Drop to attach" : "Drop a document, or click to browse"}
                    </span>
                    {fileName ? (
                      <span className="font-mono text-[11.5px] text-detail">
                        {parsing ? "Reading…" : "Attached · click to replace"}
                      </span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {ACCEPTED_EXTENSIONS.map((ext) => (
                          <Badge key={ext} variant="outline" className="font-mono text-[10px] text-detail">
                            {ext}
                          </Badge>
                        ))}
                        <span className="self-center font-mono text-[11px] text-detail">{MAX_FILE_LABEL}</span>
                      </span>
                    )}
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="brief">Client brief</Label>
                <Textarea
                  id="brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Paste or type the brief — business goals, symptoms, constraints…"
                  className="h-33 resize-none bg-card text-[14px] leading-[1.55]"
                />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={useSample}
                    className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[12px] text-accent underline decoration-accent/40 underline-offset-[3px] transition-colors hover:decoration-accent"
                  >
                    <Sparkles className="size-3" />
                    Use a sample brief
                  </button>
                  <span className="font-mono text-[11.5px] text-detail">{chars} characters</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft-lg">
            <CardContent className="flex flex-col gap-4.5">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10.5px] tracking-[0.09em] text-detail uppercase">
                  02 · Deck shape
                </span>
                <span className="font-mono text-[10.5px] text-detail">{shape.label.toLowerCase()}</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {DECK_SHAPE_OPTIONS.map((opt) => {
                  const on = opt.id === deckShape;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDeckShape(opt.id)}
                      className={cn(
                        "flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-all duration-150",
                        on
                          ? "border-foreground bg-highlight/25 ring-2 ring-accent/30"
                          : "border-border bg-card hover:border-accent/40"
                      )}
                    >
                      <span className="flex items-center justify-between gap-1.5">
                        <span className="text-[13.5px] font-semibold text-foreground">{opt.label}</span>
                        <span
                          className={cn(
                            "flex size-3.5 shrink-0 items-center justify-center rounded-full",
                            on ? "bg-foreground text-background" : "bg-muted"
                          )}
                        >
                          {on ? <Check className="size-2.5" strokeWidth={3} /> : null}
                        </span>
                      </span>
                      <span className="font-mono text-[10.5px] text-detail">{opt.sections.length} slides</span>
                      <span className="text-[11.5px] leading-[1.45] text-detail text-wrap-pretty">
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Depth</Label>
                <div
                  role="group"
                  aria-label="Depth"
                  className="flex gap-1 rounded-lg border border-border bg-card p-0.75"
                >
                  {DEPTH_OPTIONS.map((opt) => {
                    const on = opt.id === depth;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setDepth(opt.id)}
                        className={cn(
                          "h-8 flex-1 rounded-md text-[12.5px] transition-colors duration-150",
                          on ? "bg-accent font-semibold text-accent-foreground" : "text-body hover:bg-highlight/30"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-foreground px-5 py-4">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[14.5px] font-semibold text-background">
                {shape.label} · {slideCount} slides · {depthOption.label.toLowerCase()}
              </span>
              <span className="font-mono text-[11px] text-background/60">
                {canGenerate
                  ? "Ready · Sonnet-drafted, editable slide by slide"
                  : "Attach a document or type 20+ characters to enable Generate"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Select value={model} onValueChange={(v) => v && setModel(v)}>
                <SelectTrigger
                  id="model-landing"
                  className="h-11 min-w-37.5 border-background/25 bg-transparent text-background hover:bg-background/10 [&_svg]:text-background/70"
                >
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
              <Button
                size="lg"
                disabled={!canGenerate}
                onClick={() => void generate()}
                className="group h-11 gap-2 bg-background px-6 text-[14.5px] text-foreground hover:bg-background/90"
              >
                Generate deck
                <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
