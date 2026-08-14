import { cn } from "@/lib/utils";

/**
 * Shared building blocks for the 8 slide-kind bodies — every kind fills its
 * card via `absolute inset-0` inside a `@container` wrapper (see
 * SlideCard), and 6 of the 8 kinds open with an identical title/subtitle
 * pair. Centralizing both here means a typography or spacing tweak lands
 * once instead of eight times.
 */

export function SlideSurface({
  tone = "light",
  className,
  children,
}: {
  tone?: "light" | "dark";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col p-[5cqw]",
        tone === "dark" ? "bg-primary" : "bg-card",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SlideHeading({
  title,
  subtitle,
  tone = "light",
}: {
  title: string;
  subtitle: string;
  tone?: "light" | "dark";
}) {
  return (
    <>
      <div
        className={cn(
          "text-[3.1cqw] font-semibold",
          tone === "dark" ? "text-primary-foreground" : "text-foreground"
        )}
      >
        {title}
      </div>
      <div
        className={cn(
          "mt-[0.9cqw] text-[1.7cqw]",
          tone === "dark" ? "text-primary-foreground/60" : "text-detail"
        )}
      >
        {subtitle}
      </div>
    </>
  );
}
