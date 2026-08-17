import type { Slide } from "./schema";
import { PAGE } from "@/lib/pptx/theme";
import { estimateTextHeight } from "@/lib/pptx/helpers";

/**
 * The deck linter from `balerion-deck-system.md` §9.
 *
 * Division of labour with zod: the schema enforces everything *structural*
 * (section label is in the enum, 4–5 summary rows, payment percentages are
 * numbers) because those must hold for the deck to render at all. This file
 * enforces everything *editorial* — word budgets, duplicate assertions,
 * unresolved placeholders, money appearing where it shouldn't. Those are
 * warnings a human should see, not parse failures, so they never block an
 * export.
 *
 * Spec rules deliberately not implemented, and why:
 *  - V03 (section label enum): unrepresentable thanks to the zod enum.
 *  - V06 (option count / one recommended): count is bounded by the schema,
 *    and the recommended half is repaired in lib/slides/repair.ts — a zod
 *    union cannot hold refined members, so it could not live in the schema.
 *  - V12 (one accent family per slide): structurally guaranteed — a slide
 *    carries a single `domain`, so it cannot mix families.
 *  - V09 (UND-07 row cap), V15 (domain mirroring §4↔§6): those layouts and
 *    the section model they need aren't built yet.
 *
 * V14 (nothing overflows the content band) is implemented, but honestly:
 * there is no font metric source in a Node build, so it rests on the
 * estimator in lib/pptx/helpers. It is deliberately tuned to under-report —
 * a missed overflow is a cosmetic bug, a false one sends someone rewriting
 * copy that was already fine.
 */

export type Severity = "error" | "warn";

