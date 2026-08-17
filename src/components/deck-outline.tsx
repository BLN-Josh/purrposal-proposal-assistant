"use client";

import { ListTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KIND_LABEL, type Slide } from "@/lib/slides/schema";

/**
 * A compact table of contents for the deck, sitting above the edit history.
 *
 * This is a viewport control, not a selection control: a row scrolls its
 * slide into view and nothing else. Clicking a card is what selects it, and
 * having two different things both drive selection — one of which toggles on
 * a second click — would make "what does my next instruction apply to?"
 * harder to answer, which is the one question this panel exists to keep
 * obvious.
 *
 * It reuses the `slide-<id>` anchors the cards already render for the
 * add-slide cue, so nothing new has to be tracked to make it work.
 */

/** Section labels are stored UPPERCASE because that is how they are set on
 * the slide itself. Seven of them stacked in a narrow sidebar is a wall of
 * caps that has to be read letter by letter, so they are cased down here —
 * a presentation choice local to this list, leaving the slide untouched. */
function sentenceCase(label: string): string {
  const lower = label.toLocaleLowerCase();
  return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
}

/** The most identifying line a slide has. Cover and divider carry their own
 * title treatment instead of the two-line section/assertion grammar, so they
 * are read from their own fields — and are already mixed case. */
function outlineLabel(slide: Slide): string {
  switch (slide.kind) {
    case "title":
      return slide.title;
    case "divider":
      return slide.sectionName;
    case "placeholder":
      return "Empty slide";
    default:
      return sentenceCase(slide.sectionLabel);
  }
}

export function DeckOutline({
  slides,
  sel,
}: {
  slides: Slide[];
  sel: string[];
}) {
  if (slides.length === 0) return null;

  return (
    /* Capped and independently scrollable. The outline and the edit history
       used to share one scroll region, so a long deck pushed the history out
       of the panel entirely — the two lists grow independently and each
       deserves its own viewport. The cap is in `vh` rather than a percentage
       of the flex parent: the parent's height here is content-driven, and a
       percentage against it resolves circularly. */
    <nav
      aria-label="Deck outline"
      className="flex flex-none flex-col border-b border-border"
    >
      <div className="flex flex-none items-baseline justify-between gap-2 px-4 pt-4 pb-2.5">
        <span className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.09em] text-detail uppercase">
          <ListTree className="size-3" />
          Deck outline
        </span>
        <span className="font-mono text-[10.5px] text-detail tabular-nums">
          {slides.length}
        </span>
      </div>

      <ScrollArea className="max-h-[max(160px,30vh)] min-h-0">
        <ol className="flex flex-col px-4 pb-3">
        {slides.map((slide, i) => {
          const selected = sel.includes(slide.id);
          const empty = slide.kind === "placeholder";
          return (
            <li key={slide.id}>
              <button
                type="button"
                onClick={() =>
                  document.getElementById(`slide-${slide.id}`)?.scrollIntoView({
                    block: "center",
                    behavior: "smooth",
                  })
                }
                title={`Scroll to slide ${i + 1} — ${KIND_LABEL[slide.kind]}`}
                className={cn(
                  "group/row flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
                  selected ? "bg-highlight/60" : "hover:bg-highlight/35",
                )}
              >
                <span
                  className={cn(
                    "w-4.5 shrink-0 font-mono text-[10.5px] tabular-nums transition-colors duration-150",
                    selected ? "text-brand-1" : "text-detail",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[12.5px] leading-tight transition-colors duration-150",
                    empty && "text-detail italic",
                    selected
                      ? "font-medium text-foreground"
                      : "text-body group-hover/row:text-foreground",
                  )}
                >
                  {outlineLabel(slide)}
                </span>
                {slide.revised ? (
                  <span
                    title="Revised"
                    className="size-1.5 shrink-0 rounded-full bg-brand-1"
                  />
                ) : null}
                {empty ? (
                  <span className="size-1.5 shrink-0 rounded-full ring-1 ring-brand-5" />
                ) : null}
              </button>
            </li>
          );
        })}
        </ol>
      </ScrollArea>
    </nav>
  );
}
