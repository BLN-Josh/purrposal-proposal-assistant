import { z } from "zod";
import { Slide, DeckThemeSchema } from "@/lib/slides/schema";
import { buildPptx } from "@/lib/pptx/build-pptx";
import { lintDeck } from "@/lib/slides/validate";
import { slugify } from "@/lib/download";
import { classifyError } from "@/lib/errors";
import { MAX_JSON_BODY_BYTES, OVERSIZE_BODY_MESSAGE, exceedsDeclaredSize } from "@/config/upload";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  slides: z.array(Slide).min(1),
  title: z.string().min(1),
  /** Optional per-deck restyle (accent ramp, font, logo, footer, page
   * numbers). Omitted means the Balerion default theme. */
  theme: DeckThemeSchema.optional(),
});

/**
 * "Nothing to export yet" is the right thing to say about a missing or empty
 * deck, and factually wrong about a deck that has slides and one bad field —
 * so the message is derived from where the failure actually is. The theme
 * branch stays first: it is the one field a caller hand-writes, so it keeps
 * the specific message it already had.
 */
function requestErrorMessage(error: z.ZodError): string {
  const themeIssue = error.issues.find((i) => i.path[0] === "theme");
  if (themeIssue) {
    return `Invalid theme: ${themeIssue.path.slice(1).join(".") || "theme"} — ${themeIssue.message}`;
  }

  const issue = error.issues[0];
  if (issue?.path[0] === "title") return "Give the deck a title before exporting.";

  // A slide issue names the slide by its 1-based position — the number on
  // the card the user is looking at — and the field inside it, so a deck
  // that fails on one slide doesn't read as an empty deck.
  if (issue?.path[0] === "slides" && typeof issue.path[1] === "number") {
    const field = issue.path.slice(2).join(".");
    const where = field ? ` — ${field}: ` : ": ";
    return `Slide ${issue.path[1] + 1} can't be exported${where}${issue.message}`;
  }

  return "Nothing to export yet.";
}

export async function POST(request: Request) {
  if (exceedsDeclaredSize(request, MAX_JSON_BODY_BYTES)) {
    return Response.json({ error: OVERSIZE_BODY_MESSAGE }, { status: 413 });
  }

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: requestErrorMessage(parsed.error) }, { status: 400 });
  }

  // `slides.min(1)` counts placeholders, and buildPptx drops them — so an
  // all-placeholder deck passes validation and builds a valid, zero-slide
  // .pptx that downloads as a working file with nothing in it. Caught here
  // rather than in the builder, which has no way to say what to do about it.
  const renderable = parsed.data.slides.filter((s) => s.kind !== "placeholder").length;
  if (!renderable) {
    return Response.json(
      { error: "Describe your empty slides first — an empty slide has no layout to export." },
      { status: 422 }
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
