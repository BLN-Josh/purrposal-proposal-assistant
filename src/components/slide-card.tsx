"use client";

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
 */
export function SlideCard({ slide, index, selected, flashing, errored, onSelect }: SlideCardProps) {
  return (
    <div className="group relative">
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
          selected ? "border-brand-1/50" : "border-slide-line/60 hover:border-brand-1/30"
        )}
      >
        <div className="flex w-10 shrink-0 flex-col items-center gap-1.75 bg-brand-1 pt-3">
          <span className="font-mono text-[12.5px] font-medium text-white">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="h-px w-3.5 bg-white/45" />
          {slide.revised ? (
            <span title="Revised" className="size-1.5 rounded-full bg-white" />
          ) : null}
        </div>

        <div
          data-slide-surface={slide.id}
          className="@container relative aspect-video min-w-0 flex-1 overflow-hidden bg-slide"
        >
          <SlideRenderer slide={slide} page={index + 1} />
          {flashing ? (
            <div className="animate-flash-in pointer-events-none absolute inset-0 bg-brand-1/25" />
          ) : null}
        </div>
      </div>

      {selected ? (
        <div className="animate-ring-in pointer-events-none absolute -inset-1 rounded-xl border-[3px] border-card-foreground transition-colors duration-150" />
      ) : null}
      {errored ? (
        <div className="animate-ring-in pointer-events-none absolute -inset-1 rounded-xl border-[3px] border-primary" />
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
