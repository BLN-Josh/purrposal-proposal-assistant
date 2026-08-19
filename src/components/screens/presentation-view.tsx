"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Slide } from "@/lib/slides/schema";
import { SlideRenderer } from "@/components/slides/slide-renderer";
import { cn } from "@/lib/utils";

/**
 * Full-viewport slide-by-slide view for actually presenting the deck —
 * distinct from the editable, scrollable grid in the workspace behind it.
 * Slide changes are plain state swaps: no fade or slide transition, so a
 * click always lands on the next slide immediately.
 */
export function PresentationView({
  slides,
  onClose,
}: {
  slides: Slide[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);

  const atStart = index === 0;
  const atEnd = index === slides.length - 1;
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(slides.length - 1, i + 1));

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, onClose]);

  // Exiting fullscreen by any means — Esc, the browser's own fullscreen
  // control, an OS gesture — ends presentation mode with it. There's no
  // useful "presenting but windowed" state to fall back into.
  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) onClose();
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [onClose]);

  const slide = slides[index];
  if (!slide) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <div
        className="@container relative overflow-hidden bg-slide shadow-2xl"
        style={{
          width: "min(100vw, calc(100vh * 16 / 9))",
          height: "min(100vh, calc(100vw * 9 / 16))",
        }}
      >
        <SlideRenderer slide={slide} page={index + 1} />
      </div>

      <button
        type="button"
        aria-label="Exit presentation"
        title="Exit presentation (Esc)"
        onClick={onClose}
        className="absolute top-5 right-5 flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur transition-colors hover:bg-white/20 hover:text-white focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none"
      >
        <X className="size-4.5" />
      </button>

      <button
        type="button"
        aria-label="Previous slide"
        title="Previous slide"
        disabled={atStart}
        onClick={goPrev}
        className={cn(
          "absolute top-1/2 left-5 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur transition-colors",
          "hover:bg-white/20 hover:text-white focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none",
          "disabled:pointer-events-none disabled:opacity-25",
        )}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Next slide"
        title="Next slide"
        disabled={atEnd}
        onClick={goNext}
        className={cn(
          "absolute top-1/2 right-5 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur transition-colors",
          "hover:bg-white/20 hover:text-white focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none",
          "disabled:pointer-events-none disabled:opacity-25",
        )}
      >
        <ChevronRight className="size-5" />
      </button>

      <span className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-[0.08em] text-white/50 tabular-nums">
        {String(index + 1).padStart(2, "0")} /{" "}
        {String(slides.length).padStart(2, "0")}
      </span>
    </div>
  );
}
