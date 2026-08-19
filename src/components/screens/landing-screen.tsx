"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDownIcon,
  FileCheck2,
  FileUp,
  LayoutTemplate,
  Loader2,
  Lock,
  PenLine,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Show, UserButton, useSignIn, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { MiniSlide, type MiniSlideSpec } from "@/components/mini-slide";
import { MicrosoftIcon } from "@/components/oauth-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DECK_SHAPE_OPTIONS,
  DEPTH_OPTIONS,
  estimateReadMinutes,
} from "@/config/deck-shapes";
import { MODEL_OPTIONS, MODEL_LABEL } from "@/lib/models";
import { cn } from "@/lib/utils";
import { ACCEPTED_EXTENSIONS, MAX_FILE_LABEL } from "@/config/upload";

// The dalay before rise animation
const START_FADE_MS = 260;
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

const HEADLINE = [
  "Turn",
  "a",
  "brief",
  "into",
  "a",
  "pitch-ready",
  "deck.",
] as const;
const ACCENT_WORD = "pitch-ready";

const PROMISE_TAGS = [
  "Understanding",
  "Options",
  "Solution",
  "Methodology",
  "Team",
  "Commercials",
];

const STEPS = [
  {
    icon: FileUp,
    label: "Hand over the brief",
    detail: "Drop a document, or paste the text.",
  },
  {
    icon: LayoutTemplate,
    label: "Get the whole deck",
    detail: "Structured 16:9 sections, on-brand.",
  },
  {
    icon: PenLine,
    label: "Revise in plain words",
    detail: "Say what to change; the slide redraws.",
  },
];

const DECK_PREVIEW: MiniSlideSpec[] = (
  [
    { kind: "title", title: "Warehouse Management System" },
    { kind: "summary", title: "Executive Summary" },
    { kind: "bullets", title: "Project Understanding" },
    { kind: "comparison", title: "Option Analysis" },
    { kind: "bullets", title: "Solution Proposal" },
    { kind: "table", title: "Feature Detail" },
    { kind: "timeline", title: "Execution Methodology" },
    { kind: "bullets", title: "Change Management & Governance" },
    { kind: "team", title: "Delivery Team" },
    { kind: "commercial", title: "Commercial Terms" },
  ] as const
).map((s, i) => ({ ...s, num: String(i + 1).padStart(2, "0") }));

const ROW_A = [...DECK_PREVIEW, ...DECK_PREVIEW];
const ROW_B_BASE = [...DECK_PREVIEW.slice(3), ...DECK_PREVIEW.slice(0, 3)];
const ROW_B = [...ROW_B_BASE, ...ROW_B_BASE];

