"use client";

import { ListTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KIND_LABEL, type Slide } from "@/lib/slides/schema";

function sentenceCase(label: string): string {
  const lower = label.toLocaleLowerCase();
  return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
}

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
    /* Capped and independently scrollable so a long deck cannot push the
       edit history out of the panel. The cap is in `vh` because the flex
       parent's height is content-driven. */
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
                    document
                      .getElementById(`slide-${slide.id}`)
                      ?.scrollIntoView({
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
