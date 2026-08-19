import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES } from "@/config/upload";

export const dynamic = "force-dynamic";

function hasAcceptedExtension(pathname: string): boolean {
  const ext = "." + (pathname.split(".").pop() ?? "").toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(
    ext as (typeof ACCEPTED_EXTENSIONS)[number],
  );
}

/**
 * Issues client-upload tokens so briefs go straight from the browser to
 * Blob storage, and receives Vercel's completion callback once they land.
 *
 * Both legs post to this same URL (`handleUpload` branches on `body.type`),
 * which is why `proxy.ts` leaves this route unprotected: the completion
 * callback comes from Vercel's servers, not the browser, so it carries no
 * Clerk session to check. `onBeforeGenerateToken` is the actual auth
 * boundary here — Vercel's own docs call this out as required, since
 * without it the route hands out upload tokens to anyone who asks.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const { userId } = await auth();
        if (!userId) throw new Error("Not signed in.");
        if (!hasAcceptedExtension(pathname)) {
          throw new Error("Unsupported file type.");
        }

        return {
          maximumSizeInBytes: MAX_FILE_BYTES,
        };
      },
      onUploadCompleted: async () => {
        // No-op: the browser already has the blob's pathname from
        // `upload()`'s own return value and parses it right after — there's
        // no database row to update. (This also sidesteps the fact that
        // Vercel can't reach this callback on localhost: nothing depends on
        // it running.)
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 400 },
    );
  }
}
