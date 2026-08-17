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

export function SlideRenderer({
  slide,
  page,
}: {
  slide: Slide;
  page?: number;
}) {
  const isCover = slide.kind === "title";
  const tone =
    slide.kind === "team" && slide.variant === "dark" ? "dark" : "light";

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
