import type { Slide } from "@/lib/slides/schema";
import { TitleSlideBody } from "./title-slide";
import { DividerSlideBody } from "./divider-slide";
import { SummarySlideBody } from "./summary-slide";
import { BulletsSlideBody } from "./bullets-slide";
import { ComparisonSlideBody } from "./comparison-slide";
import { TableSlideBody } from "./table-slide";
import { ValueChainSlideBody } from "./value-chain-slide";
import { TimelineSlideBody } from "./timeline-slide";
import { TeamSlideBody } from "./team-slide";
import { CommercialSlideBody } from "./commercial-slide";
import { PlaceholderSlideBody } from "./placeholder-slide";
import { SlideFurniture } from "./slide-primitives";

/** One component per `kind`, one per spec layout id (see LAYOUT_BY_KIND) —
 * dispatch by the discriminant so every render site stays a one-line call.
 * The `never` default makes adding an 11th kind to the schema a compile error
 * here rather than a blank card at runtime. */
function SlideBodyFor({ slide }: { slide: Slide }) {
  switch (slide.kind) {
    case "title":
      return <TitleSlideBody slide={slide} />;
    case "divider":
      return <DividerSlideBody slide={slide} />;
    case "summary":
      return <SummarySlideBody slide={slide} />;
    case "bullets":
      return <BulletsSlideBody slide={slide} />;
    case "comparison":
      return <ComparisonSlideBody slide={slide} />;
    case "table":
      return <TableSlideBody slide={slide} />;
    case "valueChain":
      return <ValueChainSlideBody slide={slide} />;
    case "timeline":
      return <TimelineSlideBody slide={slide} />;
    case "team":
      return <TeamSlideBody slide={slide} />;
    case "commercial":
      return <CommercialSlideBody slide={slide} />;
    case "placeholder":
      return <PlaceholderSlideBody slide={slide} />;
    default: {
      const _exhaustive: never = slide;
      void _exhaustive;
      return null;
    }
  }
}

/**
 * Slide body + the persistent furniture that sits on top of it.
 *
 * The furniture lives here rather than inside each body for the same reason
 * the exporter puts it on a slide master: it is identical on every page, so
 * ten copies would be ten chances to drift. It renders as an overlay after
 * the body (which is `absolute inset-0`), so it always sits above the
 * content without participating in the body's layout.
 *
 * The cover carries its own large wordmark and so opts out of the top-right
 * mark — matching the reference deck, where page 1 shows the logo centred
 * and every subsequent page shows it small in the corner.
 */
export function SlideRenderer({ slide, page }: { slide: Slide; page?: number }) {
  const isCover = slide.kind === "title";
  const tone = slide.kind === "team" && slide.variant === "dark" ? "dark" : "light";

  // An empty slide is a draft, not a page — furniture would assert it is a
  // finished, confidential deliverable, which is exactly what it isn't.
  if (slide.kind === "placeholder") return <SlideBodyFor slide={slide} />;

  return (
    <>
      <SlideBodyFor slide={slide} />
      {isCover ? (
        <SlideFurniture page={page} tone={tone} logo={false} />
      ) : (
        <SlideFurniture page={page} tone={tone} />
      )}
    </>
  );
}
