"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The insertion affordance that sits in the gap between two slide cards.
 *
 * It occupies the gap rather than adding to it: the row is exactly as tall
 * as the grid's old `gap-5.5`, and the grid now runs `gap-0`, so turning
 * every gap into a target changed no spacing. That matters because the deck
 * preview is also what the PDF exporter walks — the cards have to stay
 * exactly where they were.
 *
 * Visible-on-hover, but never *only* on hover: the button stays in the tab
 * order and reveals itself on focus, so the whole feature is reachable from
 * the keyboard. The hairline rule appears with it to show where the slide
 * will land.
 */
export function AddSlideButton({
  onAdd,
  label,
  className,
}: {
  onAdd: () => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("group/add relative flex h-5.5 items-center justify-center", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-brand-1/25 opacity-0 transition-opacity duration-150 group-focus-within/add:opacity-100 group-hover/add:opacity-100"
      />
      <button
        type="button"
        onClick={onAdd}
        aria-label={label}
        title={label}
        className={cn(
          "relative z-10 flex size-6 cursor-pointer items-center justify-center rounded-full",
          "border border-border bg-card text-detail shadow-soft",
          "opacity-0 transition-all duration-150 ease-out",
          "group-focus-within/add:opacity-100 group-hover/add:opacity-100",
          "hover:scale-110 hover:border-brand-1 hover:bg-brand-1 hover:text-white",
          "focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        )}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
