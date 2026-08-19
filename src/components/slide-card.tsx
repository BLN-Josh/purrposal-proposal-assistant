"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Slide } from "@/lib/slides/schema";
import { SlideRenderer } from "@/components/slides/slide-renderer";

interface SlideCardProps {
  slide: Slide;
  index: number;
  selected: boolean;
  flashing: boolean;
  errored: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function SlideCard({
  slide,
  index,
  selected,
  flashing,
  errored,
  canMoveUp,
  canMoveDown,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SlideCardProps) {
  const draft = slide.kind === "placeholder";

  return (
    <div id={`slide-${slide.id}`} className="flex items-center gap-1.5 scroll-mt-6">
      <div className="group relative min-w-0 flex-1">
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
            selected
              ? "border-brand-1/50"
              : "border-slide-line/60 hover:border-brand-1/30",
          )}
        >
          <div
            className={cn(
              "flex w-10 shrink-0 flex-col items-center gap-1.75 pt-3",
              draft ? "bg-brand-1/45" : "bg-brand-1",
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
                <div className="pointer-events-none absolute inset-0 animate-flash-in bg-brand-1/25" />
              ) : null}
            </div>
          )}
        </div>

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

        {selected ? (
          <div className="pointer-events-none absolute -inset-1 animate-ring-in rounded-xl border-[3px] border-card-foreground transition-colors duration-150" />
        ) : null}
        {errored ? (
          <div className="pointer-events-none absolute -inset-1 animate-ring-in rounded-xl border-[3px] border-destructive shadow-[0_0_0_6px_rgba(220,38,38,0.10)]" />
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        <button
          type="button"
          aria-label={`Move slide ${index + 1} up`}
          title="Move up"
          disabled={!canMoveUp}
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          className="flex size-6.5 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-detail shadow-soft transition-all duration-150 ease-out hover:scale-110 hover:border-brand-1 hover:bg-brand-1 hover:text-white focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronUp className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Move slide ${index + 1} down`}
          title="Move down"
          disabled={!canMoveDown}
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          className="flex size-6.5 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-detail shadow-soft transition-all duration-150 ease-out hover:scale-110 hover:border-brand-1 hover:bg-brand-1 hover:text-white focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronDown className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function SlideCardSkeleton() {
  return (
    <div className="flex overflow-hidden rounded-xl border border-slide-line/60 bg-slide shadow-soft">
      <div className="w-10 shrink-0 bg-primary/50" />
      <div className="flex aspect-video flex-1 animate-shimmer flex-col gap-4 bg-[linear-gradient(100deg,var(--slide)_20%,var(--slide-wash)_40%,var(--slide)_60%)] p-8">
        <div className="h-6.5 w-[52%] rounded-md bg-slide-line/60" />
        <div className="h-3.5 w-[34%] rounded-md bg-slide-line/40" />
        <div className="h-3 w-[78%] rounded-md bg-slide-line/40" />
        <div className="h-3 w-[70%] rounded-md bg-slide-line/40" />
        <div className="h-3 w-[62%] rounded-md bg-slide-line/40" />
      </div>
    </div>
  );
}
