import type { TitleSlide } from "@/lib/slides/schema";
import { SlideSurface, SlideLogo } from "./slide-primitives";

/**
 * COVER-01, laid out from the reference deck: white ground, the Balerion
 * wordmark large on the left, and the title block right-aligned on the
 * right half — title in brand red, a hairline rule directly beneath it, then
 * the date in bold black under that.
 *
 * It renders its own title treatment rather than the two-line grammar (the
 * schema makes sectionLabel/assertion optional here for exactly that
 * reason), and it takes no top-right mark because the wordmark *is* the
 * slide.
 */
export function TitleSlideBody({ slide }: { slide: TitleSlide }) {
  return (
    <SlideSurface className="justify-center p-[6cqw]">
      <div className="flex items-center gap-[4cqw]">
        <SlideLogo className="w-[26cqw] shrink-0" />

        <div className="flex min-w-0 flex-1 flex-col items-end text-right">
          <div className="text-[2.5cqw] leading-[1.2] font-semibold text-balance text-brand-1 uppercase">
            {slide.title}
          </div>
          {/* Rule hugs the title's own width rather than spanning the column —
              the reference sets it just wider than the text. */}
          <div className="mt-[0.8cqw] h-[0.14cqw] w-full max-w-[38cqw] bg-slide-ink/35" />
          {slide.subtitle ? (
            <div className="mt-[1cqw] text-[1.5cqw] leading-[1.35] text-pretty text-slide-body">
              {slide.subtitle}
            </div>
          ) : null}
          <div className="mt-[1cqw] text-[2cqw] leading-[1.2] font-semibold text-slide-ink uppercase">
            {slide.date}
          </div>
        </div>
      </div>
    </SlideSurface>
  );
}
