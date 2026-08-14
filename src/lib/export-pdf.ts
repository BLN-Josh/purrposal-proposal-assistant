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
const CAPTURE_SCALE = 2;

export async function exportSlidesToPdf(container: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const nodes = Array.from(container.querySelectorAll<HTMLElement>("[data-slide-surface]"));
  if (!nodes.length) throw new Error("No slides to export.");

  try {
    const canvases = await Promise.all(
      nodes.map((node) =>
        html2canvas(node, { scale: CAPTURE_SCALE, backgroundColor: "#ffffff", useCORS: false, logging: false })
      )
    );

    // compress: true shrinks the PDF's internal object streams losslessly —
    // separate from (and in addition to) the per-image compression below.
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [PAGE_W, PAGE_H], compress: true });

    canvases.forEach((canvas, i) => {
      if (i > 0) pdf.addPage([PAGE_W, PAGE_H], "landscape");
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, PAGE_W, PAGE_H, undefined, "FAST");
    });

    pdf.save(filename);
  } catch {
    throw new Error("Couldn't render the PDF. Try again.");
  }
}
