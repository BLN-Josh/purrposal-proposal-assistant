import type { TableSlide } from "@/lib/slides/schema";
import { SlideSurface, SlideHeading } from "./slide-primitives";

export function TableSlideBody({ slide }: { slide: TableSlide }) {
  return (
    <SlideSurface>
      <SlideHeading title={slide.title} subtitle={slide.subtitle} />
      <div className="mt-[2.2cqw] grid grid-cols-[1.1fr_1.6fr_1.6fr_1.2fr] gap-x-[1.4cqw] gap-y-[0.8cqw] font-mono text-[1.2cqw] tracking-[0.07em] text-foreground uppercase">
        <div>Feature</div>
        <div>Description</div>
        <div>Details</div>
        <div>Action support</div>
      </div>
      <div className="mt-[1cqw] flex flex-col">
        {slide.rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[1.1fr_1.6fr_1.6fr_1.2fr] gap-x-[1.4cqw] border-t border-border py-[1.15cqw] text-[1.45cqw] leading-[1.4] text-body"
          >
            <div className="font-semibold text-foreground">{r.c1}</div>
            <div>{r.c2}</div>
            <div>{r.c3}</div>
            <div className="font-mono text-[1.3cqw] text-detail">{r.c4}</div>
          </div>
        ))}
      </div>
    </SlideSurface>
  );
}
