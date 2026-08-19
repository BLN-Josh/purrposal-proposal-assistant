import pptxgen from "pptxgenjs";
import {
  PAGE,
  TYPE,
  GAP,
  STROKE,
  textColorFor,
  type ResolvedTheme,
} from "./theme";

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
export function accentFor(
  t: ResolvedTheme,
  domain?: "primary" | "secondary" | "neutral",
): string {
  if (domain === "secondary") return t.accentSecondary;
  if (domain === "neutral") return t.gray500;
  return t.accent;
}

export function tintFor(
  t: ResolvedTheme,
  domain?: "primary" | "secondary" | "neutral",
): string {
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
export function estimateTextHeight(
  text: string,
  widthIn: number,
  fontSizePt: number,
): number {
  const emIn = fontSizePt / 72;
  const charsPerLine = Math.max(1, Math.floor(widthIn / (emIn * 0.5)));
  const lines = text
    .split("\n")
    .reduce(
      (sum, para) => sum + Math.max(1, Math.ceil(para.length / charsPerLine)),
      0,
    );
  return lines * emIn * 1.2;
}

/**
 * The largest size at or below `baseSize` whose text still fits `heightIn`.
 *
 * PowerPoint's "shrink text on overflow" only recalculates on edit and
 * pptxgenjs cannot trigger it, so relying on it alone means the file opens
 * overflowing. Sizing here makes the deck correct the moment it opens;
 * `fit: "shrink"` is set alongside so PowerPoint refines from there.
 */
export function fitFontSize(
  text: string,
  widthIn: number,
  heightIn: number,
  baseSize: number,
  minSize = 6,
): number {
  let size = baseSize;
  while (size > minSize && estimateTextHeight(text, widthIn, size) > heightIn) {
    size -= 0.5;
  }
  return Math.max(minSize, size);
}

/** Longest cell in a column, for deciding whether a table row needs to shrink. */
function longestCell(rows: BandedTableOpts["rows"], colIndex: number): string {
  return rows.reduce((longest, row) => {
    const cell = row[colIndex];
    const text = typeof cell === "string" ? cell : (cell?.text ?? "");
    return text.length > longest.length ? text : longest;
  }, "");
}

/**
 * Spec §2 — the two-line title, on every content slide. Line 1 is the
 * repeating section taxonomy in the accent colour with a trailing colon;
 * line 2 is the slide's unique assertion in black. Both uppercase. No rule
 * beneath (spec §1.4: only covers and dividers carry a rule).
 */
export function titleBlock(
  ctx: Ctx,
  opts: {
    sectionLabel: string;
    assertion: string;
    page?: { n: number; m: number };
    accent?: string;
  },
) {
  const { slide, t } = ctx;
  const accent = opts.accent ?? t.accent;
  const suffix = opts.page ? ` (${opts.page.n}/${opts.page.m})` : "";
  const w = PAGE.w - PAGE.marginX * 2;
  const h = PAGE.titleH;

  // Two sizes, matching the renderer's 1.3cqw kicker and 2.5cqw assertion.
  // The assertion shrinks to fit, but never below its own label.
  const labelSize = TYPE.sectionLabel.size;
  const labelH = (labelSize / 72) * 1.25;
  const assertionSize = fitFontSize(
    `${opts.assertion}${suffix}`,
    w,
    h - labelH,
    TYPE.assertion.size,
    labelSize + 2,
  );

  slide.addText(
    [
      {
        text: opts.sectionLabel.toUpperCase(),
        options: {
          color: accent,
          bold: true,
          breakLine: true,
          fontSize: labelSize,
        },
      },
      {
        text: `${opts.assertion.toUpperCase()}${suffix}`,
        options: { color: t.black, bold: true, fontSize: assertionSize },
      },
    ],
    {
      x: PAGE.marginX,
      y: PAGE.marginTop,
      w,
      h,
      fontFace: t.font,
      valign: "top",
      fit: "shrink",
      lineSpacingMultiple: 0.95,
    },
  );
}

/** A full-width coloured banner with centred or left text — the spec's most
 * repeated single element (goal headers, method headers, conclusions,
 * section bars). */
export function banner(
  ctx: Ctx,
  opts: {
    x?: number;
    y: number;
    w?: number;
    h?: number;
    text: string;
    fill: string;
    align?: "left" | "center";
    size?: number;
    italic?: boolean;
  },
) {
  const { slide, pptx, t } = ctx;
  const x = opts.x ?? PAGE.marginX;
  const w = opts.w ?? PAGE.w - PAGE.marginX * 2;
  const h = opts.h ?? 0.32;
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y: opts.y,
    w,
    h,
    fill: { color: opts.fill },
    line: { color: opts.fill },
  });
  slide.addText(opts.text, {
    x: x + 0.12,
    y: opts.y,
    w: w - 0.24,
    h,
    fontSize: fitFontSize(
      opts.text,
      w - 0.24,
      h,
      opts.size ?? TYPE.bannerText.size,
      7,
    ),
    italic: opts.italic,
    color: textColorFor(opts.fill),
    align: opts.align ?? "center",
    valign: "middle",
    fit: "shrink",
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
    labelColor?: string;
    /** Bullets rows are borderless; summary rows carry a hairline. */
    contentLine?: boolean;
    contentFill?: string;
    contentSize?: number;
    gap?: number;
  },
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
        x: PAGE.marginX,
        y,
        w: opts.labelW,
        h: rowH,
        fill: { color: opts.labelFill },
        line: { color: opts.labelFill },
      });
      slide.addText(row.label, {
        x: PAGE.marginX + 0.12,
        y,
        w: opts.labelW - 0.24,
        h: rowH,
        fontSize: labelSize,
        bold: true,
        color: opts.labelColor ?? textColorFor(opts.labelFill),
        align: "left",
        valign: "middle",
        fontFace: t.font,
      });
    }

    const bodyX = row.label === undefined ? PAGE.marginX : contentX;
    const bodyW =
      row.label === undefined ? PAGE.w - PAGE.marginX * 2 : contentW;

    slide.addShape(pptx.ShapeType.rect, {
      x: bodyX,
      y,
      w: bodyW,
      h: rowH,
      fill: { color: opts.contentFill ?? t.white },
      line:
        opts.contentLine === false
          ? { color: opts.contentFill ?? t.white }
          : { color: t.border, width: STROKE.hairline },
    });

    if (row.boxes?.length) {
      // Spec EXEC-01 split-row: two option boxes sharing the row.
      const boxGap = GAP.column;
      const boxW = (bodyW - 0.24 - boxGap) / 2;
      row.boxes.forEach((box, bi) => {
        const bx = bodyX + 0.12 + bi * (boxW + boxGap);
        const boxText = [box.heading, ...box.bullets].join("\n");
        const boxSize = fitFontSize(boxText, boxW, rowH - 0.12, contentSize, 6);
        slide.addText(
          [
            {
              text: box.heading,
              options: {
                bold: true,
                breakLine: true,
                fontSize: Math.max(boxSize, TYPE.boxHeading.size - 1),
              },
            },
            ...box.bullets.map((b) => ({
              text: b,
              options: { bullet: true, fontSize: boxSize },
            })),
          ],
          {
            x: bx,
            y: y + 0.06,
            w: boxW,
            h: rowH - 0.12,
            color: t.black,
            fontFace: t.font,
            valign: "top",
            fit: "shrink",
          },
        );
      });
      return;
    }

    const bodyText = row.lines.join("\n");
    slide.addText(
      row.lines.length > 1
        ? row.lines.map((line) => ({ text: line, options: { bullet: true } }))
        : (row.lines[0] ?? ""),
      {
        x: bodyX + 0.12,
        y,
        w: bodyW - 0.24,
        h: rowH,
        // Bullets add a hanging indent the estimator can't see.
        fontSize: fitFontSize(
          bodyText,
          (bodyW - 0.24) * (row.lines.length > 1 ? 0.92 : 1),
          rowH - 0.08,
          contentSize,
          6,
        ),
        color: t.black,
        valign: "middle",
        fontFace: t.font,
        fit: "shrink",
      },
    );
  });
}

