import type { CommercialSlide } from "@/lib/slides/schema";
import { SlideSurface, SlideHeading } from "./slide-primitives";

export function CommercialSlideBody({ slide }: { slide: CommercialSlide }) {
  return (
    <SlideSurface>
      <SlideHeading title={slide.title} subtitle={slide.subtitle} />
      <div className="mt-[2.4cqw] flex flex-col">
        {slide.rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[1.7fr_0.9fr_0.9fr] gap-[1.4cqw] border-t border-border py-[1.25cqw] text-[1.6cqw] text-body"
          >
            <div className="text-foreground">{r.c1}</div>
            <div className="text-right font-mono text-detail">{r.c2}</div>
            <div className="text-right font-mono">{r.c3}</div>
          </div>
        ))}
        <div className="grid grid-cols-[1.7fr_0.9fr_0.9fr] gap-[1.4cqw] border-t-[0.2cqw] border-foreground py-[1.4cqw] text-[1.85cqw] font-semibold text-foreground">
          <div>{slide.totalLabel}</div>
          <div />
          <div className="text-right font-mono">{slide.total}</div>
        </div>
        <div className="mt-[1.2cqw] font-mono text-[1.25cqw] text-detail">{slide.footnote}</div>
      </div>
    </SlideSurface>
  );
}
