const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * `report.pdf` -> `report-190826-20-31-34.pdf`.
 *
 * Vercel Blob pathnames must be unique
 */
export function timestampedPathname(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : "";
  const safeBase = base.replace(/[/\\]+/g, "-").trim() || "upload";

  const now = new Date();
  const ddmmyy =
    pad2(now.getDate()) +
    pad2(now.getMonth() + 1) +
    pad2(now.getFullYear() % 100);
  const hhmmss = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(pad2)
    .join("-");

  return `${safeBase}-${ddmmyy}-${hhmmss}${ext}`;
}
