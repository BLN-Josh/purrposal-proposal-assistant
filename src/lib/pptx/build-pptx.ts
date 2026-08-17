import pptxgen from "pptxgenjs";
import type { Slide, DeckTheme } from "@/lib/slides/schema";
import {
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
  chevronRibbon,
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
    y: 2.75,
    w: 5.9,
    h: 0.8,
    fontSize: fitFontSize(s.title, 5.9, 0.8, TYPE.coverTitle.size, 10),
    bold: true,
    color: t.accent,
    align: "right",
    valign: "bottom",
    fontFace: t.font,
    fit: "shrink",
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 9.6,
    y: 3.6,
    w: 3.2,
    h: 0.015,
    fill: { color: t.accent },
    line: { color: t.accent },
  });
  if (s.subtitle) {
    slide.addText(s.subtitle, {
      x: 6.9,
      y: 3.72,
      w: 5.9,
      h: 0.3,
      fontSize: TYPE.bulletBody.size + 1,
      color: t.gray700,
      align: "right",
      fontFace: t.font,
    });
  }
  slide.addText(s.date.toUpperCase(), {
    x: 6.9,
    y: 4.02,
    w: 5.9,
    h: 0.35,
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
    x: 0.55,
    y: 2.75,
    w: 7.9,
    h: 0.8,
    fontSize: fitFontSize(s.sectionName, 7.9, 0.8, TYPE.coverTitle.size, 10),
    bold: true,
    color: t.accent,
    valign: "bottom",
    fontFace: t.font,
    fit: "shrink",
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.55,
    y: 3.6,
    w: 3.2,
    h: 0.015,
    fill: { color: t.accent },
    line: { color: t.accent },
  });
  if (s.deckSubtitle) {
    slide.addText(s.deckSubtitle, {
      x: 0.55,
      y: 3.72,
      w: 7.9,
      h: 0.35,
      fontSize: TYPE.coverDate.size,
      bold: true,
      color: t.black,
      fontFace: t.font,
    });
  }
  if (s.scopeNote) {
    slide.addText(s.scopeNote, {
      x: 0.55,
      y: 5.6,
      w: 6.5,
      h: 0.8,
      fontSize: fitFontSize(s.scopeNote, 6.5, 0.8, TYPE.bulletBody.size, 6),
      color: t.black,
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
    labelW: 1.95,
    labelFill: accentFor(ctx.t, s.domain),
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
      fontSize: fitFontSize(s.intro, BAND_W, 0.42, TYPE.bulletBody.size + 1, 6),
      color: t.black,
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
    labelW: 2.0,
    labelFill: hasLabels ? tintFor(t, s.domain) : accent,
    labelSize: TYPE.boxHeading.size,
    contentFill: t.gray100,
    contentSize: TYPE.boxHeading.size,
    gap: GAP.tight,
  });

  if (s.conclusion) {
    banner(ctx, {
      y: PAGE.bandBottom - conclusionH,
      h: conclusionH,
      text: s.conclusion,
      fill: t.black,
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

  const criteriaW = 4.3;
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
    bodySize: TYPE.bulletBody.size,
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

  const panelX = 0.4;
  const panelW = PAGE.w - panelX * 2;
  const panelY = PAGE.bandTop + 0.1;
  const panelH = PAGE.bandBottom - panelY;
  const tint = tintFor(t, s.domain);

  slide.addShape(pptx.ShapeType.rect, {
    x: panelX,
    y: panelY,
    w: panelW,
    h: panelH,
    fill: { color: tint },
    line: { color: tint },
  });

  const bandW = s.group ? 1.6 : 0.12;
  if (s.group) {
    slide.addText(s.group, {
      x: panelX,
      y: panelY,
      w: bandW,
      h: panelH,
      fontSize: 11,
      bold: true,
      color: t.black,
      align: "center",
      valign: "middle",
      fontFace: t.font,
    });
  }

  // Spec widths 2.15/2.05/4.35/1.55 total 12.1, scaled to the space the
  // vertical band leaves so the table always ends flush with the panel.
  const tableW = panelW - bandW - 0.24;
  const base = [2.15, 2.05, 4.35, 1.55];
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

  const widths = [2.4, 2.6, 2.6, 2.4, 2.2];
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
  for (const block of s.blocks) {
    if (block.caption) {
      ctx.slide.addText(block.caption, {
        x: PAGE.marginX,
        y,
        w: BAND_W,
        h: captionH,
        fontSize: TYPE.boxHeading.size,
        bold: true,
        color: accent,
        valign: "middle",
        fontFace: t.font,
        fit: "shrink",
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
      }) + GAP.normal;
  }
}

/** EXE-02 (spec §4.26, simplified) — chevron phase ribbon over per-phase
 * detail columns. The full Gantt grid is a Tier-2 column-span engine; this
 * is the ribbon + column model without the banded box placement. */
function addTimelineSlide(ctx: Ctx, s: Of<"timeline">) {
  const { t } = ctx;
  const accent = accentFor(t, s.domain);
  titleBlock(ctx, {
    sectionLabel: s.sectionLabel,
    assertion: s.assertion,
    page: s.page,
    accent,
  });

  const n = s.phases.length;
  const ribbonY = PAGE.bandTop + 0.15;
  const ribbonH = 0.4;

  // Walk the brand ramp across the phases so the row reads as progression.
  const stageFill = (i: number) =>
    t.gradient[Math.round((i / Math.max(1, n - 1)) * (t.gradient.length - 1))];

  chevronRibbon(ctx, {
    stages: s.phases.map((p, i) => ({ label: p.name, fill: stageFill(i) })),
    y: ribbonY,
    h: ribbonH,
  });

  const overlap = 0.12;
  const colW = (BAND_W + overlap * (n - 1)) / n;
  const detailTop = ribbonY + ribbonH + 0.58;
  const detailH = PAGE.bandBottom - detailTop - (s.footnote ? 0.34 : 0);
  s.phases.forEach((p, i) => {
    const x = PAGE.marginX + i * (colW - overlap);
    ctx.slide.addText(p.weeks, {
      x,
      y: ribbonY + ribbonH + 0.22,
      w: colW - 0.2,
      h: 0.3,
      fontSize: TYPE.boxHeading.size,
      bold: true,
      color: accent,
      align: "center",
      fontFace: t.font,
    });
    ctx.slide.addText(p.detail, {
      x,
      y: ribbonY + ribbonH + 0.58,
      w: colW - 0.2,
      h: detailH,
      fontSize: fitFontSize(
        p.detail,
        colW - 0.2,
        detailH,
        TYPE.bulletBody.size,
        6,
      ),
      color: t.gray700,
      valign: "top",
      align: "center",
      fontFace: t.font,
      fit: "shrink",
    });
  });

  if (s.footnote) {
    ctx.slide.addText(s.footnote, {
      x: PAGE.marginX,
      y: PAGE.bandBottom - 0.3,
      w: BAND_W,
      h: 0.3,
      fontSize: TYPE.footnote.size,
      italic: true,
      color: accent,
      fontFace: t.font,
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
  const bioColor = dark ? t.gray100 : t.gray700;

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

  const colX = [PAGE.marginX, 6.95];
  const rowCount = Math.ceil(s.people.length / 2);
  const yStart = PAGE.bandTop + 0.2;
  const rowH = (PAGE.bandBottom - yStart) / Math.max(1, rowCount);
  const d = Math.min(1.3, rowH - 0.25);

  s.people.forEach((p, i) => {
    const x = colX[i % 2];
    const y = yStart + Math.floor(i / 2) * rowH;
    const fill = t.gradient[i % t.gradient.length];

    slide.addShape(pptx.ShapeType.ellipse, {
      x,
      y,
      w: d,
      h: d,
      fill: { color: fill },
      line: { color: fill },
    });
    slide.addText(p.initials, {
      x,
      y,
      w: d,
      h: d,
      fontSize: 16,
      bold: true,
      color: textColorFor(fill),
      align: "center",
      valign: "middle",
      fontFace: t.font,
    });

    const tx = x + d + 0.25;
    const tw = 5.85 - d - 0.25;
    slide.addText(p.name, {
      x: tx,
      y,
      w: tw,
      h: 0.3,
      fontSize: fitFontSize(p.name, tw, 0.3, 13, 9),
      bold: true,
      color: nameColor,
      fontFace: t.font,
      fit: "shrink",
    });
    slide.addText(p.role, {
      x: tx,
      y: y + 0.3,
      w: tw,
      h: 0.26,
      fontSize: fitFontSize(p.role, tw, 0.26, 11, 8),
      bold: true,
      color: accent,
      fontFace: t.font,
      fit: "shrink",
    });
    slide.addText(p.bio, {
      x: tx,
      y: y + 0.58,
      w: tw,
      h: rowH - 0.7,
      fontSize: fitFontSize(p.bio, tw, rowH - 0.7, TYPE.bulletBody.size, 6),
      color: bioColor,
      align: "justify",
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
    widths: [2.7, 6.9, 2.6],
    rows,
    y: tableY,
    h: tableH,
    headerFill: accent,
    zebraColumn: 2,
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
      italic: true,
      color: accent,
      valign: "middle",
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
