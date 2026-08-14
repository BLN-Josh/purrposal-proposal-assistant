import type { BulletsSlide } from "@/lib/slides/schema";
import { SlideSurface, SlideHeading } from "./slide-primitives";

export function BulletsSlideBody({ slide }: { slide: BulletsSlide }) {
  return (
    <SlideSurface>
      <SlideHeading title={slide.title} subtitle={slide.subtitle} />
      <div className="mt-[2.4cqw] h-[0.2cqw] w-[6cqw] bg-foreground" />
      <div className="mt-[2.4cqw] flex flex-col gap-[1.5cqw]">
        {slide.bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-[1.6cqw]">
            <span className="mt-[0.75cqw] size-[0.75cqw] shrink-0 rounded-full bg-foreground" />
            <span className="text-[1.95cqw] leading-[1.45] text-body text-pretty">{b.text}</span>
          </div>
        ))}
      </div>
    </SlideSurface>
  );
}