export function LandingScreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const { isSignedIn } = useUser();
  const { signIn } = useSignIn();

  const started = useAppStore((s) => s.started);
  const start = useAppStore((s) => s.start);
  const authing = useAppStore((s) => s.authing);
  const setAuthing = useAppStore((s) => s.setAuthing);
  const brief = useAppStore((s) => s.brief);
  const setBrief = useAppStore((s) => s.setBrief);
  const fileName = useAppStore((s) => s.fileName);
  const parsing = useAppStore((s) => s.parsing);
  const dragging = useAppStore((s) => s.dragging);
  const setDragging = useAppStore((s) => s.setDragging);
  const onFile = useAppStore((s) => s.onFile);
  const model = useAppStore((s) => s.model);
  const setModel = useAppStore((s) => s.setModel);
  const deckShape = useAppStore((s) => s.deckShape);
  const setDeckShape = useAppStore((s) => s.setDeckShape);
  const depth = useAppStore((s) => s.depth);
  const setDepth = useAppStore((s) => s.setDepth);
  const generate = useAppStore((s) => s.generate);

  const chars = brief.trim().length;
  const canGenerate = (!!fileName && !parsing) || chars >= 20;

  const shape =
    DECK_SHAPE_OPTIONS.find((o) => o.id === deckShape) ?? DECK_SHAPE_OPTIONS[0];
  const depthOption =
    DEPTH_OPTIONS.find((o) => o.id === depth) ?? DEPTH_OPTIONS[1];
  const depthIndex = Math.max(
    0,
    DEPTH_OPTIONS.findIndex((o) => o.id === depth),
  );
  const slideCount = shape.sections.length;
  const readMinutes = estimateReadMinutes(deckShape, depth);

  /** Progress toward the 20-character minimum, for the meter. */
  const briefProgress = Math.min(1, chars / 20);

  /** hero → (signed out) auth → form, or hero → (signed in) form directly. */
  const phase: "hero" | "auth" | "form" = started
    ? "form"
    : authing
      ? "auth"
      : "hero";

  // A returning OAuth redirect lands back on "/?authed=1" — drop straight
  // into the form instead of making an already-signed-in visitor click
  // Start twice.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("authed") !== "1") return;
    window.history.replaceState(null, "", window.location.pathname);
    start();
  }, [start]);

  function handleStart() {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => {
      if (isSignedIn) start();
      else setAuthing(true);
      setLeaving(false);
    }, START_FADE_MS);
  }

  /**
   * Start the Microsoft redirect flow.
   *
   * `useSignIn()` is *typed* as Clerk's future resource, whose `sso()` takes
   * `redirectCallbackUrl` — but under a plain `<ClerkProvider>` the object
   * handed back at runtime is still the classic resource, which only has
   * `authenticateWithRedirect`. Calling `sso()` therefore threw
   * "not a function" before any network request, and with no catch the
   * rejection went unhandled and left this button spinning forever.
   *
   * So: use whichever the running SDK actually provides. Both take the same
   * two URLs, only under different names — the callback route must be the one
   * rendering `AuthenticateWithRedirectCallback`, or the handshake never
   * completes and the user lands back signed out.
   */
  async function handleMicrosoftSignIn() {
    if (!signIn || oauthLoading) return;
    setOauthLoading(true);

    const CALLBACK_URL = "/sso-callback";
    const COMPLETE_URL = "/?authed=1";

    const resource = signIn as unknown as {
      sso?: (p: {
        strategy: string;
        redirectUrl: string;
        redirectCallbackUrl: string;
      }) => Promise<{ error?: { message: string; longMessage?: string } }>;
      authenticateWithRedirect?: (p: {
        strategy: string;
        redirectUrl: string;
        redirectUrlComplete: string;
      }) => Promise<unknown>;
    };

    try {
      if (typeof resource.sso === "function") {
        const { error } = await resource.sso({
          strategy: "oauth_microsoft",
          redirectUrl: COMPLETE_URL,
          redirectCallbackUrl: CALLBACK_URL,
        });
        if (error) throw new Error(error.longMessage ?? error.message);
      } else if (typeof resource.authenticateWithRedirect === "function") {
        await resource.authenticateWithRedirect({
          strategy: "oauth_microsoft",
          redirectUrl: CALLBACK_URL,
          redirectUrlComplete: COMPLETE_URL,
        });
      } else {
        throw new Error("This build of Clerk exposes no redirect sign-in.");
      }
    } catch (err) {
      setOauthLoading(false);
      toast.error("Couldn't start sign-in", {
        description:
          err instanceof Error ? err.message : "Try again in a moment.",
      });
    }
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto bg-grain">
      <AmbientBackdrop />

      <div className="relative flex min-h-full w-full flex-col items-center px-6 pt-7 pb-8">
        <header className="flex w-full max-w-180 animate-rise items-center justify-between">
          <span className="group font-display text-[15px] font-semibold tracking-tight text-foreground">
            Purrposal
            <span className="mt-0.5 block h-px w-0 bg-gradient-to-r from-brand-1 to-brand-5 transition-all duration-500 [transition-timing-function:var(--ease-smooth)] group-hover:w-full" />
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full bg-card/70 px-3 py-1.5 font-mono text-[11px] tracking-[0.02em] text-detail ring-1 ring-foreground/8 backdrop-blur-sm">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 animate-halo rounded-full bg-brand-4" />
                <span className="relative size-1.5 rounded-full bg-brand-4" />
              </span>
              nothing leaves this browser
            </span>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </span>
        </header>

        <main
          className={cn(
            "flex w-full max-w-180 flex-1 flex-col items-center text-center",
            phase !== "hero" ? "justify-start pt-8" : "justify-center pt-2",
          )}
        >
          <span
            className="inline-flex animate-rise items-center gap-2 rounded-full bg-highlight/50 px-3.5 py-1.5 font-mono text-[10.5px] tracking-[0.16em] text-foreground/70 uppercase ring-1 ring-foreground/8"
            style={delay(80)}
          >
            Proposal Assistant
          </span>

          <h1
            className={cn(
              "font-display font-semibold text-foreground transition-all duration-700 [transition-timing-function:var(--ease-smooth)]",
              phase !== "hero"
                ? "mt-3 text-[32px] leading-[1.05]"
                : "mt-5 text-[clamp(34px,6.2vw,58px)] leading-[1.04] tracking-[-0.02em]",
            )}
          >
            {HEADLINE.map((word, i) => (
              /* A real space, not a margin — a margin breaks the accessible
                 name and anything the reader copies. */
              <Fragment key={i}>
                {i > 0 ? " " : null}
                <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
                  <span
                    className="inline-block animate-word-up"
                    style={delay(180 + i * 58)}
                  >
                    {word === ACCENT_WORD ? (
                      <span className="relative inline-block">
                        <span
                          aria-hidden
                          className="absolute inset-x-[-0.05em] bottom-[0.055em] -z-10 h-[0.24em] animate-draw-x rounded-[2px] bg-gradient-to-r from-brand-5/70 via-brand-4/48 to-brand-1/28"
                          style={delay(760)}
                        />
                        {word}
                      </span>
                    ) : (
                      word
                    )}
                  </span>
                </span>
              </Fragment>
            ))}
          </h1>

          <div className="text-wrap-pretty mt-4 flex max-w-140 flex-col items-center gap-3 text-[16px] leading-[1.6] text-detail">
            <span className="animate-rise" style={delay(560)}>
              Hand over the client brief, get back a complete proposal, ready to
              pitch.
            </span>
            <span className="flex flex-wrap items-center justify-center gap-1.5">
              {PROMISE_TAGS.map((t, i) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="animate-rise cursor-default bg-card/60 font-mono text-[11px] font-semibold text-detail backdrop-blur-sm transition-all duration-300 [transition-timing-function:var(--ease-smooth)] hover:-translate-y-0.5 hover:border-brand-4/40 hover:bg-highlight/60 hover:text-foreground"
                  style={delay(620 + i * 55)}
                >
                  {t}
                </Badge>
              ))}
            </span>
            <span className="animate-rise" style={delay(960)}>
              Then revise any slide with a plain written note.
            </span>
          </div>

          {phase === "hero" ? (
            <div
              className={cn(
                "flex w-full flex-col items-center transition-opacity duration-250 ease-out",
                leaving ? "opacity-0" : "opacity-100",
              )}
            >
              <div
                className="mt-7 flex animate-rise flex-wrap items-center justify-center gap-x-3 gap-y-1.5 font-mono text-[11.5px] text-detail"
                style={delay(1040)}
              >
                {[
                  "16:9 deck · up to 10+ slides",
                  "PowerPoint or PDF",
                  "rate-card commercials",
                ].map((t, i) => (
                  <span key={t} className="flex items-center gap-3">
                    {i > 0 ? (
                      <span className="hidden h-3 w-px bg-border sm:block" />
                    ) : null}
                    {t}
                  </span>
                ))}
              </div>

              <Button
                size="lg"
                onClick={handleStart}
                className="group/cta mt-8 h-13 animate-rise gap-2 rounded-full px-9 text-[15.5px] shadow-soft-lg"
                style={delay(1100)}
              >
                Start
                <ArrowRight className="size-4 transition-transform duration-300 [transition-timing-function:var(--ease-smooth)] group-hover/cta:translate-x-1" />
              </Button>

              <ol className="mt-14 grid w-full max-w-160 grid-cols-1 gap-3 sm:grid-cols-3">
                {STEPS.map((step, i) => (
                  <li
                    key={step.label}
                    className="group relative flex animate-rise flex-col items-center gap-2.5 rounded-xl bg-card/50 px-4 py-5 text-center ring-1 ring-foreground/6 backdrop-blur-sm transition-all duration-500 [transition-timing-function:var(--ease-smooth)] hover:-translate-y-1 hover:bg-card/80 hover:shadow-soft-lg hover:ring-brand-4/25"
                    style={delay(1180 + i * 90)}
                  >
                    {i > 0 ? (
                      <span
                        aria-hidden
                        className="absolute top-1/2 -left-3 hidden h-px w-3 bg-border sm:block"
                      />
                    ) : null}
                    <span className="relative flex size-9 items-center justify-center rounded-full bg-highlight/60 text-foreground ring-1 ring-foreground/8 transition-colors duration-500 [transition-timing-function:var(--ease-smooth)] group-hover:bg-highlight">
                      <step.icon className="size-4" strokeWidth={1.8} />
                      <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-foreground font-mono text-[8.5px] text-background">
                        {i + 1}
                      </span>
                    </span>
                    <span className="text-[13.5px] leading-tight font-semibold text-foreground">
                      {step.label}
                    </span>
                    <span className="text-wrap-pretty text-[12px] leading-[1.45] text-detail">
                      {step.detail}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : phase === "form" ? (
            <div className="mt-5 flex items-center gap-2.5 font-mono text-[11.5px] text-detail">
              <span key={slideCount} className="animate-rise">
                {String(slideCount).padStart(2, "0")} slides
              </span>
              <span className="size-1 rounded-full bg-border" />
              <span key={readMinutes} className="animate-rise">
                {String(readMinutes).padStart(2, "0")} min read
              </span>
            </div>
          ) : null}

          {phase === "auth" ? (
            <div className="mt-9 flex w-full max-w-100 flex-col gap-4 pb-4">
              <Card
                className="animate-rise shadow-soft-lg ring-foreground/8"
                style={delay(40)}
              >
                <CardContent className="flex flex-col items-center gap-5 py-1 text-center">
                  <span className="animate-rise font-mono text-[10.5px] tracking-[0.09em] text-detail uppercase">
                    <span className="text-foreground/45">01</span> · Sign in to
                    continue
                  </span>

                  {/* Same medallion treatment as the three hero steps, so the
                      auth step reads as part of the same sequence. */}
                  <span
                    className="relative flex size-11 animate-rise items-center justify-center rounded-full bg-highlight/60 text-foreground ring-1 ring-foreground/8"
                    style={delay(120)}
                  >
                    <ShieldCheck className="size-5" strokeWidth={1.7} />
                  </span>

                  <span
                    className="flex animate-rise flex-col gap-1.5"
                    style={delay(180)}
                  >
                    <span className="font-display text-[19px] leading-snug font-semibold tracking-tight text-foreground">
                      Sign in to continue
                    </span>
                    <span className="text-wrap-pretty text-[13.5px] leading-normal text-detail">
                      One click with your Balerion Microsoft account
                    </span>
                  </span>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-11 w-full animate-rise gap-2.5 text-[14px] shadow-soft transition-colors hover:bg-highlight/50"
                    style={delay(240)}
                    disabled={oauthLoading}
                    onClick={handleMicrosoftSignIn}
                  >
                    {oauthLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <MicrosoftIcon className="size-4" />
                    )}
                    {oauthLoading ? "Redirecting…" : "Continue with Microsoft"}
                  </Button>
                  <span
                    className="flex animate-rise items-center gap-1.5 font-mono text-[11px] text-detail"
                    style={delay(300)}
                  >
                    <Lock className="size-3" strokeWidth={2} />
                    Available only within Balerion`s organization
                  </span>

                  <button
                    type="button"
                    onClick={() => setAuthing(false)}
                    className="group flex animate-rise items-center gap-1.5 font-mono text-[11.5px] text-detail transition-colors hover:text-foreground"
                    style={delay(350)}
                  >
                    <ArrowLeft className="size-3 transition-transform duration-300 [transition-timing-function:var(--ease-smooth)] group-hover:-translate-x-0.5" />
                    Back
                  </button>
                </CardContent>
              </Card>
            </div>
          ) : phase === "form" ? (
            <div className="mt-9 flex w-full flex-col gap-6 pb-4 text-left">
              <Card
                className="animate-rise shadow-soft-lg ring-foreground/8 transition-shadow duration-500 [transition-timing-function:var(--ease-smooth)] hover:shadow-lift"
                style={delay(40)}
              >
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10.5px] tracking-[0.09em] text-detail uppercase">
                      <span className="text-foreground/45">01</span> · The input
                    </span>
                    <span
                      key={fileName ? "file" : chars >= 20 ? "typed" : "wait"}
                      className={cn(
                        "flex animate-rise items-center gap-1.5 font-mono text-[10.5px]",
                        canGenerate ? "text-brand-1" : "text-detail",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full transition-colors duration-300",
                          canGenerate ? "bg-brand-4" : "bg-border",
                        )}
                      />
                      {fileName
                        ? "document attached"
                        : chars >= 20
                          ? "brief typed"
                          : "waiting"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="src-file">
                      Source document{" "}
                      <span className="font-normal text-detail">
                        — optional
                      </span>
                    </Label>
                    <input
                      ref={inputRef}
                      id="src-file"
                      type="file"
                      accept={ACCEPTED_EXTENSIONS.join(",")}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onFile(f);
                      }}
                    />
                    <label
                      htmlFor="src-file"
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!dragging) setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) void onFile(f);
                        else setDragging(false);
                      }}
                      className={cn(
                        "group relative flex min-h-19 cursor-pointer items-center gap-3 overflow-hidden rounded-lg border border-dashed p-4 transition-all duration-300 [transition-timing-function:var(--ease-smooth)]",
                        dragging
                          ? "scale-[1.015] border-brand-4 bg-highlight/60 shadow-lift"
                          : "border-[#C9B385] bg-card hover:border-brand-4/50 hover:bg-highlight/30",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute inset-0 bg-[radial-gradient(320px_circle_at_18%_50%,rgba(252,153,71,0.16),transparent_70%)] transition-opacity duration-500",
                          dragging ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span
                        className={cn(
                          "relative flex size-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-300 [transition-timing-function:var(--ease-spring)]",
                          fileName
                            ? "border-brand-4/35 bg-brand-4/10"
                            : dragging
                              ? "-translate-y-0.5 scale-110 border-brand-4/40 bg-card"
                              : "border-border bg-card",
                        )}
                      >
                        {fileName ? (
                          <FileCheck2
                            className="size-4.5 animate-pop-check text-brand-1"
                            strokeWidth={1.8}
                          />
                        ) : (
                          <Upload
                            className="size-4.5 text-foreground transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover:-translate-y-0.5"
                            strokeWidth={1.8}
                          />
                        )}
                      </span>
                      <span className="relative flex min-w-0 flex-col gap-1">
                        <span className="truncate text-sm font-medium text-foreground">
                          {fileName
                            ? fileName
                            : dragging
                              ? "Drop to attach"
                              : "Drop a document, or click to browse"}
                        </span>
                        {fileName ? (
                          <span className="font-mono text-[11.5px] text-detail">
                            {parsing ? (
                              <span className="animate-pulse">Reading…</span>
                            ) : (
                              "Attached · click to replace"
                            )}
                          </span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {ACCEPTED_EXTENSIONS.map((ext) => (
                              <Badge
                                key={ext}
                                variant="outline"
                                className="font-mono text-[10px] text-detail transition-colors duration-300 group-hover:border-brand-4/30"
                              >
                                {ext}
                              </Badge>
                            ))}
                            <span className="self-center font-mono text-[11px] text-detail">
                              {MAX_FILE_LABEL}
                            </span>
                          </span>
                        )}
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="brief">Client brief</Label>
                    <Textarea
                      id="brief"
                      value={brief}
                      onChange={(e) => setBrief(e.target.value)}
                      placeholder="Paste or type the brief — business goals, symptoms, constraints…"
                      className="h-33 resize-none bg-card text-[14px] leading-[1.55] transition-shadow duration-300 [transition-timing-function:var(--ease-smooth)] focus-visible:shadow-soft-lg"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="h-[3px] max-w-36 flex-1 overflow-hidden rounded-full bg-border/70">
                        <span
                          className={cn(
                            "block h-full origin-left rounded-full transition-all duration-500 [transition-timing-function:var(--ease-smooth)]",
                            chars >= 20
                              ? "bg-gradient-to-r from-brand-1 to-brand-5"
                              : "bg-detail/40",
                          )}
                          style={{ width: `${briefProgress * 100}%` }}
                        />
                      </span>
                      <span className="font-mono text-[11.5px] text-detail tabular-nums">
                        {chars} characters
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="animate-rise shadow-soft-lg ring-foreground/8 transition-shadow duration-500 [transition-timing-function:var(--ease-smooth)] hover:shadow-lift"
                style={delay(140)}
              >
                <CardContent className="flex flex-col gap-4.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10.5px] tracking-[0.09em] text-detail uppercase">
                      <span className="text-foreground/45">02</span> · Deck
                      shape
                    </span>
                    <span
                      key={shape.id}
                      className="animate-rise font-mono text-[10.5px] text-detail"
                    >
                      {shape.label.toLowerCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {DECK_SHAPE_OPTIONS.map((opt) => {
                      const on = opt.id === deckShape;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setDeckShape(opt.id)}
                          className={cn(
                            "group relative flex flex-col gap-1.5 overflow-hidden rounded-lg border p-3 text-left transition-all duration-300 [transition-timing-function:var(--ease-smooth)]",
                            on
                              ? "-translate-y-0.5 border-foreground/70 bg-highlight/35 shadow-soft-lg"
                              : "border-border bg-card hover:-translate-y-0.5 hover:border-brand-4/45 hover:shadow-soft-lg",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand-1 to-brand-5 transition-transform duration-500 [transition-timing-function:var(--ease-smooth)]",
                              on ? "scale-x-100" : "scale-x-0",
                            )}
                          />
                          <span className="flex items-center justify-between gap-1.5">
                            <span className="text-[13.5px] font-semibold text-foreground">
                              {opt.label}
                            </span>
                            <span
                              className={cn(
                                "flex size-3.5 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                                on
                                  ? "bg-foreground text-background"
                                  : "bg-muted group-hover:bg-highlight",
                              )}
                            >
                              {on ? (
                                <Check
                                  className="size-2.5 animate-pop-check"
                                  strokeWidth={3}
                                />
                              ) : null}
                            </span>
                          </span>
                          <span className="font-mono text-[10.5px] text-detail">
                            {opt.sections.length} slides
                          </span>
                          <span className="text-wrap-pretty text-[11.5px] leading-[1.45] text-detail">
                            {opt.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Depth</Label>
                    <div
                      role="group"
                      aria-label="Depth"
                      className="relative flex rounded-lg border border-border bg-card p-0.75"
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0.75 left-0.75 rounded-md bg-accent shadow-soft transition-transform duration-[450ms] [transition-timing-function:var(--ease-spring)]"
                        style={{
                          width: "calc((100% - 0.375rem) / 3)",
                          transform: `translateX(${depthIndex * 100}%)`,
                        }}
                      />
                      {DEPTH_OPTIONS.map((opt) => {
                        const on = opt.id === depth;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setDepth(opt.id)}
                            className={cn(
                              "relative z-10 h-8 flex-1 rounded-md text-[12.5px] transition-colors duration-300",
                              on
                                ? "font-semibold text-accent-foreground"
                                : "text-body hover:text-foreground",
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div
                className="relative flex animate-rise flex-wrap items-center justify-between gap-4 overflow-hidden rounded-xl bg-foreground px-5 py-4 shadow-soft-lg"
                style={delay(240)}
              >
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-[radial-gradient(520px_circle_at_88%_50%,rgba(252,153,71,0.20),transparent_70%)] transition-opacity duration-700",
                    canGenerate ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="relative flex min-w-0 flex-col gap-1">
                  <span className="text-[14px] font-semibold text-background">
                    {shape.label} · {slideCount} slides ·{" "}
                    {depthOption.label.toLowerCase()}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-background/60">
                    <span
                      className={cn(
                        "size-1.5 rounded-full transition-colors duration-300",
                        canGenerate ? "bg-brand-5" : "bg-background/30",
                      )}
                    />
                    {canGenerate
                      ? "Ready · Sonnet-drafted, editable slide by slide"
                      : "Attach a document or type 20+ characters"}
                  </span>
                </div>
                <div className="relative flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      id="model-landing"
                      className="flex h-11 min-w-32 items-center justify-between gap-1.5 rounded-lg border border-background/25 bg-transparent px-2.5 text-sm text-background transition-colors duration-300 hover:bg-background/10 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-background/70"
                    >
                      {MODEL_LABEL[model] ?? model}
                      <ChevronDownIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuRadioGroup
                        value={model}
                        onValueChange={(v) => v && setModel(v)}
                      >
                        {MODEL_OPTIONS.map((o) => (
                          <DropdownMenuRadioItem key={o.value} value={o.value}>
                            {o.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    size="lg"
                    disabled={!canGenerate}
                    onClick={() => void generate()}
                    className="group/gen h-11 gap-2 bg-background px-6 text-[14px] text-foreground hover:bg-background/90"
                  >
                    Generate deck
                    <ArrowRight className="size-4 transition-transform duration-300 [transition-timing-function:var(--ease-smooth)] group-hover/gen:translate-x-1" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </main>

        {phase === "hero" ? (
          /* Outside <main> so the hero centres above it. Hovering pauses
             both tracks. */
          <div
            className={cn(
              "mt-14 w-screen animate-rise transition-opacity duration-250 ease-out",
              leaving ? "opacity-0" : "opacity-100",
            )}
            style={delay(1460)}
          >
            <div
              aria-hidden
              className="group/marquee flex flex-col gap-4 [mask-image:linear-gradient(90deg,transparent_0,black_11%,black_89%,transparent_100%)] [-webkit-mask-image:linear-gradient(90deg,transparent_0,black_11%,black_89%,transparent_100%)]"
            >
              <div className="overflow-hidden">
                <div className="flex w-max animate-marquee group-hover/marquee:[animation-play-state:paused]">
                  {ROW_A.map((s, i) => (
                    <MiniSlide key={`a-${i}`} {...s} />
                  ))}
                </div>
              </div>
              <div className="overflow-hidden opacity-65">
                <div className="flex w-max animate-marquee-reverse group-hover/marquee:[animation-play-state:paused]">
                  {ROW_B.map((s, i) => (
                    <MiniSlide key={`b-${i}`} {...s} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <footer
          className="mt-9 flex animate-rise items-center gap-3 font-mono text-[11px] text-detail"
          style={delay(1560)}
        >
          <span>Powered by Anthropic&rsquo;s Claude</span>
          <span className="h-3 w-px bg-border" />
          <span>Made by Josh Perry</span>
        </footer>
      </div>
    </div>
  );
}
