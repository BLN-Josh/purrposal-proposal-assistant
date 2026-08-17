"use client";

import { useEffect, useRef } from "react";

export function AmbientBackdrop() {
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = spotRef.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      frame = 0;
      el.style.setProperty("--sx", `${x}px`);
      el.style.setProperty("--sy", `${y}px`);
      el.style.opacity = "1";
    };

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -top-[26%] -left-[14%] size-[54vw] min-w-120 animate-drift-a rounded-full bg-[radial-gradient(circle,rgba(252,153,71,0.20),transparent_66%)] blur-[40px]" />
      <div className="absolute -top-[18%] -right-[16%] size-[48vw] min-w-100 animate-drift-b rounded-full bg-[radial-gradient(circle,rgba(239,35,60,0.10),transparent_64%)] blur-[46px]" />
      <div className="absolute top-[46%] left-[30%] size-[46vw] min-w-90 animate-drift-a rounded-full bg-[radial-gradient(circle,rgba(252,153,71,0.13),transparent_68%)] blur-[52px] [animation-delay:-11s]" />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(47,16,0,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(47,16,0,0.022)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_62%_46%_at_50%_32%,black,transparent_70%)] bg-[size:88px_88px]" />

      <div
        ref={spotRef}
        className="absolute inset-0 bg-[radial-gradient(420px_circle_at_var(--sx,50%)_var(--sy,28%),rgba(252,153,71,0.13),transparent_68%)] opacity-0 transition-opacity duration-1000 ease-out"
      />
    </div>
  );
}
