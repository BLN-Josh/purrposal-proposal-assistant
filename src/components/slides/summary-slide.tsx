import type { SummarySlide } from "@/lib/slides/schema";
import { SlideSurface, SlideHeading } from "./slide-primitives";

export function SummarySlideBody({ slide }: { slide: SummarySlide }) {
  return (
    <SlideSurface>
      <SlideHeading title={slide.title} subtitle={slide.subtitle} />
      <div className="mt-[2.6cqw] flex flex-col gap-[1.5cqw]">
        {slide.rows.map((r, i) => (
          <div key={i} className="flex gap-[2cqw] border-t border-border pt-[1.5cqw]">
            <div className="w-[16cqw] shrink-0 font-mono text-[1.4cqw] tracking-[0.08em] text-foreground uppercase">
              {r.label}
            </div>
            <div className="flex-1 text-[1.85cqw] leading-[1.45] text-body text-pretty">
              {r.text}
            </div>
          </div>
        ))}
      </div>
    </SlideSurface>
  );
}
