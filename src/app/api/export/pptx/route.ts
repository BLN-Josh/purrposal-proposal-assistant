import { z } from "zod";
import { Slide, DeckThemeSchema } from "@/lib/slides/schema";
import { buildPptx } from "@/lib/pptx/build-pptx";
import { lintDeck } from "@/lib/slides/validate";
import { slugify } from "@/lib/download";
import { classifyError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  slides: z.array(Slide).min(1),
  title: z.string().min(1),
  /** Optional per-deck restyle (accent ramp, font, logo, footer, page
   * numbers). Omitted means the Balerion default theme. */
  theme: DeckThemeSchema.optional(),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    // "Nothing to export yet" is the right thing to say about a missing or
    // empty deck, and nonsense to say about a malformed theme — the theme is
    // the one field a caller hand-writes, so it gets the specific message.
    const themeIssue = parsed.error.issues.find((i) => i.path[0] === "theme");
    return Response.json(
      {
        error: themeIssue
          ? `Invalid theme: ${themeIssue.path.slice(1).join(".") || "theme"} — ${themeIssue.message}`
          : "Nothing to export yet.",
      },
      { status: 400 }
    );
  }

  try {
    const { title, slides, theme } = parsed.data;

    // The deck-system linter never blocks an export — a warning about a
    // long assertion shouldn't stop someone getting their file. It rides
    // back on a header so the client can surface it after download.
    const findings = lintDeck(slides);
    const errors = findings.filter((f) => f.severity === "error").length;

    const buffer = await buildPptx(title, slides, theme);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${slugify(title)}.pptx"`,
        "X-Deck-Lint": `${errors} errors, ${findings.length - errors} warnings`,
      },
    });
  } catch (err) {
    console.error("[api/export/pptx]", err);
    return Response.json({ error: classifyError(err).message }, { status: 500 });
  }
}