export interface BandedTableOpts {
  headers: string[];
  widths: number[];
  rows: (
    | string
    | {
        text: string;
        color?: string;
        bold?: boolean;
        align?: "left" | "center" | "right";
      }
  )[][];
  x?: number;
  y: number;
  /**
   * Total height the table must occupy. Required: without it pptxgenjs emits
   * `<a:tr h="0">` and PowerPoint grows each row to fit, so the table ends
   * wherever the content lands while the builder positions the next element
   * from a guess — which is how stacked blocks came to overlap.
   */
  h: number;
  headerFill: string;
  /** Overrides the contrast-derived header ink — the previews render an
   * unfilled header in the accent colour rather than reversed-out on a band. */
  headerColor?: string;
  /** Spec COM-01: one column carries a persistent tint down the whole table. */
  zebraColumn?: number;
  /** Fill for `zebraColumn`. Defaults to the neutral wash. */
  zebraFill?: string;
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
export function bandedTable(ctx: Ctx, opts: BandedTableOpts): number {
  const { slide, t } = ctx;
  const headerSize = opts.headerSize ?? TYPE.tableHeader.size;

  // Equal body rows are what make the table's end position predictable; the
  // per-column shrink below pays for a text-heavy row not being able to
  // borrow height from a sparse one.
  const headerH = Math.min(0.34, opts.h * 0.2);
  const bodyH = opts.rows.length ? (opts.h - headerH) / opts.rows.length : 0;

  // One size for the whole table, driven by the worst-off column.
  const bodySize = opts.widths.reduce((size, colW, ci) => {
    const worst = longestCell(opts.rows, ci);
    if (!worst) return size;
    return Math.min(
      size,
      fitFontSize(worst, colW - 0.16, bodyH - 0.08, size, 6),
    );
  }, opts.bodySize ?? TYPE.tableBody.size);

  const headerRow: pptxgen.TableRow = opts.headers.map((h) => ({
    text: h,
    options: {
      fontSize: headerSize,
      bold: true,
      color: opts.headerColor ?? textColorFor(opts.headerFill),
      fill: { color: opts.headerFill },
      fontFace: t.font,
      valign: "middle",
    },
  }));

  const bodyRows: pptxgen.TableRow[] = opts.rows.map((row, ri) => {
    const override = opts.rowFill?.(ri);
    return row.map((cell, ci) => {
      const isObj = typeof cell !== "string";
      const fill =
        override ??
        (opts.zebraColumn === ci ? (opts.zebraFill ?? t.gray100) : undefined);
      return {
        text: isObj ? cell.text : cell,
        options: {
          fontSize: bodySize,
          color: (isObj && cell.color) || t.slideBody,
          bold: isObj ? cell.bold : false,
          fontFace: t.font,
          valign: "top",
          ...(isObj && cell.align ? { align: cell.align } : {}),
          ...(fill ? { fill: { color: fill } } : {}),
        },
      };
    });
  });

  slide.addTable([headerRow, ...bodyRows], {
    x: opts.x ?? PAGE.marginX,
    y: opts.y,
    w: opts.widths.reduce((a, b) => a + b, 0),
    h: opts.h,
    colW: opts.widths,
    rowH: [headerH, ...opts.rows.map(() => bodyH)],
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

  return opts.h;
}
