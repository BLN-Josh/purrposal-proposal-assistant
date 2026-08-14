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
 * element from the design brief: a brand-dark index tab on the left edge,
 * numbered in Plex Mono. Lifts slightly on hover so the whole card reads
 * as one clickable unit, not just a passive preview. */
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
          "flex cursor-pointer overflow-hidden rounded-xl border bg-card shadow-soft transition-all duration-150 ease-out",
          "hover:-translate-y-0.5 hover:shadow-soft-lg",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
          selected ? "border-ring/40" : "border-border hover:border-ring/25"
        )}
      >
        <div className="flex w-10 shrink-0 flex-col items-center gap-1.75 bg-primary pt-3">
          <span className="font-mono text-[12.5px] font-medium text-primary-foreground transition-colors group-hover:text-highlight">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="h-px w-3.5 bg-primary-foreground/45" />
          {slide.revised ? (
            <span title="Revised" className="size-1.5 rounded-full bg-highlight" />
          ) : null}
        </div>

        <div
          data-slide-surface={slide.id}
          className="@container relative aspect-video min-w-0 flex-1 overflow-hidden bg-card"
        >
          <SlideRenderer slide={slide} />
          {flashing ? (
            <div className="animate-flash-in pointer-events-none absolute inset-0 bg-highlight" />
          ) : null}
        </div>
      </div>

      {selected ? (
        <div className="animate-ring-in pointer-events-none absolute -inset-0.75 rounded-[15px] border-2 border-ring" />
      ) : null}
      {errored ? (
        <div className="animate-ring-in pointer-events-none absolute -inset-0.75 rounded-[15px] border-2 border-destructive" />
      ) : null}
    </div>
  );
}

export function SlideCardSkeleton() {
  return (
    <div className="flex overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div className="w-10 shrink-0 bg-highlight/60" />
      <div className="animate-shimmer flex aspect-video flex-1 flex-col gap-4 bg-[linear-gradient(100deg,var(--card)_20%,var(--muted)_40%,var(--card)_60%)] p-8">
        <div className="h-6.5 w-[52%] rounded-md bg-border/70" />
        <div className="h-3.5 w-[34%] rounded-md bg-border/50" />
        <div className="h-3 w-[78%] rounded-md bg-border/50" />
        <div className="h-3 w-[70%] rounded-md bg-border/50" />
        <div className="h-3 w-[62%] rounded-md bg-border/50" />
      </div>
    </div>
  );
}
