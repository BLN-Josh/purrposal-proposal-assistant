"use client";

import { useEffect, useRef } from "react";

/**
 * The paper the landing page is printed on.
 *
 * Three slow warm washes, a hairline grid masked to an ellipse so it never
 * reaches the edges of the viewport, and a spotlight that trails the cursor.
 * Purely decorative — `aria-hidden`, `pointer-events-none`, and behind
 * everything on the negative z-plane, so it can never take a click or a
 * screen-reader stop.
 *
 * The washes are `blur()`-ed radial gradients rather than a single baked
 * background image: a gradient can be animated on the compositor, and three
 * of them drifting on different periods never repeats a frame the way a
 * static hero image does.
 */
export function AmbientBackdrop() {
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = spotRef.current;
    if (!el) return;
    // No hover, no spotlight — on touch the "cursor" is a finger that is
    // already covering the thing it would light up.
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
      // One paint per frame at most: pointermove fires far faster than the
      // display can show the result.
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
      <div className="animate-drift-a absolute -top-[26%] -left-[14%] size-[54vw] min-w-120 rounded-full bg-[radial-gradient(circle,rgba(252,153,71,0.20),transparent_66%)] blur-[40px]" />
      <div className="animate-drift-b absolute -top-[18%] -right-[16%] size-[48vw] min-w-100 rounded-full bg-[radial-gradient(circle,rgba(239,35,60,0.10),transparent_64%)] blur-[46px]" />
      {/* Keeps the fold from going flat. Warm amber, not the clay accent —
          a desaturated brown wash on cream reads as a smudge, not as light. */}
      <div className="animate-drift-a absolute top-[46%] left-[30%] size-[46vw] min-w-90 rounded-full bg-[radial-gradient(circle,rgba(252,153,71,0.13),transparent_68%)] blur-[52px] [animation-delay:-11s]" />

      {/* Faint enough to read as tooth in the paper rather than as a
          wireframe — if you can count the squares, it is too strong. */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(47,16,0,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(47,16,0,0.022)_1px,transparent_1px)] bg-[size:88px_88px] [mask-image:radial-gradient(ellipse_62%_46%_at_50%_32%,black,transparent_70%)]" />

      <div
        ref={spotRef}
        className="absolute inset-0 opacity-0 transition-opacity duration-1000 ease-out bg-[radial-gradient(420px_circle_at_var(--sx,50%)_var(--sy,28%),rgba(252,153,71,0.13),transparent_68%)]"
      />
    </div>
  );
}
