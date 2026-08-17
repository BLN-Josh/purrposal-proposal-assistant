import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Domain } from "@/lib/slides/schema";

const LOGO_SRC = "/brand/balerion-logo.png";
const LOGO_W = 603;
const LOGO_H = 105;

export type SlideTone = "light" | "dark";

/** A resolved accent family: the class names each slide body needs to paint
 * one consistent accent per slide (spec §1.2 — "never three"). */
export interface SlideAccent {
  /** Accent-coloured text (section labels, emphasis). */
  text: string;
  /** Solid accent fill. */
  fill: string;
  /** Legible text on top of `fill`. */
  onFill: string;
  /** Barely-there wash for row/cell backgrounds. */
  tint: string;
  /** Slightly stronger wash for label cells and highlighted columns. */
  tintStrong: string;
  /** Solid accent for hairlines and rules. */
  rule: string;
}

const ACCENT_BY_DOMAIN: Record<Domain, SlideAccent> = {
  primary: {
    text: "text-brand-1",
    fill: "bg-brand-1",
    onFill: "text-white",
    tint: "bg-brand-1/8",
    tintStrong: "bg-brand-1/15",
    rule: "bg-brand-1",
  },
  secondary: {
    text: "text-brand-4",
    fill: "bg-brand-4",
    onFill: "text-white",
    tint: "bg-brand-4/10",
    tintStrong: "bg-brand-4/18",
    rule: "bg-brand-4",
  },
  neutral: {
    text: "text-slide-muted",
    fill: "bg-slide-muted",
    onFill: "text-white",
    tint: "bg-slide-wash",
    tintStrong: "bg-slide-line/40",
    rule: "bg-slide-muted",
  },
};

const DARK_ACCENT: SlideAccent = {
  text: "text-brand-3",
  fill: "bg-brand-1",
  onFill: "text-white",
  tint: "bg-white/8",
  tintStrong: "bg-white/15",
  rule: "bg-brand-1",
};

export function accentFor(
  domain: Domain | undefined,
  tone: SlideTone = "light",
): SlideAccent {
  return tone === "dark" ? DARK_ACCENT : ACCENT_BY_DOMAIN[domain ?? "primary"];
}

export const BRAND_STEPS = [
  "bg-brand-1",
  "bg-brand-2",
  "bg-brand-3",
  "bg-brand-4",
  "bg-brand-5",
] as const;

export const BRAND_STEP_ON_FILL = [
  "text-white",
  "text-white",
  "text-white",
  "text-white",
  "text-slide-ink",
] as const;

export function brandStep(i: number) {
  const n = i % BRAND_STEPS.length;
  return { fill: BRAND_STEPS[n], onFill: BRAND_STEP_ON_FILL[n] };
}

export function SlideSurface({
  tone = "light",
  className,
  children,
}: {
  tone?: SlideTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col overflow-hidden p-[5cqw]",
        tone === "dark" ? "bg-slide-ink" : "bg-slide",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SlideTitle({
  sectionLabel,
  assertion,
  page,
  domain,
  tone = "light",
  className,
}: {
  sectionLabel: string;
  assertion: string;
  page?: { n: number; m: number };
  domain?: Domain;
  tone?: SlideTone;
  className?: string;
}) {
  const accent = accentFor(domain, tone);
  return (
    <div className={cn("shrink-0", className)}>
      <div
        className={cn(
          "font-mono text-[1.3cqw] leading-[1.25] tracking-[0.14em] uppercase",
          accent.text,
        )}
      >
        {sectionLabel}
      </div>
      <div
        className={cn(
          "mt-[0.75cqw] text-[2.5cqw] leading-[1.14] font-semibold text-balance uppercase",
          tone === "dark" ? "text-white" : "text-slide-ink",
        )}
      >
        {assertion}
        {page ? (
          <span
            className={cn(
              "ml-[0.6cqw] font-mono text-[1.5cqw] font-normal tracking-normal",
              tone === "dark" ? "text-white/55" : "text-slide-muted",
            )}
          >
            ({page.n}/{page.m})
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function SlideLogo({ className }: { className?: string }) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Balerion"
      width={LOGO_W}
      height={LOGO_H}
      className={cn("h-auto select-none", className)}
      unoptimized
    />
  );
}

export function SlideFurniture({
  page,
  tone = "light",
  confidential = true,
  logo = true,
}: {
  page?: number;
  tone?: SlideTone;
  confidential?: boolean;
  logo?: boolean;
}) {
  return (
    <>
      {logo ? (
        <SlideLogo className="pointer-events-none absolute top-[3cqw] right-[4cqw] w-[11cqw]" />
      ) : null}
      {(confidential || page !== undefined) && (
        <div
          className={cn(
            "pointer-events-none absolute right-[4cqw] bottom-[2.4cqw] flex items-center gap-[1.2cqw] font-mono text-[1.05cqw]",
            tone === "dark" ? "text-white/45" : "text-slide-muted",
          )}
        >
          {confidential ? <span>Strictly Confidential</span> : null}
          {page !== undefined ? (
            <span
              className={
                tone === "dark"
                  ? "font-semibold text-white"
                  : "font-semibold text-slide-ink"
              }
            >
              {page}
            </span>
          ) : null}
        </div>
      )}
    </>
  );
}

export function SlideBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mt-[2cqw] flex min-h-0 flex-1 flex-col", className)}>
      {children}
    </div>
  );
}

export function SlideFootnote({
  tone = "light",
  className,
  children,
}: {
  tone?: SlideTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-[1.1cqw] shrink-0 font-mono text-[1.1cqw] leading-[1.3]",
        tone === "dark" ? "text-white/50" : "text-slide-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}
