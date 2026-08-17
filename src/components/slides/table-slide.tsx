import type { TableSlide } from "@/lib/slides/schema";
import { cn } from "@/lib/utils";
import {
  SlideSurface,
  SlideTitle,
  SlideBody,
  accentFor,
} from "./slide-primitives";

const COLS = "grid-cols-[1.1fr_1.6fr_1.6fr_1.2fr]";

/** SOL-08 — feature detail table. `group` is the spec's vertical band label:
 * a tinted rail down the left edge that names the capability cluster the rows
 * belong to, so consecutive SOL-08 slides read as one banded run. */
export function TableSlideBody({ slide }: { slide: TableSlide }) {
  const accent = accentFor(slide.domain);
  return (
    <SlideSurface>
      <SlideTitle
        sectionLabel={slide.sectionLabel}
        assertion={slide.assertion}
        page={slide.page}
        domain={slide.domain}
      />
      <SlideBody className="flex-row gap-[1cqw]">
        {slide.group ? (
          <div
            className={cn(
              "flex w-[2.6cqw] shrink-0 items-center justify-center",
              accent.fill,
            )}
          >
            <span
              className={cn(
                "rotate-180 text-[1.15cqw] font-semibold tracking-[0.08em] whitespace-nowrap uppercase [writing-mode:vertical-rl]",
                accent.onFill,
              )}
            >
              {slide.group}
            </span>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className={cn(
              "grid shrink-0 gap-x-[1.2cqw] pb-[0.7cqw] font-mono text-[1.1cqw] tracking-[0.07em] uppercase",
              COLS,
              accent.text,
            )}
          >
            <div>Feature</div>
            <div>Description</div>
            <div>Details</div>
            <div>Action support</div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {slide.rows.map((row, i) => (
              <div
                key={i}
                className={cn(
                  "grid min-h-0 flex-1 items-start gap-x-[1.2cqw] overflow-hidden border-t border-slide-line py-[0.75cqw] text-[1.25cqw] leading-[1.35] text-slide-body",
                  COLS,
                )}
              >
                <div className="font-semibold text-slide-ink">
                  {row.feature}
                </div>
                <div className="text-pretty">{row.description}</div>
                <div className="text-pretty">{row.details}</div>
                <div className="font-mono text-[1.1cqw] leading-[1.35] text-slide-muted">
                  {row.actionSupport}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SlideBody>
    </SlideSurface>
  );
}
