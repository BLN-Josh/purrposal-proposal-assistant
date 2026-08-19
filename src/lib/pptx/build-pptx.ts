import pptxgen from "pptxgenjs";
import type { Slide, DeckTheme } from "@/lib/slides/schema";
import {
  CQW,
  pt,
  PAGE,
  TYPE,
  GAP,
  STROKE,
  LIGHT_MASTER,
  DARK_MASTER,
  COVER_MASTER,
  resolveTheme,
  textColorFor,
  type ResolvedTheme,
} from "./theme";
import { defineMasters, loadLogoData } from "./masters";
import {
  titleBlock,
  banner,
  rowLabelStack,
  bandedTable,
  fitFontSize,
  accentFor,
  tintFor,
  type Ctx,
  type StackRow,
} from "./helpers";

/** Usable content width between the side margins. */
const BAND_W = PAGE.w - PAGE.marginX * 2;

type Of<K extends Slide["kind"]> = Extract<Slide, { kind: K }>;

function coverLogo(t: ResolvedTheme): string | null {
  return t.logoFile ? loadLogoData(t.logoFile) : null;
}

/**
 * COVER-01 (spec §4.1). White ground, logo block left, title stack
 * right-aligned with a short accent rule directly beneath, date below that.
 * No page number or header logo — covers carry neither in the source decks.
 */
function addTitleSlide(ctx: Ctx, s: Of<"title">) {
  const { slide, pptx, t } = ctx;
  slide.background = { color: t.white };

  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0.25,
    w: PAGE.w,
    h: 0.02,
    fill: { color: t.accent },
    line: { color: t.accent },
  });

  const logo = coverLogo(t);
  if (logo)
    slide.addImage({
      data: logo,
      x: 1.1,
      y: 3.0,
      w: 3.4,
      h: 3.4 / (603 / 105),
    });

  slide.addText(s.title.toUpperCase(), {
    x: 6.9,
    y: 2.6,
    w: 5.9,
    h: 1.0,
    fontSize: fitFontSize(s.title, 5.9, 1.0, TYPE.coverTitle.size, 12),
    bold: true,
    color: t.accent,
    align: "right",
    valign: "bottom",
    fontFace: t.font,
    fit: "shrink",
  });
  // `bg-slide-ink/35` in the renderer — a neutral rule, not an accent one.
  slide.addShape(pptx.ShapeType.rect, {
    x: 7.467,
    y: 3.6,
    w: 5.067,
    h: 0.019,
    fill: { color: "A6A6A6" },
    line: { color: "A6A6A6" },
  });
  if (s.subtitle) {
    slide.addText(s.subtitle, {
      x: 6.9,
      y: 3.72,
      w: 5.9,
      h: 0.3,
      fontSize: TYPE.coverSubtitle.size,
      color: t.slideBody,
      align: "right",
      fontFace: t.font,
    });
  }
  slide.addText(s.date.toUpperCase(), {
    x: 6.9,
    y: 4.02,
    w: 5.9,
    h: 0.45,
    fontSize: TYPE.coverDate.size,
    bold: true,
    color: t.black,
    align: "right",
    fontFace: t.font,
  });
}

/** DIV-01 (spec §4.2) — cover treatment reused as a chapter break, plus an
 * optional bottom-left scope note. */
