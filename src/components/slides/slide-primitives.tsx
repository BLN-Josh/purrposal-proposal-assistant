import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Domain } from "@/lib/slides/schema";

/** Served from public/brand — the same asset the .pptx exporter embeds, so
 * the preview and the downloaded file carry an identical mark. */
const LOGO_SRC = "/brand/balerion-logo.png";
const LOGO_W = 603;
const LOGO_H = 105;

/**
 * Shared building blocks for the 10 slide-kind bodies — every kind fills its
 * card via `absolute inset-0` inside a `@container` wrapper (see SlideCard),
 * and 8 of the 10 kinds open with the identical two-line title grammar.
 * Centralizing both here means a typography or spacing tweak lands once
 * instead of ten times.
 *
 * Everything is sized in `cqw` so a slide reads identically at grid-thumbnail
 * size and at full-pane size.
 *
 * COLOUR: a slide is a Balerion artifact, not app furniture. It renders on a
 * white ground with black body copy and the brand red→amber ramp for accents —
 * the same values `src/lib/pptx/theme.ts` exports, so the preview and the
 * downloaded .pptx are one design system. The warm cream tokens
 * (`bg-card`/`text-foreground`/`text-detail`) belong to the editor *shell*
 * and must not appear on a slide. Never hardcode a hex here; go through the
 * `slide-*` / `brand-*` tokens in globals.css.
 */

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

/**
 * The brand ramp runs dark red → amber. Text-bearing fills are drawn from the
 * red end because white type needs the contrast: brand-1 clears 4.2:1 against
 * white and brand-4 about 2.9:1, while brand-5's amber only manages 2.2:1 and
 * so is used for washes and sequence steps, never as a bed for white type.
 *
 * `primary` is the workhorse — section labels, row-label blocks, table header
 * rows, bullet markers, the recommended column. `secondary` is the second
 * stream (the spec's second domain, warm here rather than the source decks'
 * blue). `neutral` drops to grey for the rare slide that should recede.
 */
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

/** The inverted surface (spec EXE-06's tech-stream variant). Brand red holds
 * up against black, so unlike the light surfaces this keeps the accent rather
 * than substituting a neutral. */
const DARK_ACCENT: SlideAccent = {
  text: "text-brand-3",
  fill: "bg-brand-1",
  onFill: "text-white",
  tint: "bg-white/8",
  tintStrong: "bg-white/15",
  rule: "bg-brand-1",
};

export function accentFor(domain: Domain | undefined, tone: SlideTone = "light"): SlideAccent {
  return tone === "dark" ? DARK_ACCENT : ACCENT_BY_DOMAIN[domain ?? "primary"];
}

/**
 * The full ramp, for the three layouts that enumerate a fixed set of
 * comparable items — timeline phases, team avatars, value-chain blocks —
 * where stepping through the range reads as progression. Everything else
 * takes a single accent; cycling colours per row would just be noise.
 */
export const BRAND_STEPS = ["bg-brand-1", "bg-brand-2", "bg-brand-3", "bg-brand-4", "bg-brand-5"] as const;

/** White type is legible on the four red steps but not on brand-5's amber. */
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
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * The two-line title grammar (spec §2): a `sectionLabel` drawn from the closed
 * taxonomy, set small and uppercase in the slide's accent, over the
 * `assertion` — the slide's actual conclusion — set large, uppercase, in
 * near-black. `page` appends the `(n/m)` suffix for content split across
 * consecutive slides.
 *
 * This replaces the old free-form SlideHeading; every content kind renders it
 * so the label column lines up when you flip through the deck.
 */
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
          accent.text
        )}
      >
        {sectionLabel}
      </div>
      <div
        className={cn(
          "mt-[0.75cqw] text-[2.5cqw] leading-[1.14] font-semibold text-balance uppercase",
          tone === "dark" ? "text-white" : "text-slide-ink"
        )}
      >
        {assertion}
        {page ? (
          <span
            className={cn(
              "ml-[0.6cqw] font-mono text-[1.5cqw] font-normal tracking-normal",
              tone === "dark" ? "text-white/55" : "text-slide-muted"
            )}
          >
            ({page.n}/{page.m})
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The Balerion wordmark. `priority={false}` and a fixed intrinsic size let
 * Next serve one optimized asset that every slide reuses from cache rather
 * than re-fetching per card in a 40-slide grid.
 */
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

/**
 * Spec §1.4 persistent furniture, reproduced from the reference deck: the
 * wordmark top-right and a "Strictly Confidential · N" line bottom-right on
 * every content slide. Positioned absolutely so it never competes with the
 * body for layout height — the content band is measured without it.
 */
export function SlideFurniture({
  page,
  tone = "light",
  confidential = true,
  logo = true,
}: {
  page?: number;
  tone?: SlideTone;
  confidential?: boolean;
  /** The cover carries its own large wordmark, so it opts out of this one. */
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
            tone === "dark" ? "text-white/45" : "text-slide-muted"
          )}
        >
          {confidential ? <span>Strictly Confidential</span> : null}
          {page !== undefined ? (
            <span className={tone === "dark" ? "font-semibold text-white" : "font-semibold text-slide-ink"}>
              {page}
            </span>
          ) : null}
        </div>
      )}
    </>
  );
}

/** The region under the title. `min-h-0` so children that overflow clip at the
 * card edge instead of pushing the surface out of its 16:9 box. */
export function SlideBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mt-[2cqw] flex min-h-0 flex-1 flex-col", className)}>{children}</div>
  );
}

/** Small print pinned under the body — footnotes, disclaimers, scope notes. */
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
        className
      )}
    >
      {children}
    </div>
  );
}
