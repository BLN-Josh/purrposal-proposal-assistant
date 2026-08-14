import pptxgen from "pptxgenjs";
import type { Slide } from "@/lib/slides/schema";
import { PPTX_THEME as T, LIGHT_MASTER, DARK_MASTER } from "./theme";
import { defineMasters } from "./masters";
import { addHeader, hr, dot } from "./helpers";

function addTitleSlide(pptx: pptxgen, s: Extract<Slide, { kind: "title" }>) {
  // No master — covers carry no page number/footer in the reference decks.
  const slide = pptx.addSlide();
  slide.background = { color: T.ink };
  slide.addText("BALERION", { x: 0.6, y: 0.4, w: 3, h: 0.4, fontSize: 16, bold: true, color: T.red, fontFace: T.font });
  slide.addText(s.eyebrow.toUpperCase(), { x: 0.65, y: 2.5, w: 10, h: 0.4, fontSize: 12, color: T.gold, fontFace: T.font, charSpacing: 2 });
  slide.addText(s.title, { x: 0.65, y: 2.95, w: 11.8, h: 1.5, fontSize: 40, bold: true, color: T.white, fontFace: T.font });
  slide.addText(s.subtitle, { x: 0.65, y: 4.35, w: 10.5, h: 0.5, fontSize: 16, color: "CCCCCC", fontFace: T.font });
  hr(slide, pptx, { x: 0.65, y: 5.0, w: 1.2, h: 0.05, color: T.red });
  slide.addText(s.footer, { x: 0.65, y: 6.85, w: 8, h: 0.35, fontSize: 10, color: T.faint, fontFace: T.font });
}

function addSummarySlide(pptx: pptxgen, s: Extract<Slide, { kind: "summary" }>) {
  const slide = pptx.addSlide({ masterName: LIGHT_MASTER });
  addHeader(slide, pptx, s.title, s.subtitle);
  let y = 1.85;
  const rowH = 1.15;
  for (const r of s.rows) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.6, y, w: 2.1, h: rowH - 0.2, fill: { color: T.red }, line: { color: T.red },
      shadow: { type: "outer", color: "000000", opacity: 0.18, blur: 6, offset: 2, angle: 90 },
    });
    slide.addText(r.label.toUpperCase(), {
      x: 0.6, y, w: 2.1, h: rowH - 0.2, fontSize: 11, bold: true, color: T.white, align: "center", valign: "middle", fontFace: T.font,
    });
    slide.addText(r.text, { x: 2.9, y, w: 9.7, h: rowH - 0.2, fontSize: 12, color: T.ink, valign: "middle", fontFace: T.font });
    y += rowH;
  }
}

function addBulletsSlide(pptx: pptxgen, s: Extract<Slide, { kind: "bullets" }>) {
  const slide = pptx.addSlide({ masterName: LIGHT_MASTER });
  addHeader(slide, pptx, s.title, s.subtitle);
  let y = 1.95;
  for (const b of s.bullets) {
    dot(slide, pptx, { x: 0.65, y: y + 0.1, d: 0.09, color: T.red });
    slide.addText(b.text, { x: 0.92, y, w: 11.4, h: 0.55, fontSize: 14, color: T.ink, valign: "top", fontFace: T.font });
    y += 0.68;
  }
}

