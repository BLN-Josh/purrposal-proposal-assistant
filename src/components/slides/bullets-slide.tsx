import type { BulletsSlide } from "@/lib/slides/schema";
import { cn } from "@/lib/utils";
import { SlideSurface, SlideTitle, SlideBody, accentFor } from "./slide-primitives";

/** UND-05 — one layout, two densities. A row with a `label` becomes the
 * two-column pain-point row (tinted label cell + grey description); a row
 * without one becomes a single full-width tinted band. `conclusion` closes the
 * slide as an inverted full-width banner. */
export function BulletsSlideBody({ slide }: { slide: BulletsSlide }) {
  const accent = accentFor(slide.domain);
  return (
    <SlideSurface>
      <SlideTitle
        sectionLabel={slide.sectionLabel}
        assertion={slide.assertion}
        page={slide.page}
        domain={slide.domain}
      />
      <SlideBody className="gap-[0.9cqw]">
        {slide.intro ? (
          <p className="shrink-0 text-[1.5cqw] leading-[1.4] text-pretty text-slide-body">{slide.intro}</p>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-[0.6cqw]">
          {slide.rows.map((row, i) =>
            row.label ? (
              <div key={i} className="flex min-h-0 flex-1 gap-[0.6cqw]">
                {/* Tinted label with ink type, not solid-with-white: the spec
                    reserves the solid accent block for EXEC-01 and gives the
                    pain-point row a light wash, which keeps the two layouts
                    distinguishable when you flip past them. */}
                <div
                  className={cn(
                    "flex w-[19cqw] shrink-0 items-center rounded-[0.5cqw] px-[1cqw] py-[0.7cqw] text-[1.35cqw] leading-[1.25] font-semibold text-slide-ink",
                    accent.tintStrong
                  )}
                >
                  {row.label}
                </div>
                <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-[0.5cqw] bg-slide-wash px-[1cqw] py-[0.7cqw] text-[1.3cqw] leading-[1.35] text-pretty text-slide-body">
                  {row.text}
                </div>
              </div>
            ) : (
              <div
                key={i}
                className={cn(
                  "flex min-h-0 flex-1 items-center overflow-hidden rounded-[0.5cqw] px-[1.1cqw] py-[0.7cqw] text-[1.4cqw] leading-[1.35] text-pretty text-slide-ink",
                  accent.tint
                )}
              >
                {row.text}
              </div>
            )
          )}
        </div>

        {slide.conclusion ? (
          <div className="shrink-0 rounded-[0.5cqw] bg-slide-ink px-[1.3cqw] py-[0.95cqw] text-[1.45cqw] leading-[1.35] font-medium text-pretty text-white">
            {slide.conclusion}
          </div>
        ) : null}
      </SlideBody>
    </SlideSurface>
  );
}
