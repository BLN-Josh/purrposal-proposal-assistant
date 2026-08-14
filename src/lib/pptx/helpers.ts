import pptxgen from "pptxgenjs";
import { PPTX_THEME as T } from "./theme";

/** Every content slide (all kinds but title/team) opens with the same
 * title + subtitle + accent-bar block — one function instead of six
 * copies. */
export function addHeader(slide: pptxgen.Slide, pptx: pptxgen, title: string, subtitle: string) {
  slide.addText(title, { x: 0.6, y: 0.45, w: 11.5, h: 0.6, fontSize: 24, bold: true, color: T.ink, fontFace: T.font });
  slide.addText(subtitle, { x: 0.6, y: 1.02, w: 11.5, h: 0.4, fontSize: 13, color: T.gray, fontFace: T.font });
  hr(slide, pptx, { x: 0.6, y: 1.5, w: 0.9, h: 0.045, color: T.red });
}

/** A thin filled rectangle used as a rule/divider/accent bar throughout —
 * pptxgenjs has no first-class "line rule" primitive that's simpler than
 * a flat rect, so this is the one shape every builder reaches for. */
export function hr(
  slide: pptxgen.Slide,
  pptx: pptxgen,
  opts: { x: number; y: number; w: number; h?: number; color?: string }
) {
  const { x, y, w, h = 0.02, color = T.border } = opts;
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color }, line: { color } });
}

export function dot(
  slide: pptxgen.Slide,
  pptx: pptxgen,
  opts: { x: number; y: number; d: number; color: string }
) {
  const { x, y, d, color } = opts;
  slide.addShape(pptx.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color }, line: { color } });
}