function addComparisonSlide(pptx: pptxgen, s: Extract<Slide, { kind: "comparison" }>) {
  const slide = pptx.addSlide({ masterName: LIGHT_MASTER });
  addHeader(slide, pptx, s.title, s.subtitle);
  const colW = 3.75;
  const gap = 0.25;
  const startX = 0.6;
  s.cols.forEach((c, i) => {
    const x = startX + i * (colW + gap);
    slide.addShape(pptx.ShapeType.rect, {
      x, y: 1.8, w: colW, h: 4.6,
      fill: { color: c.recommended ? T.highlightTint : T.white },
      line: { color: c.recommended ? T.red : T.border, width: c.recommended ? 1.5 : 1 },
      shadow: c.recommended
        ? { type: "outer", color: "000000", opacity: 0.15, blur: 10, offset: 3, angle: 90 }
        : undefined,
    });
    slide.addText(c.name, { x: x + 0.2, y: 2.0, w: colW - 1.1, h: 0.4, fontSize: 15, bold: true, color: T.ink, fontFace: T.font });
    if (c.recommended) {
      slide.addText("PICK", {
        x: x + colW - 1.05, y: 2.0, w: 0.85, h: 0.35, fontSize: 10, bold: true, color: T.white,
        fill: { color: T.red }, align: "center", valign: "middle", fontFace: T.font,
      });
    }
    slide.addText(`Cost: ${c.cost}`, { x: x + 0.2, y: 2.6, w: colW - 0.4, h: 0.3, fontSize: 11, color: T.gray, fontFace: T.font });
    slide.addText(`Time: ${c.time}`, { x: x + 0.2, y: 2.95, w: colW - 0.4, h: 0.3, fontSize: 11, color: T.gray, fontFace: T.font });
    slide.addText(c.fit, { x: x + 0.2, y: 3.4, w: colW - 0.4, h: 2.8, fontSize: 11, color: T.ink, valign: "top", fontFace: T.font });
  });
}

function addTableSlide(pptx: pptxgen, s: Extract<Slide, { kind: "table" }>) {
  const slide = pptx.addSlide({ masterName: LIGHT_MASTER });
  addHeader(slide, pptx, s.title, s.subtitle);

  const headerCellOpts: pptxgen.TableCellProps = {
    fontSize: 10.5, bold: true, color: T.ink, fill: { color: "F0F0F0" }, fontFace: T.font, valign: "middle",
  };
  const cellOpts: pptxgen.TableCellProps = { fontSize: 10, color: T.ink, fontFace: T.font, valign: "top" };
  const mutedCellOpts: pptxgen.TableCellProps = { fontSize: 9.5, color: T.gray, fontFace: T.font, valign: "top" };

  const rows: pptxgen.TableRow[] = [
    [
      { text: "Feature", options: headerCellOpts },
      { text: "Description", options: headerCellOpts },
      { text: "Details", options: headerCellOpts },
      { text: "Action support", options: headerCellOpts },
    ],
    ...s.rows.map<pptxgen.TableRow>((r) => [
      { text: r.c1, options: { ...cellOpts, bold: true } },
      { text: r.c2, options: cellOpts },
      { text: r.c3, options: cellOpts },
      { text: r.c4, options: mutedCellOpts },
    ]),
  ];

  slide.addTable(rows, {
    x: 0.6,
    y: 1.7,
    w: 12.13,
    colW: [2.2, 3.93, 3.9, 2.1],
    border: { type: "solid", color: T.border, pt: 0.5 },
    autoPage: false,
  });
}

function addTimelineSlide(pptx: pptxgen, s: Extract<Slide, { kind: "timeline" }>) {
  const slide = pptx.addSlide({ masterName: LIGHT_MASTER });
  addHeader(slide, pptx, s.title, s.subtitle);

  const n = s.phases.length;
  const totalW = 11.9;
  const startX = 0.65;
  const colW = totalW / n;
  const lineY = 2.35;

  hr(slide, pptx, { x: startX, y: lineY, w: totalW, h: 0.03 });

  s.phases.forEach((p, i) => {
    const x = startX + colW * i;
    dot(slide, pptx, { x, y: lineY - 0.24, d: 0.48, color: T.red });
    slide.addText(p.n, {
      x, y: lineY - 0.24, w: 0.48, h: 0.48, fontSize: 12, bold: true, color: T.white, align: "center", valign: "middle", fontFace: T.font,
    });
    slide.addText(p.name, { x, y: lineY + 0.42, w: colW - 0.2, h: 0.35, fontSize: 14, bold: true, color: T.ink, fontFace: T.font });
    slide.addText(p.weeks, { x, y: lineY + 0.8, w: colW - 0.2, h: 0.3, fontSize: 11, bold: true, color: T.red, fontFace: T.font });
    slide.addText(p.detail, { x, y: lineY + 1.15, w: colW - 0.3, h: 1.7, fontSize: 10, color: T.gray, valign: "top", fontFace: T.font });
  });
}

