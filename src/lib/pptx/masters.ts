import pptxgen from "pptxgenjs";
import { PPTX_THEME as T, PPTX_PAGE as PAGE, LIGHT_MASTER, DARK_MASTER } from "./theme";

const FOOTER_Y = PAGE.h - 0.42;

/**
 * Two masters carry every content slide's footer + page number (brand
 * wordmark, hairline rule, "N" in the corner) — defined once instead of
 * repeated per slide-kind builder, and it's what makes the deck read as
 * one coherent document (matches the real source decks' per-slide
 * "Strictly Confidential N" footer convention) rather than N independent
 * pages. The cover slide intentionally uses neither master — covers don't
 * carry a page number in the reference decks either.
 */
export function defineMasters(pptx: pptxgen) {
  pptx.defineSlideMaster({
    title: LIGHT_MASTER,
    background: { color: T.white },
    slideNumber: {
      x: PAGE.w - 1.0,
      y: FOOTER_Y,
      w: 0.7,
      h: 0.3,
      fontSize: 9,
      color: T.faint,
      fontFace: T.font,
      align: "right",
    },
    objects: [
      { rect: { x: 0, y: FOOTER_Y, w: PAGE.w, h: 0.008, fill: { color: T.border }, line: { color: T.border } } },
      {
        text: {
          text: "BALERION",
          options: { x: PAGE.marginX, y: FOOTER_Y - 0.02, w: 2, h: 0.3, fontSize: 8, bold: true, color: T.red, fontFace: T.font },
        },
      },
    ],
  });

  pptx.defineSlideMaster({
    title: DARK_MASTER,
    background: { color: T.ink },
    slideNumber: {
      x: PAGE.w - 1.0,
      y: FOOTER_Y,
      w: 0.7,
      h: 0.3,
      fontSize: 9,
      color: "666666",
      fontFace: T.font,
      align: "right",
    },
    objects: [
      {
        text: {
          text: "BALERION",
          options: { x: PAGE.marginX, y: FOOTER_Y - 0.02, w: 2, h: 0.3, fontSize: 8, bold: true, color: T.red, fontFace: T.font },
        },
      },
    ],
  });
}
