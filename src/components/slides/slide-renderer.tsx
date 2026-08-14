import type { Slide } from "@/lib/slides/schema";
import { TitleSlideBody } from "./title-slide";
import { SummarySlideBody } from "./summary-slide";
import { BulletsSlideBody } from "./bullets-slide";
import { ComparisonSlideBody } from "./comparison-slide";
import { TableSlideBody } from "./table-slide";
import { TimelineSlideBody } from "./timeline-slide";
import { TeamSlideBody } from "./team-slide";
import { CommercialSlideBody } from "./commercial-slide";

/** One component per `kind` (Technical Design Document §2.4) — dispatch by
 * the discriminant so every render site stays a one-line call. */
export function SlideRenderer({ slide }: { slide: Slide }) {
  switch (slide.kind) {
    case "title":
      return <TitleSlideBody slide={slide} />;
    case "summary":
      return <SummarySlideBody slide={slide} />;
    case "bullets":
      return <BulletsSlideBody slide={slide} />;
    case "comparison":
      return <ComparisonSlideBody slide={slide} />;
    case "table":
      return <TableSlideBody slide={slide} />;
    case "timeline":
      return <TimelineSlideBody slide={slide} />;
    case "team":
      return <TeamSlideBody slide={slide} />;
    case "commercial":
      return <CommercialSlideBody slide={slide} />;
  }
}
