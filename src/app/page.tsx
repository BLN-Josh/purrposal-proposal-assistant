"use client";

import { useEffect, useState } from "react";
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
