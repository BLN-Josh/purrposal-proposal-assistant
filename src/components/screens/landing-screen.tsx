"use client";

import { Fragment, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Check,
  ChevronDownIcon,
  FileCheck2,
  FileUp,
  LayoutTemplate,
  PenLine,
  Upload,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { MiniSlide, type MiniSlideSpec } from "@/components/mini-slide";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DECK_SHAPE_OPTIONS,
  DEPTH_OPTIONS,
  estimateReadMinutes,
} from "@/config/deck-shapes";
import { MODEL_OPTIONS, MODEL_LABEL } from "@/lib/models";
import { cn } from "@/lib/utils";
import { ACCEPTED_EXTENSIONS, MAX_FILE_LABEL } from "@/config/upload";

const START_FADE_MS = 260;

/** Stagger at the call site: every `animate-*` entrance utility reads `--d`. */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** The headline, pre-split so each word can ride up on its own beat. The
 * accent word carries the marker swipe. */
const HEADLINE = [
  "Turn",
  "a",
  "brief",
  "into",
  "a",
  "pitch-ready",
  "deck.",
] as const;
const ACCENT_WORD = "pitch-ready";

const PROMISE_TAGS = [
  "Understanding",
  "Options",
  "Solution",
  "Methodology",
  "Team",
  "Commercials",
];

/** The whole product in three beats. This lives in the band between the CTA
 * and the marquee — space that was otherwise dead on a tall viewport, and
 * the one question a first-time visitor actually has. */
const STEPS = [
  {
    icon: FileUp,
    label: "Hand over the brief",
    detail: "Drop a document, or paste the text.",
  },
  {
    icon: LayoutTemplate,
    label: "Get the whole deck",
    detail: "Structured 16:9 sections, on-brand.",
  },
  {
    icon: PenLine,
    label: "Revise in plain words",
    detail: "Say what to change; the slide redraws.",
  },
];

/** Purely illustrative — the same 10-section deck shape used by the "Full
 * proposal" shape, previewed here before the user has typed anything. */
const DECK_PREVIEW: MiniSlideSpec[] = (
  [
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
  ] as const
).map((s, i) => ({ ...s, num: String(i + 1).padStart(2, "0") }));

/** Each row holds the full deck twice, so the marquee's -50% keyframe lands
 * exactly on the seam.
 *
 * The lower row is rotated by three and *not* reversed. Travelling the other
 * way already makes it read back-to-front against the top row; reversing the
 * array as well cancels that out and the two rows come back into lockstep,
 * looking like a reflection. The rotation plus the two rows' mismatched
 * periods (44s / 58s) is what keeps a card from sitting under its own twin. */
const ROW_A = [...DECK_PREVIEW, ...DECK_PREVIEW];
const ROW_B_BASE = [...DECK_PREVIEW.slice(3), ...DECK_PREVIEW.slice(0, 3)];
const ROW_B = [...ROW_B_BASE, ...ROW_B_BASE];

