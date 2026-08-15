import fs from "node:fs";
import path from "node:path";
import pptxgen from "pptxgenjs";
import {
  PAGE, TYPE, LOGO, LIGHT_MASTER, DARK_MASTER, COVER_MASTER, LOGO_DIR, isSafeLogoFile,
  type ResolvedTheme,
} from "./theme";

/**
 * Spec §1.4 "persistent furniture": every non-cover slide carries the same
 * logo top-right and the same footer bottom-right. Defining it on two slide
 * masters is what makes the deck read as one document instead of N pages,
 * and costs one definition instead of a repeat in every builder.
 *
 * Two masters, not one, because EXE-06 has an inverted "dark" variant — the
 * only inverted slide in the system (spec §4.30).
 */

const logoCache = new Map<string, string>();

/**
 * The single place the process reads a brand asset from disk — the cover
 * builder calls this too rather than opening its own handle, so there is one
 * path-validation site instead of two that can drift apart.
 *
 * Returns a data URI rather than a path so nothing downstream depends on a
 * filesystem layout at render time (serverless included), and so the bytes
 * are read once per process rather than once per slide.
 */
export function loadLogoData(fileName: string): string | null {
  const cached = logoCache.get(fileName);
  if (cached) return cached;

  if (!isSafeLogoFile(fileName)) {
    console.warn(`[pptx] refusing logo "${fileName}" — must be a bare image filename in ${LOGO_DIR}`);
    return null;
  }

  try {
    // The literal directory segment is what keeps Turbopack's tracing scoped
    // to public/brand instead of the whole project. Do not hoist it into a
    // variable joined at the call site.
    const dir = path.join(process.cwd(), "public/brand");
    const abs = path.join(dir, fileName);

    // Defence in depth: even with the filename validated, never read outside
    // the brand directory.
    if (path.dirname(path.resolve(abs)) !== path.resolve(dir)) {
      console.warn(`[pptx] refusing logo "${fileName}" — resolves outside ${LOGO_DIR}`);
      return null;
    }

    const ext = path.extname(abs).slice(1).toLowerCase() || "png";
    const data = `image/${ext};base64,${fs.readFileSync(abs).toString("base64")}`;
    logoCache.set(fileName, data);
    return data;
  } catch {
    // A missing brand asset should degrade to an unbranded deck, not a 500.
    console.warn(`[pptx] logo "${fileName}" not readable in ${LOGO_DIR} — exporting without it`);
    return null;
  }
}

type MasterObject = NonNullable<pptxgen.SlideMasterProps["objects"]>[number];

function furniture(t: ResolvedTheme, onDark: boolean, withLogo = true): MasterObject[] {
  const objects: MasterObject[] = [];

  if (withLogo && t.logoFile) {
    const data = loadLogoData(t.logoFile);
    if (data) {
      objects.push({
        image: { data, x: LOGO.x, y: LOGO.y, w: LOGO.w, h: LOGO.w / LOGO.aspect },
      });
    }
  }

  if (t.footerLabel) {
    objects.push({
      text: {
        text: t.footerLabel,
        options: {
          x: PAGE.w - 3.0, y: PAGE.h - 0.4, w: 2.2, h: 0.25,
          fontSize: TYPE.footerLabel.size,
          color: onDark ? t.gray500 : t.gray500,
          align: "right", fontFace: t.font,
        },
      },
    });
  }

  return objects;
}

function slideNumberProps(t: ResolvedTheme, onDark: boolean) {
  if (!t.showPageNumbers) return undefined;
  return {
    x: PAGE.w - 0.73, y: PAGE.h - 0.4, w: 0.4, h: 0.25,
    fontSize: TYPE.footerPage.size,
    bold: true,
    color: onDark ? t.white : t.black,
    fontFace: t.font,
    align: "right" as const,
  };
}

export function defineMasters(pptx: pptxgen, t: ResolvedTheme) {
  pptx.defineSlideMaster({
    title: LIGHT_MASTER,
    background: { color: t.white },
    slideNumber: slideNumberProps(t, false),
    objects: furniture(t, false),
  });

  pptx.defineSlideMaster({
    title: DARK_MASTER,
    background: { color: t.black },
    slideNumber: slideNumberProps(t, true),
    objects: furniture(t, true),
  });

  // Footer and page number, no corner wordmark — see COVER_MASTER.
  pptx.defineSlideMaster({
    title: COVER_MASTER,
    background: { color: t.white },
    slideNumber: slideNumberProps(t, false),
    objects: furniture(t, false, false),
  });
}
