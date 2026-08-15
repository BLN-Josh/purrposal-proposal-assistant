import pptxgen from "pptxgenjs";
import { PAGE, TYPE, GAP, STROKE, textColorFor, type ResolvedTheme } from "./theme";

/**
 * The reusable primitives from `balerion-deck-system.md` §7. The spec's own
 * conclusion is that eleven primitives cover the whole system and *that* is
 * the engineering scope — not thirty per-layout renderers. These are the
 * subset the implemented layouts need; each is used by 2+ builders, which is
 * the bar for living here rather than inline in a builder.
 */

export interface Ctx {
  slide: pptxgen.Slide;
  pptx: pptxgen;
  t: ResolvedTheme;
}

/** Accent family for a slide (spec §1.2: exactly one per slide). */
export function accentFor(t: ResolvedTheme, domain?: "primary" | "secondary" | "neutral"): string {
  if (domain === "secondary") return t.accentSecondary;
  if (domain === "neutral") return t.gray500;
  return t.accent;
}

export function tintFor(t: ResolvedTheme, domain?: "primary" | "secondary" | "neutral"): string {
  if (domain === "secondary") return t.tintSecondary;
  if (domain === "neutral") return t.tintNeutral;
  return t.tintPrimary;
}

/**
 * Rough text height in inches. pptxgenjs does no layout, and there is no
 * font metric source in a Node build, so this is a deliberate estimate:
 * Arial's average advance width across mixed-case prose is ~0.5em, and the
 * deck's line spacing is ~1.2. Good enough to catch content-band overflow
 * (spec V14) and to decide when a row needs to grow; NOT exact, so builders
 * that use it leave headroom rather than packing to the last pixel.
 */
export function estimateTextHeight(text: string, widthIn: number, fontSizePt: number): number {
  const emIn = fontSizePt / 72;
  const charsPerLine = Math.max(1, Math.floor(widthIn / (emIn * 0.5)));
  const lines = text
    .split("\n")
    .reduce((sum, para) => sum + Math.max(1, Math.ceil(para.length / charsPerLine)), 0);
  return lines * emIn * 1.2;
}

/**
 * Spec §2 — the two-line title, on every content slide. Line 1 is the
 * repeating section taxonomy in the accent colour with a trailing colon;
 * line 2 is the slide's unique assertion in black. Both uppercase. No rule
 * beneath (spec §1.4: only covers and dividers carry a rule).
 */
export function titleBlock(
  ctx: Ctx,
  opts: { sectionLabel: string; assertion: string; page?: { n: number; m: number }; accent?: string }
) {
  const { slide, t } = ctx;
  const accent = opts.accent ?? t.accent;
  const suffix = opts.page ? ` (${opts.page.n}/${opts.page.m})` : "";
  slide.addText(
    [
      { text: `${opts.sectionLabel.toUpperCase()}:`, options: { color: accent, bold: true, breakLine: true } },
      { text: `${opts.assertion.toUpperCase()}${suffix}`, options: { color: t.black, bold: true } },
    ],
    {
      x: PAGE.marginX,
      y: PAGE.marginTop,
      w: PAGE.w - PAGE.marginX * 2,
      h: 0.62,
      fontSize: TYPE.sectionLabel.size,
      fontFace: t.font,
      valign: "top",
      lineSpacingMultiple: 0.95,
    }
  );
}

/** A full-width coloured banner with centred or left text — the spec's most
 * repeated single element (goal headers, method headers, conclusions,
 * section bars). */
export function banner(
  ctx: Ctx,
  opts: {
    x?: number; y: number; w?: number; h?: number;
    text: string; fill: string; align?: "left" | "center";
    size?: number; italic?: boolean;
  }
) {
  const { slide, pptx, t } = ctx;
  const x = opts.x ?? PAGE.marginX;
  const w = opts.w ?? PAGE.w - PAGE.marginX * 2;
  const h = opts.h ?? 0.32;
  slide.addShape(pptx.ShapeType.rect, { x, y: opts.y, w, h, fill: { color: opts.fill }, line: { color: opts.fill } });
  slide.addText(opts.text, {
    x: x + 0.12,
    y: opts.y,
    w: w - 0.24,
    h,
    fontSize: opts.size ?? TYPE.bannerText.size,
    italic: opts.italic,
    color: textColorFor(opts.fill),
    align: opts.align ?? "center",
    valign: "middle",
    fontFace: t.font,
  });
}

