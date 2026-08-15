import type { CommercialSlide } from "@/lib/slides/schema";
import { cn } from "@/lib/utils";
import {
  SlideSurface,
  SlideTitle,
  SlideBody,
  SlideFootnote,
  accentFor,
} from "./slide-primitives";

const COLS = "grid-cols-[1.5fr_1.6fr_0.9fr]";

/** COM-01 — line items, a ruled total, then the payment schedule as a chip
 * strip. The total row only renders when the schema supplies both halves; a
 * bare label with no figure (or the reverse) reads as a bug on a pricing
 * slide, so it is all-or-nothing. */
export function CommercialSlideBody({ slide }: { slide: CommercialSlide }) {
  const accent = accentFor(slide.domain);
  const showTotal = Boolean(slide.total ?? slide.totalLabel);

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
            "grid shrink-0 gap-x-[1.2cqw] pb-[0.6cqw] font-mono text-[1.05cqw] tracking-[0.08em] text-slide-muted uppercase",
            COLS
          )}
        >
          <div>Item</div>
          <div>Description</div>
          <div className="text-right">Cost</div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {slide.rows.map((row, i) => (
            <div
              key={i}
              className={cn(
                "grid min-h-0 flex-1 items-center gap-x-[1.2cqw] overflow-hidden border-t border-slide-line py-[0.6cqw] text-[1.3cqw] leading-[1.35]",
                COLS
              )}
            >
              <div className="font-semibold text-slide-ink">{row.item}</div>
              <div className="text-pretty text-slide-body">{row.description}</div>
              <div className="text-right font-mono text-slide-ink">{row.cost}</div>
            </div>
          ))}
        </div>

        {showTotal ? (
          <div
            className={cn(
              "grid shrink-0 gap-x-[1.2cqw] border-t-[0.2cqw] border-slide-ink py-[0.9cqw] text-[1.6cqw] font-semibold text-slide-ink",
              COLS
            )}
          >
            <div>{slide.totalLabel ?? "Total"}</div>
            <div />
            <div className="text-right font-mono">{slide.total}</div>
          </div>
        ) : null}

        {slide.paymentTerms?.length ? (
          <div className="mt-[0.9cqw] flex shrink-0 gap-[0.7cqw]">
            {slide.paymentTerms.map((term, i) => (
              <div
                key={i}
                className={cn(
                  "flex min-w-0 flex-1 flex-col gap-[0.2cqw] rounded-[0.5cqw] px-[0.8cqw] py-[0.6cqw]",
                  accent.tint
                )}
              >
                <span className={cn("font-mono text-[1.45cqw] leading-[1.1]", accent.text)}>
                  {term.pct}%
                </span>
                <span className="text-[1.05cqw] leading-[1.25] text-pretty text-slide-body">
                  {term.milestone}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </SlideBody>
      {slide.footnote ? <SlideFootnote>{slide.footnote}</SlideFootnote> : null}
    </SlideSurface>
  );
}
