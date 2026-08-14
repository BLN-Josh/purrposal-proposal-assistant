import type { TitleSlide } from "@/lib/slides/schema";
import { SlideSurface } from "./slide-primitives";

export function TitleSlideBody({ slide }: { slide: TitleSlide }) {
  return (
    <SlideSurface tone="dark" className="justify-center p-[6cqw]">
      <div className="font-mono text-[1.5cqw] tracking-[0.16em] text-highlight uppercase">
        {slide.eyebrow}
      </div>
      <div className="mt-[2.4cqw] text-[5cqw] leading-[1.08] font-semibold text-primary-foreground text-pretty">
        {slide.title}
      </div>
      <div className="mt-[1.8cqw] text-[2.2cqw] text-primary-foreground/70">
        {slide.subtitle}
      </div>
      <div className="mt-[3.6cqw] h-[0.32cqw] w-[8cqw] bg-[#C9B385]" />
      <div className="mt-[2.4cqw] font-mono text-[1.4cqw] text-primary-foreground/55">
        {slide.footer}
      </div>
    </SlideSurface>
  );
}