export interface StackRow {
  label?: string;
  /** Rendered as `•` bullets when more than one entry. */
  lines: string[];
  /** Split-row variant: two side-by-side boxes instead of `lines`. */
  boxes?: { heading: string; bullets: string[] }[];
}

/**
 * Spec §7.2 `rowLabelStack` — EXEC-01 and UND-05 are the same object at two
 * densities: a coloured label cell on the left, content on the right, rows
 * stacked down the content band. Row heights are distributed across the
 * available band rather than fixed, so 4 rows and 6 rows both fill the
 * slide instead of leaving a gap or overflowing (spec V14).
 */
export function rowLabelStack(
  ctx: Ctx,
  opts: {
    rows: StackRow[];
    yStart: number;
    yEnd: number;
    labelW: number;
    labelFill: string;
    labelSize?: number;
    contentFill?: string;
    contentSize?: number;
    gap?: number;
  }
) {
  const { slide, pptx, t } = ctx;
  const gap = opts.gap ?? GAP.normal;
  const n = opts.rows.length;
  const rowH = (opts.yEnd - opts.yStart - gap * (n - 1)) / n;
  const contentX = PAGE.marginX + opts.labelW + GAP.normal;
  const contentW = PAGE.w - PAGE.marginX - contentX;
  const labelSize = opts.labelSize ?? 11;
  const contentSize = opts.contentSize ?? TYPE.bulletBody.size;

  opts.rows.forEach((row, i) => {
    const y = opts.yStart + i * (rowH + gap);

    if (row.label !== undefined) {
      slide.addShape(pptx.ShapeType.rect, {
        x: PAGE.marginX, y, w: opts.labelW, h: rowH,
        fill: { color: opts.labelFill }, line: { color: opts.labelFill },
      });
      slide.addText(row.label, {
        x: PAGE.marginX + 0.08, y, w: opts.labelW - 0.16, h: rowH,
        fontSize: labelSize, bold: true, color: textColorFor(opts.labelFill),
        align: "center", valign: "middle", fontFace: t.font,
      });
    }

    const bodyX = row.label === undefined ? PAGE.marginX : contentX;
    const bodyW = row.label === undefined ? PAGE.w - PAGE.marginX * 2 : contentW;

    slide.addShape(pptx.ShapeType.rect, {
      x: bodyX, y, w: bodyW, h: rowH,
      fill: { color: opts.contentFill ?? t.white },
      line: { color: t.border, width: STROKE.hairline },
    });

    if (row.boxes?.length) {
      // Spec EXEC-01 split-row: two option boxes sharing the row.
      const boxGap = GAP.column;
      const boxW = (bodyW - 0.24 - boxGap) / 2;
      row.boxes.forEach((box, bi) => {
        const bx = bodyX + 0.12 + bi * (boxW + boxGap);
        slide.addText(
          [
            { text: box.heading, options: { bold: true, breakLine: true, fontSize: TYPE.boxHeading.size } },
            ...box.bullets.map((b) => ({ text: b, options: { bullet: true, fontSize: contentSize } })),
          ],
          { x: bx, y: y + 0.06, w: boxW, h: rowH - 0.12, color: t.black, fontFace: t.font, valign: "top" }
        );
      });
      return;
    }

    slide.addText(
      row.lines.length > 1
        ? row.lines.map((line) => ({ text: line, options: { bullet: true } }))
        : (row.lines[0] ?? ""),
      {
        x: bodyX + 0.12, y, w: bodyW - 0.24, h: rowH,
        fontSize: contentSize, color: t.black, valign: "middle", fontFace: t.font,
      }
    );
  });
}