function addDividerSlide(ctx: Ctx, s: Of<"divider">) {
  const { slide, pptx, t } = ctx;
  slide.background = { color: t.white };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0.25,
    w: PAGE.w,
    h: 0.02,
    fill: { color: t.accent },
    line: { color: t.accent },
  });

  const logo = coverLogo(t);
  if (logo)
    slide.addImage({
      data: logo,
      x: 8.9,
      y: 3.1,
      w: 3.4,
      h: 3.4 / (603 / 105),
    });

  slide.addText(s.sectionName.toUpperCase(), {
    x: CQW * 6,
    y: 3.558,
    w: 11.733,
    h: 1.2,
    fontSize: fitFontSize(s.sectionName, 7.9, 1.2, TYPE.dividerTitle.size, 18),
    bold: true,
    color: t.accent,
    valign: "bottom",
    fontFace: t.font,
    fit: "shrink",
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: CQW * 6,
    y: 4.414,
    w: CQW * 16,
    h: CQW * 0.28,
    fill: { color: t.accent },
    line: { color: t.accent },
  });
  if (s.deckSubtitle) {
    slide.addText(s.deckSubtitle.toUpperCase(), {
      x: CQW * 6,
      y: 3.048,
      w: 11.733,
      h: 0.35,
      fontSize: 13,
      color: t.gray700,
      fontFace: t.font,
    });
  }
  if (s.scopeNote) {
    slide.addText(s.scopeNote, {
      x: CQW * 6,
      y: 4.68,
      w: CQW * 62,
      h: 0.9,
      fontSize: fitFontSize(s.scopeNote, CQW * 62, 0.9, 15.8, 8),
      color: t.slideBody,
      valign: "top",
      fontFace: t.font,
      fit: "shrink",
    });
  }
}

/** EXEC-01 (spec §4.3) — the whole proposal on one slide. */
function addSummarySlide(ctx: Ctx, s: Of<"summary">) {
  titleBlock(ctx, {
    sectionLabel: s.sectionLabel,
    assertion: s.assertion,
    page: s.page,
    accent: accentFor(ctx.t, s.domain),
  });
  const rows: StackRow[] = s.rows.map((r) => ({
    label: r.label,
    lines: r.bullets,
    boxes: r.options,
  }));
  rowLabelStack(ctx, {
    rows,
    yStart: PAGE.bandTop + 0.1,
    yEnd: PAGE.bandBottom,
    labelW: CQW * 15,
    labelFill: accentFor(ctx.t, s.domain),
    labelSize: TYPE.bulletBody.size,
  });
}

/** UND-05 (spec §4.9) — discovery evidence. Rows with a `label` render as
 * the spec's two-column pain-point row; rows without render full-width. */
function addBulletsSlide(ctx: Ctx, s: Of<"bullets">) {
  const { t } = ctx;
  const accent = accentFor(t, s.domain);
  titleBlock(ctx, {
    sectionLabel: s.sectionLabel,
    assertion: s.assertion,
    page: s.page,
    accent,
  });

  let yStart = PAGE.bandTop + 0.1;
  if (s.intro) {
    ctx.slide.addText(s.intro, {
      x: PAGE.marginX,
      y: yStart,
      w: BAND_W,
      h: 0.42,
      fontSize: fitFontSize(s.intro, BAND_W, 0.42, 14.4, 8),
      color: t.slideBody,
      valign: "top",
      fontFace: t.font,
      fit: "shrink",
    });
    yStart += 0.52;
  }

  const conclusionH = s.conclusion ? 0.5 : 0;
  const yEnd = PAGE.bandBottom - (conclusionH ? conclusionH + GAP.normal : 0);
  const hasLabels = s.rows.some((r) => r.label);

  rowLabelStack(ctx, {
    rows: s.rows.map((r) => ({ label: r.label, lines: [r.text] })),
    yStart,
    yEnd,
    labelW: CQW * 19,
    labelFill: hasLabels ? tintFor(t, s.domain) : accent,
    labelSize: TYPE.boxHeading.size,
    contentFill: t.gray100,
    contentSize: TYPE.bulletBody.size,
    contentLine: false,
    labelColor: t.black,
    gap: GAP.tight,
  });

  if (s.conclusion) {
    banner(ctx, {
      y: PAGE.bandBottom - conclusionH,
      h: conclusionH,
      text: s.conclusion,
      fill: t.black,
      size: 13.9,
      align: "left",
    });
  }
}

