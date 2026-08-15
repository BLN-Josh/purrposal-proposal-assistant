import type { DividerSlide } from "@/lib/slides/schema";
import { cn } from "@/lib/utils";
import { SlideSurface, accentFor } from "./slide-primitives";

/** DIV-01 — the chapter break, sharing the cover's white treatment so the
 * deck reads as one white document throughout. The section name is set large
 * in the accent red; the top rule is what marks it as punctuation rather than
 * another content slide. Like the cover it carries its own title treatment
 * instead of the two-line grammar. */
export function DividerSlideBody({ slide }: { slide: DividerSlide }) {
  const accent = accentFor(slide.domain);
  return (
    <SlideSurface className="justify-center p-[6cqw]">
      <div className={cn("absolute inset-x-0 top-0 h-[0.45cqw]", accent.rule)} />

      {slide.deckSubtitle ? (
        <div className="font-mono text-[1.35cqw] tracking-[0.16em] text-slide-muted uppercase">
          {slide.deckSubtitle}
        </div>
      ) : null}
      <div
        className={cn(
          "mt-[1.8cqw] text-[4.2cqw] leading-[1.1] font-semibold text-balance uppercase",
          accent.text
        )}
      >
        {slide.sectionName}
      </div>
      <div className={cn("mt-[1.8cqw] h-[0.28cqw] w-[16cqw]", accent.rule)} />
      {slide.scopeNote ? (
        <div className="mt-[2cqw] max-w-[62cqw] text-[1.65cqw] leading-[1.45] text-pretty text-slide-body">
          {slide.scopeNote}
        </div>
      ) : null}
    </SlideSurface>
  );
}
