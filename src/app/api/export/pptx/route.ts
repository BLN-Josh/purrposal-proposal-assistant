import { z } from "zod";
import { Slide } from "@/lib/slides/schema";
import { buildPptx } from "@/lib/pptx/build-pptx";
import { slugify } from "@/lib/download";
import { classifyError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  slides: z.array(Slide).min(1),
  title: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Nothing to export yet." }, { status: 400 });
  }

  try {
    const buffer = await buildPptx(parsed.data.title, parsed.data.slides);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${slugify(parsed.data.title)}.pptx"`,
      },
    });
  } catch (err) {
    console.error("[api/export/pptx]", err);
    return Response.json({ error: classifyError(err).message }, { status: 500 });
  }
}