export function LandingScreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [leaving, setLeaving] = useState(false);

  const started = useAppStore((s) => s.started);
  const start = useAppStore((s) => s.start);
  const brief = useAppStore((s) => s.brief);
  const setBrief = useAppStore((s) => s.setBrief);
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

  const shape =
    DECK_SHAPE_OPTIONS.find((o) => o.id === deckShape) ?? DECK_SHAPE_OPTIONS[0];
  const depthOption =
    DEPTH_OPTIONS.find((o) => o.id === depth) ?? DEPTH_OPTIONS[1];
  const depthIndex = Math.max(
    0,
    DEPTH_OPTIONS.findIndex((o) => o.id === depth),
  );
  const slideCount = shape.sections.length;
  const readMinutes = estimateReadMinutes(deckShape, depth);

  /** Progress toward the 20-character minimum, for the meter under the
   * brief. Caps at 1 — past the threshold the bar is simply full. */
  const briefProgress = Math.min(1, chars / 20);

  function handleStart() {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => {
      start();
      setLeaving(false);
    }, START_FADE_MS);
  }

  return (
    <div className="bg-grain relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
      <AmbientBackdrop />

      <div className="relative flex min-h-full w-full flex-col items-center px-6 pt-7 pb-8">
        <header className="animate-rise flex w-full max-w-180 items-center justify-between">
          <span className="group font-display text-[15px] font-semibold tracking-tight text-foreground">
            Balerion
            <span className="mt-0.5 block h-px w-0 bg-gradient-to-r from-brand-1 to-brand-5 transition-all duration-500 [transition-timing-function:var(--ease-smooth)] group-hover:w-full" />
          </span>
          <span className="flex items-center gap-2 rounded-full bg-card/70 px-3 py-1.5 font-mono text-[11px] tracking-[0.02em] text-detail ring-1 ring-foreground/8 backdrop-blur-sm">
            <span className="relative flex size-1.5">
              <span className="animate-halo absolute inset-0 rounded-full bg-brand-4" />
              <span className="relative size-1.5 rounded-full bg-brand-4" />
            </span>
            nothing leaves this browser
          </span>
        </header>

        <main
          className={cn(
            "flex w-full max-w-180 flex-1 flex-col items-center text-center",
            started ? "justify-start pt-8" : "justify-center pt-2",
          )}
        >
          <span
            className="animate-rise inline-flex items-center gap-2 rounded-full bg-highlight/50 px-3.5 py-1.5 font-mono text-[10.5px] tracking-[0.16em] text-foreground/70 uppercase ring-1 ring-foreground/8"
            style={delay(80)}
          >
            Proposal Assistant
          </span>

          <h1
            className={cn(
              "font-display font-semibold text-foreground transition-all duration-700 [transition-timing-function:var(--ease-smooth)]",
              started
                ? "mt-3 text-[32px] leading-[1.05]"
                : "mt-5 text-[clamp(34px,6.2vw,58px)] leading-[1.04] tracking-[-0.02em]",
            )}
          >
            {HEADLINE.map((word, i) => (
              /* The separator is a real space text node, not a margin on the
                 word: a margin looks identical but leaves the accessible name
                 — and anything the reader copies — as "Turnabriefintoa". */
              <Fragment key={i}>
                {i > 0 ? " " : null}
                <span className="inline-block overflow-hidden pb-[0.14em] -mb-[0.14em] align-bottom">
                  <span
                    className="animate-word-up inline-block"
                    style={delay(180 + i * 58)}
                  >
                    {word === ACCENT_WORD ? (
                      <span className="relative inline-block">
                        {/* Marker swipe: sits inside the text box, so the
                            clipping mask above never cuts it off. */}
                        <span
                          aria-hidden
                          className="animate-draw-x absolute inset-x-[-0.05em] bottom-[0.055em] -z-10 h-[0.24em] rounded-[2px] bg-gradient-to-r from-brand-5/70 via-brand-4/48 to-brand-1/28"
                          style={delay(760)}
                        />
                        {word}
                      </span>
                    ) : (
                      word
                    )}
                  </span>
                </span>
              </Fragment>
            ))}
          </h1>

          <div className="mt-4 flex max-w-140 flex-col items-center gap-3 text-[16px] leading-[1.6] text-detail text-wrap-pretty">
            <span className="animate-rise" style={delay(560)}>
              Hand over the client brief, get back a complete proposal, ready to
              pitch.
            </span>
            <span className="flex flex-wrap items-center justify-center gap-1.5">
              {PROMISE_TAGS.map((t, i) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="animate-rise cursor-default bg-card/60 font-mono text-[11px] font-semibold text-detail backdrop-blur-sm transition-all duration-300 [transition-timing-function:var(--ease-smooth)] hover:-translate-y-0.5 hover:border-brand-4/40 hover:bg-highlight/60 hover:text-foreground"
                  style={delay(620 + i * 55)}
                >
                  {t}
                </Badge>
              ))}
            </span>
            <span className="animate-rise" style={delay(960)}>
              Then revise any slide with a plain written note.
            </span>
          </div>

          {!started ? (
            <div
              className={cn(
                "flex w-full flex-col items-center transition-opacity duration-250 ease-out",
                leaving ? "opacity-0" : "opacity-100",
              )}
            >
              <div
                className="animate-rise mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 font-mono text-[11.5px] text-detail"
                style={delay(1040)}
              >
                {["16:9 deck · up to 10+ slides", "PowerPoint or PDF", "rate-card commercials"].map(
                  (t, i) => (
                    <span key={t} className="flex items-center gap-3">
                      {/* Hairline only once the row is guaranteed to be one
                          line — a wrapped row can otherwise start with a rule. */}
                      {i > 0 ? (
                        <span className="hidden h-3 w-px bg-border sm:block" />
                      ) : null}
                      {t}
                    </span>
                  ),
                )}
              </div>

              {/* The primary action is the one thing on this page that does
                  not need selling. Hover moves the arrow and nothing else. */}
              <Button
                size="lg"
                onClick={handleStart}
                className="group/cta animate-rise mt-8 h-13 gap-2 rounded-full px-9 text-[15.5px] shadow-soft-lg"
                style={delay(1100)}
              >
                Start
                <ArrowRight className="size-4 transition-transform duration-300 [transition-timing-function:var(--ease-smooth)] group-hover/cta:translate-x-1" />
              </Button>

              <ol className="mt-14 grid w-full max-w-160 grid-cols-1 gap-3 sm:grid-cols-3">
                {STEPS.map((step, i) => (
                  <li
                    key={step.label}
                    className="animate-rise group relative flex flex-col items-center gap-2.5 rounded-xl bg-card/50 px-4 py-5 text-center ring-1 ring-foreground/6 backdrop-blur-sm transition-all duration-500 [transition-timing-function:var(--ease-smooth)] hover:-translate-y-1 hover:bg-card/80 hover:shadow-soft-lg hover:ring-brand-4/25"
                    style={delay(1180 + i * 90)}
                  >
                    {/* The connector only exists between cards, and only once
                        they sit on one row. */}
                    {i > 0 ? (
                      <span
                        aria-hidden
                        className="absolute top-1/2 -left-3 hidden h-px w-3 bg-border sm:block"
                      />
                    ) : null}
                    <span className="relative flex size-9 items-center justify-center rounded-full bg-highlight/60 text-foreground ring-1 ring-foreground/8 transition-colors duration-500 [transition-timing-function:var(--ease-smooth)] group-hover:bg-highlight">
                      <step.icon className="size-4" strokeWidth={1.8} />
                      <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-foreground font-mono text-[8.5px] text-background">
                        {i + 1}
                      </span>
                    </span>
                    <span className="text-[13.5px] leading-tight font-semibold text-foreground">
                      {step.label}
                    </span>
                    <span className="text-[12px] leading-[1.45] text-detail text-wrap-pretty">
                      {step.detail}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-2.5 font-mono text-[11.5px] text-detail">
              <span key={slideCount} className="animate-rise">
                {String(slideCount).padStart(2, "0")} slides
              </span>
              <span className="size-1 rounded-full bg-border" />
              <span key={readMinutes} className="animate-rise">
                {String(readMinutes).padStart(2, "0")} min read
              </span>
            </div>
          )}

          {started ? (
            <div className="mt-9 flex w-full flex-col gap-6 pb-4 text-left">
              <Card
                className="animate-rise shadow-soft-lg ring-foreground/8 transition-shadow duration-500 [transition-timing-function:var(--ease-smooth)] hover:shadow-lift"
                style={delay(40)}
              >
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10.5px] tracking-[0.09em] text-detail uppercase">
                      <span className="text-foreground/45">01</span> · The input
                    </span>
                    <span
                      key={fileName ? "file" : chars >= 20 ? "typed" : "wait"}
                      className={cn(
                        "animate-rise flex items-center gap-1.5 font-mono text-[10.5px]",
                        canGenerate ? "text-brand-1" : "text-detail",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full transition-colors duration-300",
                          canGenerate ? "bg-brand-4" : "bg-border",
                        )}
                      />
                      {fileName
                        ? "document attached"
                        : chars >= 20
                          ? "brief typed"
                          : "waiting"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="src-file">
                      Source document{" "}
                      <span className="font-normal text-detail">
                        — optional
                      </span>
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
                        "group relative flex min-h-19 cursor-pointer items-center gap-3 overflow-hidden rounded-lg border border-dashed p-4 transition-all duration-300 [transition-timing-function:var(--ease-smooth)]",
                        dragging
                          ? "scale-[1.015] border-brand-4 bg-highlight/60 shadow-lift"
                          : "border-[#C9B385] bg-card hover:border-brand-4/50 hover:bg-highlight/30",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute inset-0 bg-[radial-gradient(320px_circle_at_18%_50%,rgba(252,153,71,0.16),transparent_70%)] transition-opacity duration-500",
                          dragging ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span
                        className={cn(
                          "relative flex size-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-300 [transition-timing-function:var(--ease-spring)]",
                          fileName
                            ? "border-brand-4/35 bg-brand-4/10"
                            : dragging
                              ? "-translate-y-0.5 scale-110 border-brand-4/40 bg-card"
                              : "border-border bg-card",
                        )}
                      >
                        {fileName ? (
                          <FileCheck2
                            className="animate-pop-check size-4.5 text-brand-1"
                            strokeWidth={1.8}
                          />
                        ) : (
                          <Upload
                            className="size-4.5 text-foreground transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover:-translate-y-0.5"
                            strokeWidth={1.8}
                          />
                        )}
                      </span>
                      <span className="relative flex min-w-0 flex-col gap-1">
                        <span className="truncate text-sm font-medium text-foreground">
                          {fileName
                            ? fileName
                            : dragging
                              ? "Drop to attach"
                              : "Drop a document, or click to browse"}
                        </span>
                        {fileName ? (
                          <span className="font-mono text-[11.5px] text-detail">
                            {parsing ? (
                              <span className="animate-pulse">Reading…</span>
                            ) : (
                              "Attached · click to replace"
                            )}
                          </span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {ACCEPTED_EXTENSIONS.map((ext) => (
                              <Badge
                                key={ext}
                                variant="outline"
                                className="font-mono text-[10px] text-detail transition-colors duration-300 group-hover:border-brand-4/30"
                              >
                                {ext}
                              </Badge>
                            ))}
                            <span className="self-center font-mono text-[11px] text-detail">
                              {MAX_FILE_LABEL}
                            </span>
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
                      className="h-33 resize-none bg-card text-[14px] leading-[1.55] transition-shadow duration-300 [transition-timing-function:var(--ease-smooth)] focus-visible:shadow-soft-lg"
                    />
                    <div className="flex items-center justify-between gap-3">
                      {/* The meter is the 20-character floor made visible —
                          "0 characters" alone never said how many were enough. */}
                      <span className="h-[3px] max-w-36 flex-1 overflow-hidden rounded-full bg-border/70">
                        <span
                          className={cn(
                            "block h-full origin-left rounded-full transition-all duration-500 [transition-timing-function:var(--ease-smooth)]",
                            chars >= 20
                              ? "bg-gradient-to-r from-brand-1 to-brand-5"
                              : "bg-detail/40",
                          )}
                          style={{ width: `${briefProgress * 100}%` }}
                        />
                      </span>
                      <span className="font-mono text-[11.5px] text-detail tabular-nums">
                        {chars} characters
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="animate-rise shadow-soft-lg ring-foreground/8 transition-shadow duration-500 [transition-timing-function:var(--ease-smooth)] hover:shadow-lift"
                style={delay(140)}
              >
                <CardContent className="flex flex-col gap-4.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10.5px] tracking-[0.09em] text-detail uppercase">
                      <span className="text-foreground/45">02</span> · Deck
                      shape
                    </span>
                    <span
                      key={shape.id}
                      className="animate-rise font-mono text-[10.5px] text-detail"
                    >
                      {shape.label.toLowerCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {DECK_SHAPE_OPTIONS.map((opt) => {
                      const on = opt.id === deckShape;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setDeckShape(opt.id)}
                          className={cn(
                            "group relative flex flex-col gap-1.5 overflow-hidden rounded-lg border p-3 text-left transition-all duration-300 [transition-timing-function:var(--ease-smooth)]",
                            on
                              ? "-translate-y-0.5 border-foreground/70 bg-highlight/35 shadow-soft-lg"
                              : "border-border bg-card hover:-translate-y-0.5 hover:border-brand-4/45 hover:shadow-soft-lg",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand-1 to-brand-5 transition-transform duration-500 [transition-timing-function:var(--ease-smooth)]",
                              on ? "scale-x-100" : "scale-x-0",
                            )}
                          />
                          <span className="flex items-center justify-between gap-1.5">
                            <span className="text-[13.5px] font-semibold text-foreground">
                              {opt.label}
                            </span>
                            <span
                              className={cn(
                                "flex size-3.5 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                                on
                                  ? "bg-foreground text-background"
                                  : "bg-muted group-hover:bg-highlight",
                              )}
                            >
                              {on ? (
                                <Check
                                  className="animate-pop-check size-2.5"
                                  strokeWidth={3}
                                />
                              ) : null}
                            </span>
                          </span>
                          <span className="font-mono text-[10.5px] text-detail">
                            {opt.sections.length} slides
                          </span>
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
                      className="relative flex rounded-lg border border-border bg-card p-0.75"
                    >
                      {/* One pill that slides between the three slots, rather
                          than three backgrounds cross-fading — the travel is
                          what tells you the control is a single axis. */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0.75 left-0.75 rounded-md bg-accent shadow-soft transition-transform duration-[450ms] [transition-timing-function:var(--ease-spring)]"
                        style={{
                          width: "calc((100% - 0.375rem) / 3)",
                          transform: `translateX(${depthIndex * 100}%)`,
                        }}
                      />
                      {DEPTH_OPTIONS.map((opt) => {
                        const on = opt.id === depth;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setDepth(opt.id)}
                            className={cn(
                              "relative z-10 h-8 flex-1 rounded-md text-[12.5px] transition-colors duration-300",
                              on
                                ? "font-semibold text-accent-foreground"
                                : "text-body hover:text-foreground",
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

              <div
                className="animate-rise relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-xl bg-foreground px-5 py-4 shadow-soft-lg"
                style={delay(240)}
              >
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-[radial-gradient(520px_circle_at_88%_50%,rgba(252,153,71,0.20),transparent_70%)] transition-opacity duration-700",
                    canGenerate ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="relative flex min-w-0 flex-col gap-1">
                  <span className="text-[14px] font-semibold text-background">
                    {shape.label} · {slideCount} slides ·{" "}
                    {depthOption.label.toLowerCase()}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-background/60">
                    <span
                      className={cn(
                        "size-1.5 rounded-full transition-colors duration-300",
                        canGenerate ? "bg-brand-5" : "bg-background/30",
                      )}
                    />
                    {canGenerate
                      ? "Ready · Sonnet-drafted, editable slide by slide"
                      : "Attach a document or type 20+ characters"}
                  </span>
                </div>
                <div className="relative flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      id="model-landing"
                      className="flex h-11 min-w-32 items-center justify-between gap-1.5 rounded-lg border border-background/25 bg-transparent px-2.5 text-sm text-background transition-colors duration-300 hover:bg-background/10 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-background/70"
                    >
                      {MODEL_LABEL[model] ?? model}
                      <ChevronDownIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuRadioGroup
                        value={model}
                        onValueChange={(v) => v && setModel(v)}
                      >
                        {MODEL_OPTIONS.map((o) => (
                          <DropdownMenuRadioItem key={o.value} value={o.value}>
                            {o.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    size="lg"
                    disabled={!canGenerate}
                    onClick={() => void generate()}
                    className="group/gen h-11 gap-2 bg-background px-6 text-[14px] text-foreground hover:bg-background/90"
                  >
                    Generate deck
                    <ArrowRight className="size-4 transition-transform duration-300 [transition-timing-function:var(--ease-smooth)] group-hover/gen:translate-x-1" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </main>

        {!started ? (
          /* Sits outside <main> so the hero centres in the space above it and
             the strip stays pinned to the fold, rather than both fighting for
             the same flexible middle. Two tracks drifting apart; hovering
             anywhere in the strip pauses both, so a card that catches the eye
             can actually be read. */
          <div
            className={cn(
              "animate-rise mt-14 w-screen transition-opacity duration-250 ease-out",
              leaving ? "opacity-0" : "opacity-100",
            )}
            style={delay(1460)}
          >
            <div
              aria-hidden
              className="group/marquee flex flex-col gap-4 [-webkit-mask-image:linear-gradient(90deg,transparent_0,black_11%,black_89%,transparent_100%)] [mask-image:linear-gradient(90deg,transparent_0,black_11%,black_89%,transparent_100%)]"
            >
              <div className="overflow-hidden">
                <div className="animate-marquee flex w-max group-hover/marquee:[animation-play-state:paused]">
                  {ROW_A.map((s, i) => (
                    <MiniSlide key={`a-${i}`} {...s} />
                  ))}
                </div>
              </div>
              <div className="overflow-hidden opacity-65">
                <div className="animate-marquee-reverse flex w-max group-hover/marquee:[animation-play-state:paused]">
                  {ROW_B.map((s, i) => (
                    <MiniSlide key={`b-${i}`} {...s} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <footer
          className="animate-rise mt-9 flex items-center gap-3 font-mono text-[11px] text-detail"
          style={delay(1560)}
        >
          <span>Powered by Anthropic&rsquo;s Claude</span>
          <span className="h-3 w-px bg-border" />
          <span>Made by Josh Perry</span>
        </footer>
      </div>
    </div>
  );
}
