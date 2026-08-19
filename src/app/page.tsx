"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useAppStore, type Screen } from "@/store/app-store";
import { LandingScreen } from "@/components/screens/landing-screen";
import { GeneratingScreen } from "@/components/screens/generating-screen";
import { WorkspaceScreen } from "@/components/screens/workspace-screen";
import { cn } from "@/lib/utils";

const SCREENS: Record<Screen, () => React.ReactElement> = {
  landing: LandingScreen,
  generating: GeneratingScreen,
  workspace: WorkspaceScreen,
};

const FADE_MS = 200;

/** Cross-fades between screens instead of jump-cutting: the outgoing screen
 * fades out, then the incoming one swaps in and fades in over the same
 * duration as globals.css's fade-up utility. */
export default function Home() {
  const screen = useAppStore((s) => s.screen);
  const [displayScreen, setDisplayScreen] = useState(screen);
  const fading = screen !== displayScreen;

  useEffect(() => {
    if (!fading) return;
    const timer = setTimeout(() => setDisplayScreen(screen), FADE_MS);
    return () => clearTimeout(timer);
  }, [fading, screen]);

  // Signing out — from any screen's UserButton, from a second tab, or
  // because the session expired — hard-reloads back to the bare landing
  // hero.
  //
  // A store `reset()` isn't enough on its own: it rewinds the screen but
  // leaves the client alive, so a visitor who signed out while sitting on
  // the landing page kept a usable brief form and a live Generate button.
  // Replacing the document tears down every in-memory copy of the deck,
  // drops any `?authed=1` left on the URL, and re-runs the middleware gate
  // on the way back in — so `started`/`authing` can't survive the sign-out.
  //
  // `isLoaded` guards the first paint, where `isSignedIn` is still
  // undefined; without it the initial undefined → false settle would read
  // as a sign-out and reload a visitor who never signed in at all.
  const { isLoaded, isSignedIn } = useUser();
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (!isLoaded) return;
    if (wasSignedIn.current && !isSignedIn) {
      window.location.replace("/");
      return;
    }
    wasSignedIn.current = isSignedIn === true;
  }, [isLoaded, isSignedIn]);

  const ScreenComponent = SCREENS[displayScreen];

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col transition-opacity duration-200 ease-out",
        fading ? "opacity-0" : "opacity-100",
      )}
    >
      <ScreenComponent />
    </div>
  );
}
