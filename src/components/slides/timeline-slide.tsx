import type { TimelineSlide } from "@/lib/slides/schema";
import { cn } from "@/lib/utils";
import {
  SlideSurface,
  SlideTitle,
  SlideBody,
  SlideFootnote,
  accentFor,
  brandStep,
} from "./slide-primitives";

/** EXE-02 — the phase ribbon. 3–5 phases sit on one connector rule, each
 * numbered from its index (the schema no longer carries an explicit `n`, which
 * is the right call: the number is positional, so storing it only creates a
 * way for it to disagree with the order). */
export function TimelineSlideBody({ slide }: { slide: TimelineSlide }) {
  const accent = accentFor(slide.domain);
  return (
    <SlideSurface>
      <SlideTitle
        sectionLabel={slide.sectionLabel}
        assertion={slide.assertion}
        page={slide.page}
        domain={slide.domain}
      />
      <SlideBody className="justify-center">
        <div className="relative flex gap-[1.4cqw]">
          <div className="absolute top-[1.1cqw] right-0 left-0 h-[0.16cqw] bg-slide-line" />
          {slide.phases.map((phase, i) => (
            <div
              key={i}
              className="relative flex min-w-0 flex-1 flex-col gap-[0.9cqw]"
            >
              {/* Each phase steps along the brand ramp so the row reads as
                  progression — the same walk the exported chevron ribbon
                  makes, so preview and .pptx tell the same story. */}
              <span
                className={cn(
                  "flex size-[2.2cqw] items-center justify-center rounded-full font-mono text-[1.15cqw]",
                  brandStep(i).fill,
                  brandStep(i).onFill,
                )}
              >
                {i + 1}
              </span>
              <span className="text-[1.75cqw] leading-[1.2] font-semibold text-balance text-slide-ink">
                {phase.name}
              </span>
              <span
                className={cn(
                  "font-mono text-[1.3cqw] tracking-[0.06em] uppercase",
                  accent.text,
                )}
              >
                {phase.weeks}
              </span>
              <span className="text-[1.3cqw] leading-[1.4] text-pretty text-slide-body">
                {phase.detail}
              </span>
            </div>
          ))}
        </div>
      </SlideBody>
      {slide.footnote ? <SlideFootnote>{slide.footnote}</SlideFootnote> : null}
    </SlideSurface>
  );
}
