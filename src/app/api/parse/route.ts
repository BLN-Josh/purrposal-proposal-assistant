import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import JSZip from "jszip";
import { del, get } from "@vercel/blob";
import { UNSUPPORTED_FILE_MESSAGE } from "@/config/upload";

export const dynamic = "force-dynamic";

const READ_FAILURE = `Couldn't read that file. ${UNSUPPORTED_FILE_MESSAGE}`;
const NOT_FOUND_MESSAGE =
  "That upload expired or was already used. Attach the file again.";

const NO_TEXT_FOUND =
  "That file has no readable text in it. If it's a scan or an image-only PDF, paste the text directly.";

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numOf = (n: string) =>
        Number(n.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return numOf(a) - numOf(b);
    });

  const slideTexts = await Promise.all(
    slideFiles.map(async (name) => {
      const xml = await zip.files[name].async("text");
      const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) =>
        decodeXmlEntities(m[1]),
      );
      return runs.join(" ").trim();
    }),
  );

  return slideTexts
    .map((text, i) => (text ? `Slide ${i + 1}: ${text}` : null))
    .filter(Boolean)
    .join("\n");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const pathname = typeof body?.pathname === "string" ? body.pathname : null;
  if (!pathname) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }

  // The file already landed in Blob storage via `/api/blob/upload` — this
  // route's only job is to fetch it back and run the same extraction that
  // used to run directly on the request body. `get()` throws on a missing
  // or already-deleted pathname rather than returning null, hence the catch.
  const result = await get(pathname, { access: "private" }).catch(() => null);
  if (!result || result.statusCode !== 200 || !result.stream) {
    return Response.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
  }

  const ext = pathname.split(".").pop()?.toLowerCase();

  try {
    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());

    let extractedText = "";

    if (ext === "pdf") {
      const parser = new PDFParse({ data: buffer });
      const pdfResult = await parser.getText();
      extractedText = pdfResult.text;
      await parser.destroy();
    } else if (ext === "docx") {
      const { value } = await mammoth.extractRawText({ buffer });
      extractedText = value;
    } else if (ext === "pptx") {
      extractedText = await extractPptxText(buffer);
    } else if (ext === "txt" || ext === "md") {
      extractedText = buffer.toString("utf-8");
    } else {
      return Response.json(
        { error: `Unsupported file type. ${UNSUPPORTED_FILE_MESSAGE}` },
        { status: 400 },
      );
    }

    if (!extractedText.trim()) {
      return Response.json({ error: NO_TEXT_FOUND }, { status: 422 });
    }

    return Response.json({ extractedText });
  } catch (err) {
    console.error("[api/parse]", err);
    return Response.json({ error: READ_FAILURE }, { status: 422 });
  } finally {
    // The extracted text is all the store keeps from here on — the raw
    // upload has no further reason to sit in Blob storage, private or not.
    await del(pathname).catch(() => {});
  }
}
