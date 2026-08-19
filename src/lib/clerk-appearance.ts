import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";

type ClerkAppearance = ComponentProps<typeof ClerkProvider>["appearance"];

/**
 * One appearance for every Clerk-rendered surface — the `UserButton` trigger
 * and its popover, the account-management modal, and any `<SignIn>`/`<SignUp>`
 * card if one is ever mounted.
 *
 * `theme: shadcn` is the base (this project has a `components.json`, so Clerk's
 * shadcn theme already reads the same `--card` / `--primary` / `--muted`
 * variables the rest of the app does). The `variables` block below layers the
 * bits that theme can't know about:
 *
 * - Warm neutrals. The app's greys are brown-tinted (`--detail`, `--body`),
 *   never true grey, so Clerk's secondary text and its ring/shadow/backdrop
 *   are re-pointed at those instead of falling back to black.
 * - The three self-hosted faces from `layout.tsx` — Plex Sans for text, Plex
 *   Mono for codes and metadata, Fraunces (`font-display`) for headings via
 *   the `elements` overrides.
 *
 * Element values are Tailwind class strings. They land in the utilities layer
 * and so win over the theme's `components`-layer classes.
 */
export const clerkAppearance: ClerkAppearance = {
  theme: shadcn,

  variables: {
    colorBackground: "var(--card)",
    colorForeground: "var(--foreground)",
    colorMuted: "var(--muted)",
    colorMutedForeground: "var(--detail)",
    colorNeutral: "var(--foreground)",
    colorPrimary: "var(--primary)",
    colorPrimaryForeground: "var(--primary-foreground)",
    colorInput: "var(--card)",
    colorInputForeground: "var(--foreground)",
    colorBorder: "var(--border)",
    colorDanger: "var(--destructive)",
    colorSuccess: "var(--brand-5)",
    colorWarning: "var(--brand-4)",
    colorShimmer: "var(--highlight)",
    // Focus ring and elevation both tinted with the deep brown foreground,
    // matching globals.css's `shadow-soft-*` rather than a black drop shadow.
    colorRing: "color-mix(in srgb, var(--ring), transparent 55%)",
    colorShadow: "rgba(47, 16, 0, 0.16)",
    colorModalBackdrop:
      "color-mix(in srgb, var(--foreground), transparent 62%)",

    fontFamily: "var(--font-plex-sans)",
    fontFamilyButtons: "var(--font-plex-sans)",
    fontFamilyMono: "var(--font-plex-mono)",
    fontSize: "14px",
    borderRadius: "var(--radius)",
  },

  options: {
    // The landing header already carries the Balerion wordmark, so a second
    // logo inside the card would just repeat it.
    logoPlacement: "none",
    socialButtonsVariant: "blockButton",
    socialButtonsPlacement: "top",
    elevation: "raised",
  },

  elements: {
    // Shells. `ring-1` rather than `border`, to match `ui/card.tsx`.
    cardBox:
      "rounded-xl border-0 bg-card ring-1 ring-foreground/10 shadow-soft-lg",
    popoverBox:
      "rounded-xl border-0 bg-card ring-1 ring-foreground/10 shadow-soft-lg",
    modalBackdrop: "backdrop-blur-sm",
    modalCloseButton:
      "rounded-lg text-detail transition-colors hover:bg-muted hover:text-foreground",
    scrollBox: "rounded-xl",

    // Type. Headings in Fraunces, metadata in Plex Mono.
    headerTitle:
      "font-display text-[19px] leading-snug font-semibold tracking-tight text-foreground",
    headerSubtitle: "text-wrap-pretty text-[13.5px] leading-[1.5] text-detail",
    formHeaderTitle: "font-display text-[17px] font-semibold text-foreground",
    formHeaderSubtitle: "text-[13px] leading-[1.5] text-detail",
    badge: "font-mono text-[10.5px] tracking-[0.02em]",
    formattedDate: "font-mono text-[11.5px] text-detail",
    formattedPhoneNumber: "font-mono text-[13px]",

    // Provider buttons, aligned with `ui/button.tsx`'s outline variant.
    socialButtonsBlockButton:
      "h-11 rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-highlight/50",
    socialButtonsBlockButtonText: "text-[14px] font-medium",
    dividerLine: "bg-border",
    dividerText:
      "font-mono text-[10.5px] tracking-[0.16em] text-detail uppercase",

    // Forms.
    formButtonPrimary:
      "h-11 rounded-lg bg-primary text-[14px] font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/80",
    formButtonReset:
      "rounded-lg text-[13px] text-detail transition-colors hover:bg-muted hover:text-foreground",
    formFieldLabel: "text-[12.5px] font-medium text-foreground",
    formFieldInput: "rounded-lg border-border text-[14px]",
    formFieldHintText: "text-[11.5px] text-detail",
    formFieldErrorText: "text-[11.5px] text-destructive",
    otpCodeFieldInput: "rounded-lg border-border font-mono text-[16px]",

    // Footers. Clerk's own attribution stays put — only toned down.
    footer: "rounded-b-xl bg-muted/40",
    footerActionText: "text-[12.5px] text-detail",
    footerActionLink:
      "font-medium text-foreground underline-offset-2 transition-colors hover:text-brand-1",
    footerPagesLink:
      "font-mono text-[10.5px] text-detail transition-colors hover:text-foreground",

    // `UserButton` — the one Clerk surface this app renders today.
    avatarBox: "ring-1 ring-foreground/10",
    userButtonAvatarBox: "size-8 ring-1 ring-foreground/10",
    userButtonTrigger:
      "rounded-full transition-shadow duration-500 [transition-timing-function:var(--ease-smooth)] hover:shadow-soft focus-visible:ring-3 focus-visible:ring-ring/50",
    userButtonPopoverCard:
      "rounded-xl border-0 bg-card ring-1 ring-foreground/10 shadow-soft-lg",
    userButtonPopoverActionButton:
      "text-[13px] text-body transition-colors hover:bg-highlight/50 hover:text-foreground",
    userButtonPopoverActionButtonIcon: "text-detail",
    userButtonPopoverFooter: "rounded-b-xl bg-muted/40",
    userButtonPopoverFooterPagesLink: "font-mono text-[10.5px] text-detail",

    // Account-management modal.
    navbar: "border-border bg-muted/40",
    navbarButton:
      "rounded-lg text-[13px] text-body transition-colors hover:bg-highlight/50 hover:text-foreground",
    profileSectionTitleText:
      "font-display text-[14px] font-semibold text-foreground",
    profileSectionSubtitleText: "text-[12.5px] text-detail",
    profileSectionPrimaryButton:
      "rounded-lg text-[13px] text-foreground transition-colors hover:bg-highlight/50",
    menuList: "rounded-xl bg-card ring-1 ring-foreground/10 shadow-soft-lg",
    menuItem:
      "rounded-lg text-[13px] text-body transition-colors hover:bg-highlight/50 hover:text-foreground",
    alert: "rounded-lg bg-highlight/50 ring-1 ring-foreground/8",
    alertText: "text-[12.5px] text-body",
  },
};
