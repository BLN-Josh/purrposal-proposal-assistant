"use client";

import type { CSSProperties } from "react";
import { useAppStore } from "@/store/app-store";
import { SlideCardSkeleton } from "@/components/slide-card";
import { AmbientBackdrop } from "@/components/ambient-backdrop";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function GeneratingScreen() {
  const genLabel = useAppStore((s) => s.genLabel);

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-grain relative flex flex-1 flex-col items-center overflow-hidden px-6 py-14"
    >
      <AmbientBackdrop />

      <div className="animate-rise flex flex-col items-center gap-3">
        <span className="flex items-center gap-2.5">
          {/* Three beating dots rather than a spinner: a spinner says "busy",
              a sequence says "steps are completing". */}
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-pulse rounded-full bg-brand-4"
                style={{ animationDelay: `${i * 220}ms` }}
              />
            ))}
          </span>
          <span className="text-[14.5px] font-medium text-foreground">
            Drafting the proposal deck…
          </span>
        </span>

        <span
          key={genLabel}
          className="animate-rise font-mono text-[11.5px] text-detail"
        >
          {genLabel}
        </span>

        <span className="mt-1 h-[3px] w-56 overflow-hidden rounded-full bg-border/70">
          <span className="animate-track-sweep block h-full w-full origin-left rounded-full bg-gradient-to-r from-brand-1 to-brand-5" />
        </span>
      </div>

      <div className="mt-9 flex w-full max-w-190 flex-col gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-rise" style={delay(120 + i * 110)}>
            <SlideCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
