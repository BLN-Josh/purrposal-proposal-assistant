import type { ComparisonSlide } from "@/lib/slides/schema";
import { SlideSurface, SlideHeading } from "./slide-primitives";

export function ComparisonSlideBody({ slide }: { slide: ComparisonSlide }) {
  return (
    <SlideSurface>
      <SlideHeading title={slide.title} subtitle={slide.subtitle} />
      <div className="mt-[2.6cqw] grid flex-1 grid-cols-3 gap-[1.6cqw]">
        {slide.cols.map((c, i) => (
          <div
            key={i}
            className={
              "flex flex-col gap-[1cqw] rounded-[1cqw] border p-[1.8cqw] transition-colors " +
              (c.recommended ? "border-ring/40 bg-highlight/25" : "border-border bg-card")
            }
          >
            <div className="flex min-h-[2cqw] items-center justify-between gap-[0.8cqw]">
              <span className="text-[1.85cqw] font-semibold text-foreground">{c.name}</span>
              {c.recommended ? (
                <span className="rounded-full bg-highlight px-[0.7cqw] py-[0.3cqw] font-mono text-[1.1cqw] text-foreground">
                  PICK
                </span>
              ) : null}
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between text-[1.4cqw] text-detail">
              <span>Cost</span>
              <span className="font-mono text-body">{c.cost}</span>
            </div>
            <div className="flex justify-between text-[1.4cqw] text-detail">
              <span>Time</span>
              <span className="font-mono text-body">{c.time}</span>
            </div>
            <div className="text-[1.4cqw] leading-[1.4] text-body text-pretty">{c.fit}</div>
          </div>
        ))}
      </div>
    </SlideSurface>
  );
}
