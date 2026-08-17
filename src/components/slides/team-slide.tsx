import type { TeamSlide } from "@/lib/slides/schema";
import { cn } from "@/lib/utils";
import {
  SlideSurface,
  SlideTitle,
  SlideBody,
  accentFor,
  brandStep,
} from "./slide-primitives";

/** EXE-06 — up to 6 profiles in a 2-column grid (3 rows). On the default
 * white surface each avatar takes the next step of the brand ramp, which is
 * what turns a grid of identical discs into a legible team.
 *
 * `variant: "dark"` is the spec's one inverted content slide (reserved for
 * the tech stream). Nothing ships with it set — the house deck is white
 * throughout — but the path is kept because the spec defines it and it is one
 * field away. On black the ramp loses its separation, so that variant falls
 * back to a single accent. */
export function TeamSlideBody({ slide }: { slide: TeamSlide }) {
  const tone = slide.variant === "dark" ? "dark" : "light";
  const accent = accentFor(slide.domain, tone);
  const dark = tone === "dark";

  return (
    <SlideSurface tone={tone}>
      <SlideTitle
        sectionLabel={slide.sectionLabel}
        assertion={slide.assertion}
        page={slide.page}
        domain={slide.domain}
        tone={tone}
      />
      <SlideBody>
        <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-x-[2.4cqw] gap-y-[1.6cqw]">
          {slide.people.map((person, i) => (
            <div key={i} className="flex min-w-0 items-start gap-[1.2cqw]">
              <span
                className={cn(
                  "flex size-[3.8cqw] shrink-0 items-center justify-center rounded-full text-[1.4cqw] font-semibold",
                  dark
                    ? cn(accent.fill, accent.onFill)
                    : cn(brandStep(i).fill, brandStep(i).onFill),
                )}
              >
                {person.initials}
              </span>
              <span className="flex min-w-0 flex-col gap-[0.25cqw]">
                <span
                  className={cn(
                    "text-[1.6cqw] leading-[1.2] font-semibold",
                    dark ? "text-white" : "text-slide-ink",
                  )}
                >
                  {person.name}
                </span>
                <span
                  className={cn(
                    "font-mono text-[1.1cqw] tracking-[0.07em] uppercase",
                    accent.text,
                  )}
                >
                  {person.role}
                </span>
                <span
                  className={cn(
                    "text-[1.15cqw] leading-[1.35] text-pretty",
                    dark ? "text-white/65" : "text-slide-body",
                  )}
                >
                  {person.bio}
                </span>
              </span>
            </div>
          ))}
        </div>
      </SlideBody>
    </SlideSurface>
  );
}
