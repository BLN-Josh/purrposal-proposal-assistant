import type { TeamSlide } from "@/lib/slides/schema";
import { SlideSurface, SlideHeading } from "./slide-primitives";

export function TeamSlideBody({ slide }: { slide: TeamSlide }) {
  return (
    <SlideSurface tone="dark">
      <SlideHeading title={slide.title} subtitle={slide.subtitle} tone="dark" />
      <div className="mt-[3cqw] grid grid-cols-2 gap-x-[3cqw] gap-y-[2cqw]">
        {slide.people.map((p, i) => (
          <div key={i} className="flex items-start gap-[1.6cqw]">
            <span className="flex size-[4.4cqw] shrink-0 items-center justify-center rounded-full bg-[#C9B385] text-[1.6cqw] font-semibold text-primary">
              {p.initials}
            </span>
            <span className="flex min-w-0 flex-col gap-[0.4cqw]">
              <span className="text-[1.9cqw] font-semibold text-primary-foreground">{p.name}</span>
              <span className="text-[1.5cqw] text-highlight">{p.role}</span>
              <span className="font-mono text-[1.3cqw] text-primary-foreground/55">{p.yrs}</span>
            </span>
          </div>
        ))}
      </div>
    </SlideSurface>
  );
}
