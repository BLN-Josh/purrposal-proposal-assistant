import type { ValueChainSlide } from "@/lib/slides/schema";
import { cn } from "@/lib/utils";
import {
  SlideSurface,
  SlideTitle,
  SlideBody,
  accentFor,
  brandStep,
} from "./slide-primitives";

const COLS = "grid-cols-[1.15fr_1fr_1fr_1fr_1.1fr]";

const HEADINGS = ["Feature", "Task", "Output", "Outcome", "Benefit"] as const;

/** SOL-06 — the feature→benefit value chain. The five columns carry a
 * semantic contract (spec §4.17): Task = what we build, Output = the artefact,
 * Outcome = the behaviour change, Benefit = the business gain. The chain reads
 * left to right, so the Benefit column is tinted end-to-end — it is the
 * destination, and tinting it is what stops the table reading as five
 * interchangeable columns of prose.
 *
 * Blocks share one header rather than repeating it, so columns stay aligned
 * across a multi-block slide. */
export function ValueChainSlideBody({ slide }: { slide: ValueChainSlide }) {
  const accent = accentFor(slide.domain);
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
          className={cn(
            "grid shrink-0 gap-x-[0.7cqw] pb-[0.6cqw] font-mono text-[1.05cqw] tracking-[0.08em] uppercase",
            COLS,
          )}
        >
          {HEADINGS.map((h, i) => (
            <div
              key={h}
              className={cn(
                i === HEADINGS.length - 1
                  ? cn("px-[0.6cqw]", accent.text)
                  : "text-slide-muted",
              )}
            >
              {h}
            </div>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-[0.8cqw]">
          {slide.blocks.map((block, b) => (
            /* Grow each block by its row count so a 1-row block does not claim
               the same height as a 5-row one. */
            <div
              key={b}
              className="flex min-h-0 flex-col"
              style={{ flex: `${block.rows.length} 1 0%` }}
            >
              {/* One solid brand step per block, walking the ramp — the
                  source decks colour-code each block's band so a reader can
                  tell the groups apart at a glance. */}
              {block.caption ? (
                <div
                  className={cn(
                    "shrink-0 px-[0.7cqw] py-[0.35cqw] text-[1.15cqw] leading-[1.25] font-semibold",
                    brandStep(b).fill,
                    brandStep(b).onFill,
                  )}
                >
                  {block.caption}
                </div>
              ) : null}

              <div className="flex min-h-0 flex-1 flex-col">
                {block.rows.map((row, r) => (
                  <div
                    key={r}
                    className={cn(
                      "grid min-h-0 flex-1 gap-x-[0.7cqw] overflow-hidden border-t border-slide-line text-[1.15cqw] leading-[1.3] text-pretty text-slide-body",
                      COLS,
                    )}
                  >
                    <div className="py-[0.6cqw] font-semibold text-slide-ink">
                      {row.feature}
                    </div>
                    <div className="py-[0.6cqw]">{row.task}</div>
                    <div className="py-[0.6cqw]">{row.output}</div>
                    <div className="py-[0.6cqw]">{row.outcome}</div>
                    <div
                      className={cn(
                        "px-[0.6cqw] py-[0.6cqw] font-medium text-slide-ink",
                        accent.tint,
                      )}
                    >
                      {row.benefit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SlideBody>
    </SlideSurface>
  );
}
