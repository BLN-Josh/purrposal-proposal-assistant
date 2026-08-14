import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import JSZip from "jszip";
import { MAX_FILE_BYTES, UNSUPPORTED_FILE_MESSAGE } from "@/config/upload";

export const dynamic = "force-dynamic";

const READ_FAILURE = `Couldn't read that file. ${UNSUPPORTED_FILE_MESSAGE}`;

/** Bare-bones PPTX text extraction: a .pptx is a zip of XML parts, and each
 * slide's visible text sits in <a:t> runs — good enough to feed an LLM
 * prompt without pulling in a full OOXML parser. */
async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numOf = (n: string) => Number(n.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return numOf(a) - numOf(b);
    });

  const slideTexts = await Promise.all(
    slideFiles.map(async (name) => {
      const xml = await zip.files[name].async("text");
      const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXmlEntities(m[1]));
      return runs.join(" ").trim();
    })
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

/**
 * Never writes the upload to a fixed path on disk — parses entirely from
 * an in-memory buffer, so concurrent uploads from different demo users
 * can't clobber each other (Technical Design Document §6.2).
 */
export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return Response.json(
      { error: `Keep the source document under ${MAX_FILE_BYTES / (1024 * 1024)}MB.` },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let extractedText = "";

    if (ext === "pdf") {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      extractedText = result.text;
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
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      return Response.json({ error: READ_FAILURE }, { status: 422 });
    }

    return Response.json({ extractedText });
  } catch (err) {
    console.error("[api/parse]", err);
    return Response.json({ error: READ_FAILURE }, { status: 422 });
  }
}