function addTeamSlide(pptx: pptxgen, s: Extract<Slide, { kind: "team" }>) {
  const slide = pptx.addSlide({ masterName: DARK_MASTER });
  slide.addText(s.title, { x: 0.6, y: 0.5, w: 10, h: 0.5, fontSize: 24, bold: true, color: T.white, fontFace: T.font });
  slide.addText(s.subtitle, { x: 0.6, y: 1.0, w: 10, h: 0.4, fontSize: 13, color: "AAAAAA", fontFace: T.font });

  const cols = 2;
  const colW = 5.95;
  const rowGap = 1.5;
  const startX = 0.6;
  const startY = 1.9;

  s.people.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (colW + 0.6);
    const y = startY + row * rowGap;
    dot(slide, pptx, { x, y, d: 0.7, color: T.gold });
    slide.addText(p.initials, { x, y, w: 0.7, h: 0.7, fontSize: 14, bold: true, color: T.ink, align: "center", valign: "middle", fontFace: T.font });
    slide.addText(p.name, { x: x + 0.85, y, w: colW - 0.9, h: 0.35, fontSize: 14, bold: true, color: T.white, fontFace: T.font });
    slide.addText(p.role, { x: x + 0.85, y: y + 0.35, w: colW - 0.9, h: 0.3, fontSize: 11, color: T.red, fontFace: T.font });
    slide.addText(p.yrs, { x: x + 0.85, y: y + 0.65, w: colW - 0.9, h: 0.3, fontSize: 10, color: T.faint, fontFace: T.font });
  });
}

function addCommercialSlide(pptx: pptxgen, s: Extract<Slide, { kind: "commercial" }>) {
  const slide = pptx.addSlide({ masterName: LIGHT_MASTER });
  addHeader(slide, pptx, s.title, s.subtitle);

  let y = 1.85;
  for (const r of s.rows) {
    hr(slide, pptx, { x: 0.6, y: y - 0.05, w: 11.7, h: 0.01 });
    slide.addText(r.c1, { x: 0.6, y, w: 6.6, h: 0.4, fontSize: 12, color: T.ink, fontFace: T.font, valign: "middle" });
    slide.addText(r.c2, { x: 8.0, y, w: 1.8, h: 0.4, fontSize: 12, color: T.gray, align: "right", fontFace: T.font, valign: "middle" });
    slide.addText(r.c3, { x: 9.9, y, w: 2.4, h: 0.4, fontSize: 12, color: T.ink, align: "right", fontFace: T.font, valign: "middle" });
    y += 0.52;
  }

  hr(slide, pptx, { x: 0.6, y, w: 11.7, h: 0.025, color: T.ink });
  y += 0.18;
  slide.addText(s.totalLabel, { x: 0.6, y, w: 6.6, h: 0.45, fontSize: 15, bold: true, color: T.ink, fontFace: T.font });
  slide.addText(s.total, { x: 9.9, y, w: 2.4, h: 0.45, fontSize: 15, bold: true, color: T.red, align: "right", fontFace: T.font });
  y += 0.65;
  slide.addText(s.footnote, { x: 0.6, y, w: 11.7, h: 0.4, fontSize: 9, color: T.faint, fontFace: T.font });
}

/** One compile function, one job: slide JSON in, real OOXML out — the
 * highest-risk piece of the system (Technical Design Document §3.3).
 * Branding lives in two slide masters (masters.ts) so every content slide
 * gets a consistent footer/page-number for free instead of repeating it
 * per builder. */
export async function buildPptx(title: string, slides: Slide[]): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Balerion";
  pptx.company = "Balerion";
  pptx.title = title;
  defineMasters(pptx);

  for (const slide of slides) {
    switch (slide.kind) {
      case "title":
        addTitleSlide(pptx, slide);
        break;
      case "summary":
        addSummarySlide(pptx, slide);
        break;
      case "bullets":
        addBulletsSlide(pptx, slide);
        break;
      case "comparison":
        addComparisonSlide(pptx, slide);
        break;
      case "table":
        addTableSlide(pptx, slide);
        break;
      case "timeline":
        addTimelineSlide(pptx, slide);
        break;
      case "team":
        addTeamSlide(pptx, slide);
        break;
      case "commercial":
        addCommercialSlide(pptx, slide);
        break;
    }
  }

  const out = await pptx.write({ outputType: "nodebuffer", compression: true });
  return out as Buffer;
}
