import type { SummarySlide } from "@/lib/slides/schema";
import { cn } from "@/lib/utils";
import {
  SlideSurface,
  SlideTitle,
  SlideBody,
  accentFor,
} from "./slide-primitives";

/** EXEC-01 — a 4–5 row label stack. Each row is a tinted label cell on the
 * left and either a bullet list or, when the row carries `options`, the
 * spec's split variant: two side-by-side option boxes. Rows share the body
 * height equally so 4 and 5 row decks stay on the same baseline. */
export function SummarySlideBody({ slide }: { slide: SummarySlide }) {
  const accent = accentFor(slide.domain);
  return (
    <SlideSurface>
      <SlideTitle
        sectionLabel={slide.sectionLabel}
        assertion={slide.assertion}
        page={slide.page}
        domain={slide.domain}
      />
      <SlideBody className="gap-[0.7cqw]">
        {slide.rows.map((row, i) => (
          <div key={i} className="flex min-h-0 flex-1 gap-[1.1cqw]">
            {/* Solid accent block, white type — the row label is the one
                element that reads as a tab down the left edge of the slide. */}
            <div
              className={cn(
                "flex w-[15cqw] shrink-0 items-center px-[0.9cqw] py-[0.6cqw] text-[1.3cqw] leading-[1.25]",
                accent.fill,
                accent.onFill,
              )}
            >
              {row.label}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden border border-slide-line bg-slide px-[1cqw] py-[0.6cqw]">
              {row.options ? (
                <div className="grid grid-cols-2 gap-[1.2cqw]">
                  {row.options.map((option, j) => (
                    <div key={j} className="min-w-0">
                      <div className="text-[1.2cqw] leading-[1.2] font-semibold text-slide-ink">
                        {option.heading}
                      </div>
                      <ul className="mt-[0.45cqw] flex flex-col gap-[0.25cqw]">
                        {option.bullets.map((b, k) => (
                          <li
                            key={k}
                            className="flex gap-[0.55cqw] text-[1.15cqw] leading-[1.3] text-pretty text-slide-body"
                          >
                            <span
                              className={cn(
                                "mt-[0.5cqw] size-[0.3cqw] shrink-0 rounded-full",
                                accent.rule,
                              )}
                            />
                            <span className="min-w-0">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="flex flex-col gap-[0.3cqw]">
                  {row.bullets.map((b, j) => (
                    <li
                      key={j}
                      className="flex gap-[0.7cqw] text-[1.3cqw] leading-[1.3] text-pretty text-slide-body"
                    >
                      <span
                        className={cn(
                          "mt-[0.55cqw] size-[0.34cqw] shrink-0 rounded-full",
                          accent.rule,
                        )}
                      />
                      <span className="min-w-0">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </SlideBody>
    </SlideSurface>
  );
}