/** UND-06 (spec §4.10) — the option matrix that closes the sale. Criteria
 * down, options across, recommended column tinted and stamped. */
function addComparisonSlide(ctx: Ctx, s: Of<"comparison">) {
  const { t } = ctx;
  const accent = accentFor(t, s.domain);
  titleBlock(ctx, {
    sectionLabel: s.sectionLabel,
    assertion: s.assertion,
    page: s.page,
    accent,
  });

  // comparison-slide.tsx: grid-cols-[1.35fr repeat(K, 1fr)]
  const criteriaW = (BAND_W * 1.35) / (1.35 + s.options.length);
  const optW = (BAND_W - criteriaW) / s.options.length;
  const recIdx = s.options.findIndex((o) => o.recommended);

  const rows = s.criteria.map((c, ri) => [
    {
      text: c.descriptor ? `${c.label}\n${c.descriptor}` : c.label,
      bold: true,
    },
    ...s.options.map((o) => ({
      text: o.cells[ri] ?? "",
      bold: o.recommended,
    })),
  ]);

  // The table gets the band minus the stamp's strip, not the whole band.
  const stampH = recIdx >= 0 ? 0.32 : 0;
  const tableY = PAGE.bandTop + 0.1;
  const tableH = PAGE.bandBottom - tableY - stampH;

  bandedTable(ctx, {
    headers: ["Comparing matrix", ...s.options.map((o) => o.name)],
    widths: [criteriaW, ...s.options.map(() => optW)],
    rows,
    y: tableY,
    h: tableH,
    headerFill: accent,
    horizontalOnly: true,
    bodySize: 11,
    ...(recIdx >= 0
      ? { zebraColumn: recIdx + 1, zebraFill: tintFor(t, s.domain) }
      : {}),
  });

  if (recIdx >= 0) {
    ctx.slide.addText("*Recommended", {
      x: PAGE.marginX + criteriaW + optW * recIdx,
      y: tableY + tableH + 0.04,
      w: optW,
      h: stampH,
      fontSize: TYPE.boxHeading.size,
      bold: true,
      color: accent,
      align: "center",
      valign: "middle",
      fontFace: t.font,
    });
  }
}

/** SOL-08 (spec §4.19) — the specification backbone: a tinted panel with a
 * vertical module-group band on the left and the four-column detail table
 * on the right. Header row is white-on-border here, not accent-filled —
 * the source decks deliberately drop the red header on this layout so the
 * tinted panel stays the dominant band. */
function addTableSlide(ctx: Ctx, s: Of<"table">) {
  const { slide, pptx, t } = ctx;
  const accent = accentFor(t, s.domain);
  titleBlock(ctx, {
    sectionLabel: s.sectionLabel,
    assertion: s.assertion,
    page: s.page,
    accent,
  });

  const panelX = PAGE.marginX;
  const panelW = BAND_W;
  const panelY = PAGE.bandTop + 0.1;
  const panelH = PAGE.bandBottom - panelY;

  const bandW = s.group ? CQW * 2.6 : 0.12;
  if (s.group) {
    // The renderer draws a solid accent rail with rotated white text.
    slide.addShape(pptx.ShapeType.rect, {
      x: panelX,
      y: panelY,
      w: bandW,
      h: panelH,
      fill: { color: accent },
      line: { color: accent },
    });
    slide.addText(s.group, {
      x: panelX,
      y: panelY,
      w: bandW,
      h: panelH,
      fontSize: 11,
      bold: true,
      color: textColorFor(accent),
      align: "center",
      valign: "middle",
      rotate: 270,
      fontFace: t.font,
    });
  }

  // Spec widths 2.15/2.05/4.35/1.55 total 12.1, scaled to the space the
  // vertical band leaves so the table always ends flush with the panel.
  const tableW = panelW - bandW - CQW;
  // table-slide.tsx: grid-cols-[1.1fr_1.6fr_1.6fr_1.2fr]
  const base = [1.1, 1.6, 1.6, 1.2];
  const scale = tableW / base.reduce((a, b) => a + b, 0);

  bandedTable(ctx, {
    headers: ["Features", "Description", "Details", "Action support"],
    widths: base.map((w) => w * scale),
    rows: s.rows.map((r) => [
      { text: r.feature, bold: true },
      r.description,
      r.details,
      r.actionSupport,
    ]),
    x: panelX + bandW + 0.12,
    y: panelY + 0.12,
    // Inset so the table stays inside the tinted panel.
    h: panelH - 0.24,
    headerFill: t.white,
    headerColor: accent,
    horizontalOnly: true,
    bodySize: 12,
  });
}

