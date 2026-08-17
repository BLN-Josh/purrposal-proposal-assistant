import { cn } from "@/lib/utils";

export type MiniSlideKind =
  | "title"
  | "summary"
  | "bullets"
  | "comparison"
  | "table"
  | "timeline"
  | "team"
  | "commercial";

export interface MiniSlideSpec {
  kind: MiniSlideKind;
  title: string;
  num: string;
}

function Line({
  w,
  strong = false,
  className,
}: {
  w: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <span
      style={{ width: w }}
      className={cn(
        "block h-[2.5px] rounded-full",
        strong ? "bg-detail/40" : "bg-detail/18",
        className,
      )}
    />
  );
}

function Body({ kind }: { kind: MiniSlideKind }) {
  switch (kind) {
    case "title":
      return (
        <div className="mt-auto flex flex-col gap-1.5">
          <span className="block h-[3px] w-10 rounded-full bg-gradient-to-r from-brand-1 to-brand-5" />
          <Line w="58%" />
        </div>
      );

    case "summary":
      return (
        <div className="mt-1.5 grid flex-1 grid-cols-2 content-start gap-x-2.5 gap-y-1.5">
          {[0, 1].map((c) => (
            <div key={c} className="flex flex-col gap-1.5">
              <Line w="52%" strong />
              <Line w="100%" />
              <Line w="88%" />
              <Line w="70%" />
            </div>
          ))}
        </div>
      );

    case "bullets":
      return (
        <div className="mt-1.5 flex flex-1 flex-col justify-start gap-2">
          {["94%", "84%", "90%", "66%"].map((w, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="size-1 shrink-0 rounded-full bg-brand-4/70" />
              <Line w={w} />
            </span>
          ))}
        </div>
      );

    case "comparison":
      return (
        <div className="mt-1.5 grid flex-1 grid-cols-2 gap-2">
          {[0, 1].map((c) => (
            <div
              key={c}
              className={cn(
                "flex flex-col gap-1.5 rounded-md border p-1.5",
                c === 0
                  ? "border-brand-1/25 bg-brand-1/[0.06]"
                  : "border-border bg-slide-wash/70",
              )}
            >
              <Line w="60%" strong />
              <Line w="100%" />
              <Line w="80%" />
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <div className="mt-1.5 flex flex-1 flex-col overflow-hidden rounded-md border border-border">
          {[0, 1, 2, 3].map((r) => (
            <div
              key={r}
              className={cn(
                "grid flex-1 grid-cols-[1.4fr_1fr_1fr] items-center gap-1.5 px-1.5",
                r === 0 && "bg-brand-1/[0.08]",
                r > 0 && "border-t border-border",
              )}
            >
              <Line w="80%" strong={r === 0} />
              <Line w="60%" strong={r === 0} />
              <Line w="45%" strong={r === 0} />
            </div>
          ))}
        </div>
      );

    case "timeline":
      return (
        <div className="mt-auto mb-1.5 flex flex-col gap-2">
          <div className="relative flex items-center justify-between">
            <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-detail/15" />
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "relative size-2 rounded-full ring-2 ring-card",
                  i < 2 ? "bg-brand-4" : "bg-detail/25",
                )}
              />
            ))}
          </div>
          <div className="flex justify-between">
            {["18%", "22%", "16%", "20%"].map((w, i) => (
              <Line key={i} w={w} />
            ))}
          </div>
        </div>
      );

    case "team":
      return (
        <div className="mt-auto mb-1 flex justify-between gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "size-5 rounded-full",
                  i === 0 ? "bg-brand-4/35" : "bg-detail/15",
                )}
              />
              <Line w="86%" />
              <Line w="60%" />
            </div>
          ))}
        </div>
      );

    case "commercial":
      return (
        <div className="mt-1.5 flex flex-1 flex-col justify-center gap-1.5">
          {[0, 1, 2].map((r) => (
            <span key={r} className="flex items-center justify-between gap-3">
              <Line w="46%" />
              <Line w="18%" strong />
            </span>
          ))}
          <span className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-1.5">
            <Line w="30%" strong />
            <span className="block h-[4px] w-7 rounded-full bg-gradient-to-r from-brand-1 to-brand-5" />
          </span>
        </div>
      );
  }
}

export function MiniSlide({ kind, title, num }: MiniSlideSpec) {
  return (
    <div
      className={cn(
        "group/mini mr-4 flex aspect-video w-58 flex-none flex-col overflow-hidden rounded-xl bg-card p-3.5 text-left",
        "ring-1 shadow-soft ring-foreground/8 transition-all duration-500 [transition-timing-function:var(--ease-smooth)]",
        "hover:-translate-y-1.5 hover:shadow-lift hover:ring-brand-4/35",
      )}
    >
      <span className="flex items-center gap-1.5 font-mono text-[8.5px] tracking-[0.1em] text-detail/70 uppercase">
        <span className="text-foreground/45">{num}</span>
        <span className="h-px w-2 bg-detail/30 transition-all duration-500 group-hover/mini:w-4 group-hover/mini:bg-brand-4/60" />
        {kind}
      </span>
      <span
        className={cn(
          "text-wrap-pretty mt-1 font-display leading-tight text-foreground",
          kind === "title" ? "text-[15px]" : "text-[12.5px]",
        )}
      >
        {title}
      </span>
      <Body kind={kind} />
    </div>
  );
}