export interface Finding {
  /** Spec rule id, e.g. "V01". */
  rule: string;
  severity: Severity;
  slideIndex: number;
  slideId: string;
  message: string;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const hasNumeral = (s: string) => /\d/.test(s);

/** Currency mentions the spec wants confined to the summary and commercial
 * slides ("money appears exactly twice"). */
const MONEY =
  /(?:THB|USD|EUR|฿|\$)\s?[\d,.]+|\b\d[\d,.]*\s?(?:mn|million|bn)\b/i;
const PLACEHOLDER = /x{3,}|lorem|ipsum|\bTODO\b|\[insert/i;

/** Every free-text string a slide carries, for the checks that scan prose. */
function textsOf(s: Slide): string[] {
  const out: string[] = [];
  if ("assertion" in s && s.assertion) out.push(s.assertion);
  switch (s.kind) {
    case "title":
      out.push(s.title, s.subtitle ?? "", s.date);
      break;
    case "divider":
      out.push(s.sectionName, s.deckSubtitle ?? "", s.scopeNote ?? "");
      break;
    case "summary":
      for (const r of s.rows) {
        out.push(r.label, ...r.bullets);
        for (const b of r.options ?? []) out.push(b.heading, ...b.bullets);
      }
      break;
    case "bullets":
      out.push(s.intro ?? "", s.conclusion ?? "");
      for (const r of s.rows) out.push(r.label ?? "", r.text);
      break;
    case "comparison":
      for (const c of s.criteria) out.push(c.label, c.descriptor ?? "");
      for (const o of s.options) out.push(o.name, ...o.cells);
      break;
    case "table":
      out.push(s.group ?? "");
      for (const r of s.rows)
        out.push(r.feature, r.description, r.details, r.actionSupport);
      break;
    case "valueChain":
      for (const b of s.blocks) {
        out.push(b.caption ?? "");
        for (const r of b.rows)
          out.push(r.feature, r.task, r.output, r.outcome, r.benefit);
      }
      break;
    case "timeline":
      out.push(s.footnote ?? "");
      for (const p of s.phases) out.push(p.name, p.weeks, p.detail);
      break;
    case "team":
      for (const p of s.people) out.push(p.name, p.role, p.bio);
      break;
    case "commercial":
      out.push(s.footnote ?? "", s.totalLabel ?? "", s.total ?? "");
      for (const r of s.rows) out.push(r.item, r.description, r.cost);
      for (const pt of s.paymentTerms ?? []) out.push(pt.milestone);
      break;
    // An empty slide carries no deck copy — only the user's own note, which
    // is a UI affordance rather than something that ships. Linting it would
    // flag the placeholder for being a placeholder (V17).
    case "placeholder":
      break;
  }
  return out.filter(Boolean);
}

export function lintDeck(slides: Slide[]): Finding[] {
  const findings: Finding[] = [];
  const seenAssertions = new Map<string, number>();
  /** slideIndex → (n, m) for the pagination continuity check. */
  const pages: { i: number; id: string; n: number; m: number }[] = [];

  slides.forEach((s, i) => {
    const id = s.id;
    const add = (rule: string, severity: Severity, message: string) =>
      findings.push({ rule, severity, slideIndex: i, slideId: id, message });

    const texts = textsOf(s);

    if ("assertion" in s && s.assertion) {
      const w = words(s.assertion);
      // V01 — the spec's own decks break this and the result is a 3-line
      // title colliding with content; it is a defect to avoid, not copy.
      if (w < 8 || w > 18) {
        add(
          "V01",
          "error",
          `Assertion is ${w} words; must be 8–18. "${s.assertion.slice(0, 60)}…"`,
        );
      }
      // V02 — if the slide's own data is countable, the headline should say so.
      const dataHasNumeral = texts.slice(1).some(hasNumeral);
      if (dataHasNumeral && !hasNumeral(s.assertion)) {
        add(
          "V02",
          "warn",
          "Slide data contains figures but the assertion states no number.",
        );
      }
      // V16
      const dup = seenAssertions.get(s.assertion.toUpperCase());
      if (dup !== undefined) {
        add(
          "V16",
          "error",
          `Duplicate assertion — same text as slide ${dup + 1}.`,
        );
      } else {
        seenAssertions.set(s.assertion.toUpperCase(), i);
      }
    }

    // V04 — EXEC-01 bullet budget, plus the empty-row case the schema
    // permits so that split rows can omit bullets entirely.
    if (s.kind === "summary") {
      for (const r of s.rows) {
        if (!r.bullets.length && !r.options?.length) {
          add(
            "V04",
            "error",
            `Summary row "${r.label}" has neither bullets nor option boxes.`,
          );
        }
        for (const b of r.bullets) {
          if (words(b) > 16)
            add(
              "V04",
              "error",
              `Summary row "${r.label}" has a ${words(b)}-word bullet (max 16).`,
            );
        }
      }
    }

    // V05 — the pain-point layout wants exactly 5 rows; only meaningful for
    // the labelled (true UND-05) variant, not generic bullet slides.
    if (
      s.kind === "bullets" &&
      s.rows.every((r) => r.label) &&
      s.rows.length !== 5
    ) {
      add(
        "V05",
        "warn",
        `Pain-point slide has ${s.rows.length} rows; the layout is designed for 5.`,
      );
    }

    // V07 — SOL-06's value is the five-column contract being fully populated.
    if (s.kind === "valueChain") {
      for (const block of s.blocks) {
        for (const r of block.rows) {
          for (const [col, val] of Object.entries(r)) {
            if (!val.trim())
              add(
                "V07",
                "error",
                `Value-chain row "${r.feature}" has an empty ${col} cell.`,
              );
            else if (words(val) > 12)
              add(
                "V07",
                "error",
                `Value-chain ${col} cell is ${words(val)} words (max 12).`,
              );
          }
        }
      }
    }

    // V08 — SOL-08 overflows past 3 rows per group; spec wants pagination.
    if (s.kind === "table" && s.rows.length > 3) {
      add(
        "V08",
        "warn",
        `Feature table has ${s.rows.length} rows; split at 3 per slide and paginate (n/m).`,
      );
    }

    // V10
    if (s.kind === "commercial" && s.paymentTerms?.length) {
      const sum = s.paymentTerms.reduce((a, p) => a + p.pct, 0);
      if (Math.abs(sum - 100) > 0.01) {
        add("V10", "error", `Payment terms sum to ${sum}%, not 100%.`);
      }
    }

    // V11 — "money appears exactly twice: once in EXEC-01, once in COM-01".
    if (s.kind !== "summary" && s.kind !== "commercial") {
      const offender = texts.find((x) => MONEY.test(x));
      if (offender) {
        add(
          "V11",
          "warn",
          `Currency figure outside the summary/commercial slides: "${offender.slice(0, 50)}…"`,
        );
      }
    }

    // V17 / V18 — the defects the spec catalogues in the real source decks.
    for (const x of texts) {
      if (PLACEHOLDER.test(x))
        add("V17", "error", `Unresolved placeholder: "${x.slice(0, 50)}…"`);
      const opens = (x.match(/\(/g) ?? []).length;
      const closes = (x.match(/\)/g) ?? []).length;
      if (opens !== closes)
        add("V18", "warn", `Unbalanced parentheses: "${x.slice(0, 50)}…"`);
    }

    // V14 — the row-stack layouts distribute rows evenly across the content
    // band, so what actually overflows is a row's text against its own box,
    // not the slide against the page. Checked for the two kinds that stack.
    if (s.kind === "bullets" || s.kind === "summary") {
      const bandH = PAGE.bandBottom - (PAGE.bandTop + 0.1);
      const rowH = bandH / s.rows.length;
      const labelW = s.kind === "summary" ? 1.95 : 2.0;
      const textW = PAGE.w - PAGE.marginX * 2 - labelW - 0.36;
      const size = s.kind === "summary" ? 9 : 10;

      s.rows.forEach((r, ri) => {
        const body =
          s.kind === "summary"
            ? ("bullets" in r ? r.bullets : []).join("\n")
            : (r as { text: string }).text;
        if (!body) return;
        const needed = estimateTextHeight(body, textW, size);
        if (needed > rowH) {
          add(
            "V14",
            "warn",
            `Row ${ri + 1} needs about ${needed.toFixed(2)}in but its box is ${rowH.toFixed(2)}in — text will clip. Shorten it or drop a row.`,
          );
        }
      });
    }

    // V19 — a column populated elsewhere but blank here reads as an oversight.
    if (s.kind === "commercial") {
      const anyCost = s.rows.some((r) => r.cost.trim());
      const blank = s.rows.filter((r) => !r.cost.trim());
      if (anyCost && blank.length) {
        add(
          "V19",
          "warn",
          `${blank.length} commercial row(s) have an empty Cost cell while others are filled.`,
        );
      }
    }

    if (s.page) pages.push({ i, id, n: s.page.n, m: s.page.m });
  });

  // V13 — every (n/m) run must be complete and contiguous.
  const byTotal = new Map<number, number[]>();
  for (const p of pages) {
    byTotal.set(p.m, [...(byTotal.get(p.m) ?? []), p.n]);
  }
  for (const [m, ns] of byTotal) {
    const sorted = [...ns].sort((a, b) => a - b);
    const expected = Array.from({ length: m }, (_, k) => k + 1);
    if (sorted.length !== m || sorted.some((n, k) => n !== expected[k])) {
      const first = pages.find((p) => p.m === m)!;
      findings.push({
        rule: "V13",
        severity: "error",
        slideIndex: first.i,
        slideId: first.id,
        message: `Pagination run of ${m} is incomplete or non-contiguous: found ${sorted.join(", ")}.`,
      });
    }
  }

  // V17 — duplicate ids. Renderers key by index so a collision is silent on
  // screen, but `sel`/`flash`/`errIds` are id-based and would address both.
  const idFirstSeen = new Map<string, number>();
  slides.forEach((s, i) => {
    const first = idFirstSeen.get(s.id);
    if (first === undefined) {
      idFirstSeen.set(s.id, i);
      return;
    }
    findings.push({
      rule: "V17",
      severity: "error",
      slideIndex: i,
      slideId: s.id,
      message: `Duplicate slide id "${s.id}" — also used by slide ${first + 1}. Selecting or editing either one hits both.`,
    });
  });

  // V18 — a deck has exactly one cover.
  const covers = slides.flatMap((s, i) => (s.kind === "title" ? [i] : []));
  if (covers.length > 1) {
    findings.push({
      rule: "V18",
      severity: "error",
      slideIndex: covers[1],
      slideId: slides[covers[1]].id,
      message: `Deck has ${covers.length} cover slides (positions ${covers.map((i) => i + 1).join(", ")}); it should have exactly one.`,
    });
  }

  // V19 — no readable text at all. `textsOf` filters falsy strings, so an
  // all-empty slide gave every text rule above nothing to fire on.
  slides.forEach((s, i) => {
    if (s.kind === "placeholder") return;
    const hasText = textsOf(s).some((t) => t.trim().length > 0);
    if (hasText) return;
    findings.push({
      rule: "V19",
      severity: "error",
      slideIndex: i,
      slideId: s.id,
      message: `Slide ${i + 1} has no text on it — it would export as an empty ${s.kind} layout.`,
    });
  });

  return findings;
}

export function summarizeFindings(findings: Finding[]): string {
  if (!findings.length) return "No issues found.";
  const errors = findings.filter((f) => f.severity === "error").length;
  const warns = findings.length - errors;
  return `${errors} error${errors === 1 ? "" : "s"}, ${warns} warning${warns === 1 ? "" : "s"}`;
}