/** SOL-06 (spec §4.17) — feature→benefit value chain. Pure table, and the
 * semantic contract across the five columns is the whole point of it. */
function addValueChainSlide(ctx: Ctx, s: Of<"valueChain">) {
  const { t } = ctx;
  const accent = accentFor(t, s.domain);
  titleBlock(ctx, {
    sectionLabel: s.sectionLabel,
    assertion: s.assertion,
    page: s.page,
    accent,
  });

  // value-chain-slide.tsx: grid-cols-[1.15fr_1fr_1fr_1fr_1.1fr], scaled to the band.
  const ratios = [1.15, 1, 1, 1, 1.1];
  const rsum = ratios.reduce((a, b) => a + b, 0);
  const widths = ratios.map((r) => (BAND_W * r) / rsum);
  const captionH = 0.26;

  /**
   * Height is budgeted up front because this layout stacks two or three
   * tables down one band. Previously `y` advanced by a predicted row height
   * while the tables carried none, so block two landed on block one.
   */
  const captions = s.blocks.filter((b) => b.caption).length;
  const gaps = GAP.normal * Math.max(0, s.blocks.length - 1);
  const avail =
    PAGE.bandBottom - (PAGE.bandTop + 0.1) - captions * captionH - gaps;
  const totalRows = s.blocks.reduce((n, b) => n + b.rows.length, 0);
  // Each block pays for its own header row.
  const unitH = avail / (totalRows + s.blocks.length);

  let y = PAGE.bandTop + 0.1;
  s.blocks.forEach((block, bi) => {
    if (block.caption) {
      banner(ctx, {
        y,
        h: captionH,
        text: block.caption,
        fill: t.gradient[bi % t.gradient.length],
        align: "left",
        size: 11,
      });
      y += captionH;
    }
    y +=
      bandedTable(ctx, {
        headers: ["Features", "Task", "Output", "Outcome", "Benefit"],
        widths,
        rows: block.rows.map((r) => [
          { text: r.feature, bold: true },
          r.task,
          r.output,
          r.outcome,
          r.benefit,
        ]),
        y,
        h: unitH * (block.rows.length + 1),
        headerFill: accent,
        horizontalOnly: true,
        bodySize: 11,
        zebraColumn: 4,
        zebraFill: tintFor(t, s.domain),
      }) + GAP.normal;
  });
}

/** EXE-02 (spec §4.26, simplified) — chevron phase ribbon over per-phase
 * detail columns. The full Gantt grid is a Tier-2 column-span engine; this
 * is the ribbon + column model without the banded box placement. */
