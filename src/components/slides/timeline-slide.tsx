import type { TimelineSlide } from "@/lib/slides/schema";
import { SlideSurface, SlideHeading } from "./slide-primitives";

export function TimelineSlideBody({ slide }: { slide: TimelineSlide }) {
  return (
    <SlideSurface>
      <SlideHeading title={slide.title} subtitle={slide.subtitle} />
      <div className="relative mt-[4cqw] grid grid-cols-4 gap-[1.4cqw]">
        <div className="absolute top-[1.1cqw] right-0 left-0 h-[0.16cqw] bg-border" />
        {slide.phases.map((p, i) => (
          <div key={i} className="relative flex flex-col gap-[1cqw]">
            <span className="flex size-[2.2cqw] items-center justify-center rounded-full bg-primary font-mono text-[1.15cqw] text-primary-foreground">
              {p.n}
            </span>
            <span className="text-[1.9cqw] font-semibold text-foreground">{p.name}</span>
            <span className="font-mono text-[1.35cqw] text-foreground">{p.weeks}</span>
            <span className="text-[1.4cqw] leading-[1.4] text-body text-pretty">{p.detail}</span>
          </div>
        ))}
      </div>
    </SlideSurface>
  );
}
