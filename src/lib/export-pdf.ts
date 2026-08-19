"use client";

/**
 * PDF export renders the exact on-screen slide-card DOM (via html2canvas)
 * rather than a second markup pass — the fidelity decision from the
 * Technical Design Document §0/§2: the same component drives the preview
 * and the export, so what the user edited is what they download.
 *
 * Captures run in parallel (`Promise.all`) rather than one slide at a
 * time — each capture only touches its own DOM node, so there's no shared
 * state to race on, and wall-clock time is roughly the slowest single
 * capture instead of the sum of all of them.
 */
const PAGE_W = 1280;
const PAGE_H = 720;

/**
 * Capture resolution, and why it is not simply "the card on screen".
 *
 * A slide card in the workspace is only as wide as the preview pane leaves
 * it — often 700-800px. Capturing that at scale 2 produced a ~1500px image
 * for a 1280pt page: barely 1:1, which is why the exported PDF read as
 * screen-resolution mush. Instead each slide is re-laid-out off-screen at a
 * fixed STAGE_W and captured at STAGE_SCALE, so the output is always
 * 2560x1440 regardless of the window.
 *
 * This works because the slide is sized entirely in `cqw`: widening its
 * container scales every dimension proportionally, so a 1280px stage is the
 * same design as a 700px card, just resolved at more pixels.
 */
const STAGE_W = 1280;
const STAGE_H = 720;
const STAGE_SCALE = 2;

/** Colour properties html2canvas parses. */
const COLOR_PROPS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "columnRuleColor",
  "fill",
  "stroke",
] as const;

const MODERN_COLOR = /oklab|oklch|color-mix|\blab\(|\blch\(/;

/** sRGB transfer function, linear light → 0-255. */
function toByte(linear: number): number {
  const v =
    linear <= 0.0031308
      ? 12.92 * linear
      : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

/**
 * Oklab → sRGB (Björn Ottosson's matrices). Hand-rolled because no browser
 * API converts it: `getComputedStyle` serializes *to* `oklab()`, and
 * laundering through a canvas `fillStyle` returns the string unchanged.
 */
function oklabToRgb(L: number, a: number, b: number, alpha: number): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const r = toByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = toByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = toByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return alpha >= 1
    ? `rgb(${r}, ${g}, ${bl})`
    : `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

/** `oklab(L a b / A)` and `oklch(L C H / A)` as the browser serializes them. */
function convertModernColor(value: string): string | null {
  const ok =
    /^oklab\(\s*([\d.eE+-]+%?)\s+([\d.eE+-]+%?)\s+([\d.eE+-]+%?)\s*(?:\/\s*([\d.eE+-]+%?)\s*)?\)$/.exec(
      value.trim(),
    );
  const num = (raw: string, scale: number) =>
    raw.endsWith("%") ? (parseFloat(raw) / 100) * scale : parseFloat(raw);

  if (ok) {
    return oklabToRgb(
      num(ok[1], 1),
      num(ok[2], 0.4),
      num(ok[3], 0.4),
      ok[4] ? num(ok[4], 1) : 1,
    );
  }

  const lch =
    /^oklch\(\s*([\d.eE+-]+%?)\s+([\d.eE+-]+%?)\s+([\d.eE+-]+)(?:deg)?\s*(?:\/\s*([\d.eE+-]+%?)\s*)?\)$/.exec(
      value.trim(),
    );
  if (lch) {
    const h = (parseFloat(lch[3]) * Math.PI) / 180;
    const c = num(lch[2], 0.4);
    return oklabToRgb(
      num(lch[1], 1),
      c * Math.cos(h),
      c * Math.sin(h),
      lch[4] ? num(lch[4], 1) : 1,
    );
  }
  return null;
}

/**
 * Rewrite modern colour values in the cloned capture tree to `rgb()`.
 *
 * html2canvas 1.4.1 predates `oklab()`/`oklch()` and throws on them, while
 * Tailwind v4 emits `oklab()` for every opacity modifier — so without this
 * no deck could export to PDF at all.
 *
 * Runs on html2canvas's clone via `onclone`, walking it in lockstep with the
 * original: the live page is never mutated. Values are read from the
 * original because the clone sits in a detached iframe.
 */
function normalizeColorsForCapture(
  source: HTMLElement,
  clone: HTMLElement,
): void {
  const sourceNodes = [
    source,
    ...Array.from(source.querySelectorAll<HTMLElement>("*")),
  ];
  const cloneNodes = [
    clone,
    ...Array.from(clone.querySelectorAll<HTMLElement>("*")),
  ];

  for (let i = 0; i < sourceNodes.length && i < cloneNodes.length; i++) {
    const computed = window.getComputedStyle(sourceNodes[i]);
    const target = cloneNodes[i];

    for (const prop of COLOR_PROPS) {
      const value = computed[prop];
      if (typeof value !== "string" || !MODERN_COLOR.test(value)) continue;
      const rgb = convertModernColor(value);
      // Unconvertible values drop to transparent — losing a hairline beats
      // losing the export.
      target.style.setProperty(
        hyphenate(prop),
        rgb ?? "transparent",
        "important",
      );
    }

    // No safe partial rewrite for these, and neither is load-bearing.
    if (MODERN_COLOR.test(computed.backgroundImage)) {
      target.style.setProperty("background-image", "none", "important");
    }
    if (MODERN_COLOR.test(computed.boxShadow)) {
      target.style.setProperty("box-shadow", "none", "important");
    }
  }
}

function hyphenate(prop: string): string {
  return prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

export async function exportSlidesToPdf(
  container: HTMLElement,
  filename: string,
) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>("[data-slide-surface]"),
  );
  if (!nodes.length) throw new Error("No slides to export.");

  // One off-screen stage, reused for every slide. Captures are therefore
  // serial rather than parallel: a stage per slide would hold N full-size
  // clones live at once, and at 2560x1440 each that is how a large deck runs
  // the tab out of memory.
  const stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  stage.style.cssText = [
    "position:fixed",
    "left:-20000px",
    "top:0",
    `width:${STAGE_W}px`,
    `height:${STAGE_H}px`,
    "overflow:hidden",
    "background:#ffffff",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");
  document.body.appendChild(stage);

  try {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [PAGE_W, PAGE_H],
      compress: true,
    });

    for (let i = 0; i < nodes.length; i++) {
      const clone = nodes[i].cloneNode(true) as HTMLElement;
      clone.style.width = `${STAGE_W}px`;
      clone.style.height = `${STAGE_H}px`;
      stage.replaceChildren(clone);

      const canvas = await html2canvas(clone, {
        scale: STAGE_SCALE,
        width: STAGE_W,
        height: STAGE_H,
        backgroundColor: "#ffffff",
        useCORS: false,
        logging: false,
        onclone: (_doc, cloned) => normalizeColorsForCapture(clone, cloned),
      });

      if (i > 0) pdf.addPage([PAGE_W, PAGE_H], "landscape");
      // PNG with maximum deflate. Lossless, so no JPEG ringing on the
      // hairlines and letterforms these slides are mostly made of — and
      // essential for size: uncompressed, 2560x1440 per page put an 11-slide
      // deck at 116MB.
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        PAGE_W,
        PAGE_H,
        undefined,
        "SLOW",
      );
    }

    pdf.save(filename);
  } catch (cause) {
    // Keep the real error attached — a bare `catch {}` is what let the oklab
    // failure above sit undiagnosed.
    console.error("PDF export failed", cause);
    throw new Error("Couldn't render the PDF. Try again.", { cause });
  } finally {
    stage.remove();
  }
}