function addTimelineSlide(ctx: Ctx, s: Of<"timeline">) {
  const { slide, pptx, t } = ctx;
  const accent = accentFor(t, s.domain);
  titleBlock(ctx, {
    sectionLabel: s.sectionLabel,
    assertion: s.assertion,
    page: s.page,
    accent,
  });

  const n = s.phases.length;
  const colGap = CQW * 1.4;
  const colW = (BAND_W - colGap * (n - 1)) / n;
  const dot = CQW * 2.2;

  // The renderer centres this block in the content band (SlideBody has
  // `justify-center`), so the stack is measured and then placed, rather than
  // pinned to the top of the band.
  const footnoteH = s.footnote ? CQW * 1.1 + pt(TYPE.footnote.size) * 1.3 : 0;
  const bandH = PAGE.bandBottom - PAGE.bandTop - footnoteH;
  const nameH = pt(16.8) * 1.2;
  const weeksH = pt(12.5) * 1.3;
  const detailH = Math.max(
    0.6,
    bandH - dot - nameH - weeksH - CQW * 0.9 * 3 - 0.1,
  );
  const stackH = dot + nameH + weeksH + detailH + CQW * 0.9 * 3;
  const top = PAGE.bandTop + Math.max(0, (bandH - stackH) / 2);

  // One hairline connector behind every dot, at the dot's vertical centre.
  slide.addShape(pptx.ShapeType.rect, {
    x: PAGE.marginX,
    y: top + dot / 2 - CQW * 0.08,
    w: BAND_W,
    h: CQW * 0.16,
    fill: { color: t.border },
    line: { color: t.border },
  });

  s.phases.forEach((p, i) => {
    const x = PAGE.marginX + i * (colW + colGap);
    const fill = t.gradient[i % t.gradient.length];

    slide.addShape(pptx.ShapeType.ellipse, {
      x,
      y: top,
      w: dot,
      h: dot,
      fill: { color: fill },
      line: { color: fill },
    });
    slide.addText(String(i + 1), {
      x,
      y: top,
      w: dot,
      h: dot,
      fontSize: 11,
      color: textColorFor(fill),
      align: "center",
      valign: "middle",
      fontFace: t.font,
    });

    let y = top + dot + CQW * 0.9;
    slide.addText(p.name, {
      x,
      y,
      w: colW,
      h: nameH,
      fontSize: fitFontSize(p.name, colW, nameH, 16.8, 11),
      bold: true,
      color: t.black,
      valign: "top",
      fontFace: t.font,
      fit: "shrink",
    });

    y += nameH + CQW * 0.9;
    slide.addText(p.weeks.toUpperCase(), {
      x,
      y,
      w: colW,
      h: weeksH,
      fontSize: 12.5,
      color: accent,
      valign: "top",
      fontFace: t.font,
      charSpacing: 0.6,
    });

    y += weeksH + CQW * 0.9;
    slide.addText(p.detail, {
      x,
      y,
      w: colW,
      h: detailH,
      fontSize: fitFontSize(p.detail, colW, detailH, 12.5, 7),
      color: t.slideBody,
      valign: "top",
      fontFace: t.font,
      fit: "shrink",
    });
  });

  if (s.footnote) {
    slide.addText(s.footnote, {
      x: PAGE.marginX,
      y: PAGE.bandBottom - footnoteH + CQW * 1.1,
      w: BAND_W,
      h: footnoteH - CQW * 1.1,
      fontSize: TYPE.footnote.size,
      color: t.gray700,
      valign: "top",
      fontFace: t.font,
      fit: "shrink",
    });
  }
}

/** EXE-06 (spec §4.30) — team profile grid, 2 columns. The `dark` variant
 * is the only inverted slide in the system. */
