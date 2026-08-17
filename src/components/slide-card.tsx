"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Slide } from "@/lib/slides/schema";
import { SlideRenderer } from "@/components/slides/slide-renderer";

interface SlideCardProps {
  slide: Slide;
  index: number;
  selected: boolean;
  flashing: boolean;
  errored: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

/** One slide in the preview grid — the "tabbed dossier edge" signature
 * element from the design brief: an index tab on the left edge, numbered in
 * Plex Mono. Lifts slightly on hover so the whole card reads as one
 * clickable unit, not just a passive preview.
 *
 * COLOUR: the tab is app chrome and takes the brand red; everything from
 * `data-slide-surface` inward is the *deck*, so it is white and must stay
 * that way. That element is also what the PDF exporter captures, so a
 * non-white fill here would print behind every exported page — this is
 * where a cream `bg-card` used to leak the editor's warm palette into the
 * deck. Do not put an editor-shell token on it.
 *
 * An empty slide deliberately omits `data-slide-surface`: that attribute is
 * the PDF exporter's selector, so leaving it off is what keeps a draft out
 * of the printed deck. Same rule as build-pptx skipping the kind.
 */
export function SlideCard({
  slide,
  index,
  selected,
  flashing,
  errored,
  onSelect,
  onRemove,
}: SlideCardProps) {
  const draft = slide.kind === "placeholder";

  return (
    <div id={`slide-${slide.id}`} className="group relative scroll-mt-6">
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          "flex cursor-pointer overflow-hidden rounded-xl border bg-slide shadow-soft transition-all duration-150 ease-out",
          "hover:-translate-y-0.5 hover:shadow-soft-lg",
          "focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
          draft && "border-dashed",
          selected ? "border-brand-1/50" : "border-slide-line/60 hover:border-brand-1/30"
        )}
      >
        <div
          className={cn(
            "flex w-10 shrink-0 flex-col items-center gap-1.75 pt-3",
            draft ? "bg-brand-1/45" : "bg-brand-1"
          )}
        >
          <span className="font-mono text-[12.5px] font-medium text-white">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="h-px w-3.5 bg-white/45" />
          {slide.revised ? (
            <span title="Revised" className="size-1.5 rounded-full bg-white" />
          ) : null}
        </div>

        {draft ? (
          <div className="@container relative aspect-video min-w-0 flex-1 overflow-hidden bg-slide">
            <SlideRenderer slide={slide} page={index + 1} />
          </div>
        ) : (
          <div
            data-slide-surface={slide.id}
            className="@container relative aspect-video min-w-0 flex-1 overflow-hidden bg-slide"
          >
            <SlideRenderer slide={slide} page={index + 1} />
            {flashing ? (
              <div className="animate-flash-in pointer-events-none absolute inset-0 bg-brand-1/25" />
            ) : null}
          </div>
        )}
      </div>

      {/* Removal is a card-level action, so it hangs off the card's corner
          rather than sitting inside the slide surface — nothing that isn't
          part of the deck may render inside `data-slide-surface`, or it
          would be captured into the exported PDF. */}
      <button
        type="button"
        aria-label={`Remove slide ${index + 1}`}
        title="Remove this slide"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-2 -right-2 z-20 flex size-6.5 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-detail opacity-0 shadow-soft transition-all duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100 hover:scale-110 hover:border-destructive hover:bg-destructive hover:text-white focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
      >
        <X className="size-3.25" />
      </button>

      {/* Selection and failure must not look alike. `card-foreground` and
          `primary` are both #2f1000, so these two rings used to render as the
          same espresso outline — a failed edit was indistinguishable from a
          slide the user had merely clicked. Failure now takes the destructive
          red it shares with the toast and the error text in the log. */}
      {selected ? (
        <div className="animate-ring-in pointer-events-none absolute -inset-1 rounded-xl border-[3px] border-card-foreground transition-colors duration-150" />
      ) : null}
      {errored ? (
        <div className="animate-ring-in pointer-events-none absolute -inset-1 rounded-xl border-[3px] border-destructive shadow-[0_0_0_6px_rgba(220,38,38,0.10)]" />
      ) : null}
    </div>
  );
}

export function SlideCardSkeleton() {
  return (
    <div className="flex overflow-hidden rounded-xl border border-slide-line/60 bg-slide shadow-soft">
      <div className="w-10 shrink-0 bg-primary/50" />
      <div className="animate-shimmer flex aspect-video flex-1 flex-col gap-4 bg-[linear-gradient(100deg,var(--slide)_20%,var(--slide-wash)_40%,var(--slide)_60%)] p-8">
        <div className="h-6.5 w-[52%] rounded-md bg-slide-line/60" />
        <div className="h-3.5 w-[34%] rounded-md bg-slide-line/40" />
        <div className="h-3 w-[78%] rounded-md bg-slide-line/40" />
        <div className="h-3 w-[70%] rounded-md bg-slide-line/40" />
        <div className="h-3 w-[62%] rounded-md bg-slide-line/40" />
      </div>
    </div>
  );
}
