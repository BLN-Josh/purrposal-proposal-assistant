"use client";

import { Loader2 } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { SlideCardSkeleton } from "@/components/slide-card";

export function GeneratingScreen() {
  const genLabel = useAppStore((s) => s.genLabel);

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-up flex flex-1 flex-col items-center overflow-hidden px-6 py-14"
    >
      <div className="flex items-center gap-2.5">
        <Loader2 className="size-3.75 animate-spin text-foreground" />
        <span className="text-[14.5px] font-medium text-foreground">
          Drafting the proposal deck…
        </span>
      </div>
      <div className="mt-2 font-mono text-[11.5px] text-detail">{genLabel}</div>
      <div className="mt-8 flex w-full max-w-190 flex-col gap-5">
        {[0, 1, 2].map((i) => (
          <SlideCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