function addTeamSlide(ctx: Ctx, s: Of<"team">) {
  const { slide, pptx, t } = ctx;
  const dark = s.variant === "dark";
  const accent = accentFor(t, s.domain);
  const nameColor = dark ? t.white : t.black;
  const bioColor = dark ? t.gray100 : t.slideBody;

  // The title block is black-on-white by construction; on the dark variant
  // it needs its own inverted pass rather than the shared helper.
  if (dark) {
    slide.addText(
      [
        {
          text: `${s.sectionLabel.toUpperCase()}:`,
          options: {
            color: accent,
            bold: true,
            breakLine: true,
            fontSize: TYPE.sectionLabel.size,
          },
        },
        {
          text: s.assertion.toUpperCase(),
          options: {
            color: t.white,
            bold: true,
            fontSize: fitFontSize(
              s.assertion,
              BAND_W,
              PAGE.titleH - 0.21,
              TYPE.assertion.size,
              TYPE.sectionLabel.size + 2,
            ),
          },
        },
      ],
      {
        x: PAGE.marginX,
        y: PAGE.marginTop,
        w: BAND_W,
        h: PAGE.titleH,
        fontFace: t.font,
        valign: "top",
        fit: "shrink",
        lineSpacingMultiple: 0.95,
      },
    );
  } else {
    titleBlock(ctx, {
      sectionLabel: s.sectionLabel,
      assertion: s.assertion,
      page: s.page,
      accent,
    });
  }

  // Renderer: a 2-column grid, `content-start`, gap-x 2.4cqw / gap-y 1.6cqw,
  // each cell an avatar of 3.8cqw with name/role/bio stacked to its right.
  const gapX = CQW * 2.4;
  const gapY = CQW * 1.6;
  const colW = (BAND_W - gapX) / 2;
  const avatar = CQW * 3.8;
  const textX = CQW * 1.2;
  const textW = colW - avatar - textX;

  const rows = Math.ceil(s.people.length / 2);
  const rowH = (PAGE.bandBottom - PAGE.bandTop - gapY * (rows - 1)) / rows;
  const nameH = pt(15.4) * 1.2;
  const roleH = pt(10.6) * 1.3;
  const gapStack = CQW * 0.25;

  s.people.forEach((p, i) => {
    const x = PAGE.marginX + (i % 2) * (colW + gapX);
    const y = PAGE.bandTop + Math.floor(i / 2) * (rowH + gapY);
    const fill = dark ? accent : t.gradient[i % t.gradient.length];

    slide.addShape(pptx.ShapeType.ellipse, {
      x,
      y,
      w: avatar,
      h: avatar,
      fill: { color: fill },
      line: { color: fill },
    });
    slide.addText(p.initials, {
      x,
      y,
      w: avatar,
      h: avatar,
      fontSize: 13.4,
      bold: true,
      color: textColorFor(fill),
      align: "center",
      valign: "middle",
      fontFace: t.font,
    });

    const tx = x + avatar + textX;
    slide.addText(p.name, {
      x: tx,
      y,
      w: textW,
      h: nameH,
      fontSize: fitFontSize(p.name, textW, nameH, 15.4, 10),
      bold: true,
      color: nameColor,
      valign: "top",
      fontFace: t.font,
      fit: "shrink",
    });
    slide.addText(p.role.toUpperCase(), {
      x: tx,
      y: y + nameH + gapStack,
      w: textW,
      h: roleH,
      fontSize: 10.6,
      color: accent,
      valign: "top",
      fontFace: t.font,
      charSpacing: 0.7,
      fit: "shrink",
    });

    const bioY = y + nameH + roleH + gapStack * 2;
    const bioH = y + rowH - bioY;
    slide.addText(p.bio, {
      x: tx,
      y: bioY,
      w: textW,
      h: bioH,
      fontSize: fitFontSize(p.bio, textW, bioH, 11, 6.5),
      color: bioColor,
      valign: "top",
      fontFace: t.font,
      fit: "shrink",
    });
  });
}

/** COM-01 (spec §4.31) — commercial terms. The cost column carries a
 * persistent tint down the whole table; rules are horizontal only. */