/**
 * Spec §7.1 `chevronRibbon` — the highest-fanout primitive in the system
 * (VAL-01, EXE-01, EXE-02, EXE-03, EXE-04 all call it). Stages overlap by a
 * notch so the row reads as one continuous arrow. `homePlate` is the preset
 * geometry the source decks actually use for these (verified against their
 * OOXML), not `pentagon`.
 */
export function chevronRibbon(
  ctx: Ctx,
  opts: { stages: { label: string; fill: string }[]; x?: number; y: number; w?: number; h?: number; size?: number }
) {
  const { slide, pptx, t } = ctx;
  const x0 = opts.x ?? PAGE.marginX;
  const totalW = opts.w ?? PAGE.w - PAGE.marginX * 2;
  const h = opts.h ?? 0.34;
  const n = opts.stages.length;
  const overlap = 0.12;
  const stageW = (totalW + overlap * (n - 1)) / n;

  opts.stages.forEach((stage, i) => {
    const x = x0 + i * (stageW - overlap);
    slide.addShape(pptx.ShapeType.homePlate, {
      x, y: opts.y, w: stageW, h,
      fill: { color: stage.fill }, line: { color: stage.fill },
    });
    slide.addText(stage.label, {
      x, y: opts.y, w: stageW - 0.16, h,
      fontSize: opts.size ?? TYPE.boxHeading.size,
      bold: true, color: textColorFor(stage.fill),
      align: "center", valign: "middle", fontFace: t.font,
    });
  });
}

export interface BandedTableOpts {
  headers: string[];
  widths: number[];
  rows: (string | { text: string; color?: string; bold?: boolean })[][];
  x?: number;
  y: number;
  headerFill: string;
  /** Spec COM-01: one column carries a persistent tint down the whole table. */
  zebraColumn?: number;
  /** Spec UND-06: horizontal rules only, no vertical grid. */
  horizontalOnly?: boolean;
  bodySize?: number;
  headerSize?: number;
  /** Per-row fill override, e.g. to highlight a recommended column's row. */
  rowFill?: (rowIndex: number) => string | undefined;
}

/**
 * Spec §7.3 `bandedTable` — every Tier-1 table layout routes through this
 * (UND-03/04/06/07, SOL-05/06/08, COM-01/02). Supports the two conventions
 * that the source decks actually rely on: a persistently tinted column and
 * horizontal-only rules.
 */
export function bandedTable(ctx: Ctx, opts: BandedTableOpts) {
  const { slide, t } = ctx;
  const bodySize = opts.bodySize ?? TYPE.tableBody.size;
  const headerSize = opts.headerSize ?? TYPE.tableHeader.size;

  const headerRow: pptxgen.TableRow = opts.headers.map((h) => ({
    text: h,
    options: {
      fontSize: headerSize, bold: true, color: textColorFor(opts.headerFill),
      fill: { color: opts.headerFill }, fontFace: t.font, valign: "middle",
    },
  }));

  const bodyRows: pptxgen.TableRow[] = opts.rows.map((row, ri) => {
    const override = opts.rowFill?.(ri);
    return row.map((cell, ci) => {
      const isObj = typeof cell !== "string";
      const fill = override ?? (opts.zebraColumn === ci ? t.gray100 : undefined);
      return {
        text: isObj ? cell.text : cell,
        options: {
          fontSize: bodySize,
          color: (isObj && cell.color) || t.black,
          bold: isObj ? cell.bold : false,
          fontFace: t.font,
          valign: "top",
          ...(fill ? { fill: { color: fill } } : {}),
        },
      };
    });
  });

  slide.addTable([headerRow, ...bodyRows], {
    x: opts.x ?? PAGE.marginX,
    y: opts.y,
    w: opts.widths.reduce((a, b) => a + b, 0),
    colW: opts.widths,
    border: opts.horizontalOnly
      ? [
          { type: "solid", color: t.border, pt: STROKE.hairline },
          { type: "none" },
          { type: "solid", color: t.border, pt: STROKE.hairline },
          { type: "none" },
        ]
      : { type: "solid", color: t.border, pt: STROKE.hairline },
    autoPage: false,
  });
}
