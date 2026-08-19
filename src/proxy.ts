import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Reachable while signed out:
 *
 * - `/` — the landing hero *is* the sign-in surface, so it has to stay open.
 * - `/sso-callback` — the OAuth handshake route. The visitor is by
 *   definition not yet signed in when Microsoft redirects them back through
 *   it, so gating it would deadlock sign-in.
 * - `/api/blob/upload` — the client-upload token route. Its completion leg
 *   is called by Vercel's own servers, not the browser, so it carries no
 *   Clerk session for this gate to check. Auth for the *other* leg (issuing
 *   the upload token) happens inside that route's `onBeforeGenerateToken`
 *   instead — see the comment there.
 *
 * Everything else is closed. There is no separate `/sign-in` route to send
 * people to, so a signed-out page request lands back on the landing hero.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sso-callback(.*)",
  "/api/blob/upload",
]);

/** API calls get a status code; a 302 to an HTML page is useless to `fetch`. */
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { isAuthenticated } = await auth();
  if (isAuthenticated) return;

  if (isApiRoute(req)) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/", req.url));
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
