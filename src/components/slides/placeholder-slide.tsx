import { Sparkles } from "lucide-react";
import type { PlaceholderSlide } from "@/lib/slides/schema";
import { SlideSurface } from "./slide-primitives";

export function PlaceholderSlideBody({ slide }: { slide: PlaceholderSlide }) {
  return (
    <SlideSurface className="items-center justify-center">
      <div className="flex w-[74cqw] flex-col items-center gap-[1.6cqw] rounded-[1.4cqw] border-[0.25cqw] border-dashed border-brand-1/35 bg-brand-1/4 px-[5cqw] py-[4.5cqw] text-center">
        <span className="flex size-[5.4cqw] items-center justify-center rounded-full bg-brand-1/12 text-brand-1">
          <Sparkles className="size-[2.8cqw]" />
        </span>
        <div className="font-mono text-[1.3cqw] tracking-[0.14em] text-brand-1 uppercase">
          Empty slide
        </div>
        <div className="text-[1.9cqw] leading-[1.4] text-pretty text-slide-body">
          {slide.hint ??
            "Describe what this slide should say in the composer. The layout is chosen for you."}
        </div>
      </div>
    </SlideSurface>
  );
}
