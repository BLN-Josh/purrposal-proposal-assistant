import { Fragment } from "react";
import type { ComparisonSlide } from "@/lib/slides/schema";
import { cn } from "@/lib/utils";
import {
  SlideSurface,
  SlideTitle,
  SlideBody,
  accentFor,
} from "./slide-primitives";

/** UND-06 — the option matrix: criteria down the left edge, 2–3 options
 * across. Exactly one option is `recommended` — normalised in
 * lib/slides/repair.ts, not by the schema, which cannot refine a member of a
 * discriminated union — and that column carries the accent all the way down
 * plus the `*Recommended` mark, so the verdict is legible at thumbnail size
 * without reading a cell.
 *
 * Built as one grid rather than per-column stacks so criterion rows stay on a
 * shared baseline when cell verdicts wrap to different line counts. */
export function ComparisonSlideBody({ slide }: { slide: ComparisonSlide }) {
  const accent = accentFor(slide.domain);
  const { criteria, options } = slide;

  return (
    <SlideSurface>
      <SlideTitle
        sectionLabel={slide.sectionLabel}
        assertion={slide.assertion}
        page={slide.page}
        domain={slide.domain}
      />
      <SlideBody>
        <div
          className="grid min-h-0 flex-1 gap-x-[0.6cqw]"
          style={{
            gridTemplateColumns: `1.35fr repeat(${options.length}, minmax(0, 1fr))`,
            gridTemplateRows: `auto repeat(${criteria.length}, minmax(0, 1fr))`,
          }}
        >
          {/* Header band — corner cell then one cell per option. */}
          <div className="flex items-end pr-[0.6cqw] pb-[0.7cqw]">
            <span className="font-mono text-[1cqw] tracking-[0.08em] text-slide-muted uppercase">
              Criteria
            </span>
          </div>
          {options.map((option, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center justify-end gap-[0.25cqw] rounded-t-[0.5cqw] px-[0.7cqw] py-[0.7cqw] text-center",
                option.recommended
                  ? cn(accent.fill, accent.onFill)
                  : "bg-slide-wash text-slide-ink",
              )}
            >
              <span className="text-[1.4cqw] leading-[1.2] font-semibold">
                {option.name}
              </span>
              {option.recommended ? (
                <span className="font-mono text-[0.95cqw] tracking-[0.07em] uppercase opacity-85">
                  *Recommended
                </span>
              ) : null}
            </div>
          ))}

          {/* One row per criterion; `cells` is index-aligned to `criteria`. */}
          {criteria.map((criterion, r) => (
            <Fragment key={r}>
              <div className="flex min-h-0 flex-col justify-center border-t border-slide-line py-[0.55cqw] pr-[0.7cqw]">
                <span className="text-[1.25cqw] leading-[1.25] font-semibold text-slide-ink">
                  {criterion.label}
                </span>
                {criterion.descriptor ? (
                  <span className="mt-[0.2cqw] text-[1cqw] leading-[1.25] text-slide-muted">
                    {criterion.descriptor}
                  </span>
                ) : null}
              </div>
              {options.map((option, c) => (
                <div
                  key={c}
                  className={cn(
                    "flex min-h-0 items-center justify-center overflow-hidden border-t border-slide-line px-[0.7cqw] py-[0.55cqw] text-center text-[1.15cqw] leading-[1.3] text-pretty",
                    option.recommended
                      ? cn(accent.tint, "font-medium text-slide-ink")
                      : "text-slide-body",
                  )}
                >
                  {option.cells[r]}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </SlideBody>
    </SlideSurface>
  );
}