function addCommercialSlide(ctx: Ctx, s: Of<"commercial">) {
  const { t } = ctx;
  const accent = accentFor(t, s.domain);
  titleBlock(ctx, {
    sectionLabel: s.sectionLabel,
    assertion: s.assertion,
    page: s.page,
    accent,
  });

  const rows: (string | { text: string; bold?: boolean; color?: string })[][] =
    s.rows.map((r) => [{ text: r.item, bold: true }, r.description, r.cost]);

  if (s.paymentTerms?.length) {
    rows.push([
      { text: "Payment term", bold: true },
      s.paymentTerms.map((pt) => `${pt.pct}% ${pt.milestone}`).join("\n"),
      "",
    ]);
  }
  if (s.total) {
    rows.push([
      { text: s.totalLabel ?? "Total investment", bold: true },
      "",
      { text: s.total, bold: true, color: accent },
    ]);
  }

  const footnoteH = s.footnote ? 0.3 : 0;
  const tableY = PAGE.bandTop + 0.1;
  const tableH = PAGE.bandBottom - tableY - footnoteH;

  bandedTable(ctx, {
    headers: ["Items", "Description", "Cost (THB)"],
    // commercial-slide.tsx: grid-cols-[1.5fr_1.6fr_0.9fr] less two 1.2cqw gaps
    widths: ((): number[] => {
      const inner = BAND_W - CQW * 1.2 * 2;
      return [1.5, 1.6, 0.9].map((r) => (inner * r) / 4);
    })(),
    rows,
    y: tableY,
    h: tableH,
    headerFill: t.white,
    headerColor: t.gray700,
    horizontalOnly: true,
    bodySize: TYPE.bulletBody.size,
  });

  if (s.footnote) {
    ctx.slide.addText(s.footnote, {
      x: PAGE.marginX,
      y: tableY + tableH + 0.02,
      w: BAND_W,
      h: footnoteH,
      fontSize: TYPE.footnote.size,
      color: t.gray700,
      valign: "top",
      fontFace: t.font,
      fit: "shrink",
    });
  }
}

/**
 * Slide JSON in, real OOXML out. Branding lives in two slide masters
 * (masters.ts) and geometry in the shared primitives (helpers.ts), so a
 * builder here is only ever "map this content onto that layout".
 *
 * `theme` lets a caller restyle an entire deck — accent ramp, font, logo,
 * footer, page numbers — without touching a builder.
 */
export async function buildPptx(
  title: string,
  slides: Slide[],
  theme?: DeckTheme,
): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Balerion";
  pptx.company = "Balerion";
  pptx.title = title;

  const t = resolveTheme(theme ?? {});
  defineMasters(pptx, t);

  for (const s of slides) {
    // A placeholder has no layout to render. Skipping it here rather than
    // only in the client means every entry point — the export route, a
    // future scheduled export — drops it, instead of relying on each caller
    // to remember. The client filters too, so it can report the count.
    if (s.kind === "placeholder") continue;

    // Covers and dividers still get the footer and page number — the
    // reference deck numbers page 1 — but not the corner wordmark, since
    // they carry their own large one.
    const master =
      s.kind === "title" || s.kind === "divider"
        ? COVER_MASTER
        : s.kind === "team" && s.variant === "dark"
          ? DARK_MASTER
          : LIGHT_MASTER;
    const slide = pptx.addSlide({ masterName: master });
    const ctx: Ctx = { slide, pptx, t };

    if (s.notes) slide.addNotes(s.notes);

    switch (s.kind) {
      case "title":
        addTitleSlide(ctx, s);
        break;
      case "divider":
        addDividerSlide(ctx, s);
        break;
      case "summary":
        addSummarySlide(ctx, s);
        break;
      case "bullets":
        addBulletsSlide(ctx, s);
        break;
      case "comparison":
        addComparisonSlide(ctx, s);
        break;
      case "table":
        addTableSlide(ctx, s);
        break;
      case "valueChain":
        addValueChainSlide(ctx, s);
        break;
      case "timeline":
        addTimelineSlide(ctx, s);
        break;
      case "team":
        addTeamSlide(ctx, s);
        break;
      case "commercial":
        addCommercialSlide(ctx, s);
        break;
    }
  }

  const out = await pptx.write({ outputType: "nodebuffer", compression: true });
  return out as Buffer;
}

// Referenced by the layout math above; re-exported so a caller can measure
// against the same band the builders use.
export { PAGE, STROKE };
