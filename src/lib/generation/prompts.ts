import type { ProposalConfig } from "@/config/types";
import type { DepthId } from "@/config/deck-shapes";
import type { NewSlideKind, SlideKind } from "@/lib/slides/schema";
import type { SlideOutlineEntry } from "@/lib/api-types";
import type { ProjectUnderstandingOutput, SolutionProposalOutput, OptionAnalysisOutput } from "./schemas";

// Trivial relative to a 200k-token model context window, but large enough
// that a genuinely long source document (a 100-page proposal, a detailed
// RFP) isn't reduced to just its first couple of pages.
const MAX_FILE_CONTEXT = 24000;

function briefContext(brief: string, fileText?: string | null): string {
  const parts = [`CLIENT BRIEF:\n${brief.trim()}`];
  if (fileText && fileText.trim()) {
    parts.push(`SOURCE DOCUMENT EXCERPT:\n${fileText.trim().slice(0, MAX_FILE_CONTEXT)}`);
  }
  return parts.join("\n\n");
}

function moduleList(config: ProposalConfig): string {
  return config.modules.map((m) => `- ${m.key}: ${m.name} — ${m.description}`).join("\n");
}

export const COMMON_RULES = `Write for a client-facing consulting proposal deck: direct, concrete, no filler adjectives, no exclamation marks. Keep every field short enough to read at a glance on a 16:9 slide. Never invent a specific price or currency figure — pricing is computed separately from a rate card.`;

/**
 * The house title grammar (deck-system spec §2). This is the single most
 * distinctive thing about a Balerion deck and the thing a model gets wrong
 * by default — left alone it writes topic labels ("Timeline", "Our
 * Approach") where the house style demands a claim. Every prompt that
 * produces a content slide includes this block verbatim.
 *
 * `sectionLabel` isn't described here because the schema constrains it to a
 * closed enum — the model physically cannot return an invalid one, which is
 * cheaper and more reliable than asking politely.
 */
export const ASSERTION_RULES = `TITLE GRAMMAR — follow exactly.
Every slide carries a two-line title: a sectionLabel (pick from the allowed list) and an "assertion".

The assertion is the slide's conclusion, not its topic. Rules:
1. NEVER a topic, ALWAYS a claim. Bad: "Implementation Timeline". Good: "PHASE 1 IMPLEMENTATION TIMELINE — 7 + 2 MONTHS TO FINISH DEVELOPMENT AND GO-LIVE".
2. Quantify whenever the slide's own content contains a number. "10 OF 12 INTERNAL MODULES REQUIRE REPLACEMENT" beats "MODULES REQUIRE REPLACEMENT".
3. Use an em-dash or a colon to split the fact from its consequence: "X REPLACES Y — WITH REBUILT PAYMENT CHANNEL AND PRESERVED INTEGRATIONS".
4. Length is a hard budget: 8 to 18 words. Under 8 reads as a label; over 18 wraps to three lines and collides with the slide body.
5. On any slide that recommends something, state the recommendation IN the assertion: "SEQUENTIAL ROLLOUT (OPTION 1) RECOMMENDED FOR EARLIER VALUE REALIZATION".
6. Write it in UPPERCASE.`;

const BULLET_TARGET_BY_DEPTH: Record<DepthId, number> = { concise: 3, standard: 4, detailed: 5 };

function rowGuidance(depth: DepthId): string {
  const n = BULLET_TARGET_BY_DEPTH[depth];
  if (depth === "concise") return `${n} rows, each description max ~12 words — headline only, no elaboration.`;
  if (depth === "detailed") return `${n} rows, each description max ~24 words with one clause of supporting detail.`;
  return `${n} rows, each description max ~18 words.`;
}

export function projectUnderstandingPrompt(
  brief: string,
  fileText: string | null | undefined,
  config: ProposalConfig,
  depth: DepthId
) {
  return {
    system: `You are a technology-consulting proposal writer drafting the "Project Understanding" slide. ${COMMON_RULES}\n\n${ASSERTION_RULES}`,
    prompt: `${briefContext(brief, fileText)}

Relevant KPIs this engagement typically tracks: ${config.kpis.join(", ")}.

Produce:
- clientName: the client/organization name from the brief (or a short generic label like "the client" if none is stated)
- projectTitle: a 3-6 word cover-slide title for this engagement
- sectionLabel: "PROJECT UNDERSTANDING"
- assertion: per the title grammar above — the single most important finding from discovery, quantified if the brief gives you anything countable
- intro: one line framing what was heard and found (optional but preferred)
- rows: ${rowGuidance(depth)} This is the discovery pain-point layout: give EVERY row a "label" of 2-3 words naming the problem (e.g. "Limited scalability", "Manual-heavy operations") plus a "text" description of it. Draw these from the brief's stated pain points and their root causes.
- conclusion: one sentence, max 18 words, stating what these findings force the client to decide. This renders as a banner across the slide bottom.`,
  };
}

export function optionAnalysisPrompt(
  brief: string,
  fileText: string | null | undefined,
  config: ProposalConfig,
  depth: DepthId
) {
  const { extend, buy, build } = config.comparisonDefaults;
  return {
    system: `You are a technology-consulting proposal writer drafting the "Option Analysis" matrix — the slide that closes the sale. ${COMMON_RULES}\n\n${ASSERTION_RULES}`,
    prompt: `${briefContext(brief, fileText)}

Produce a comparison MATRIX: criteria down the side, options across the top.

- sectionLabel: "UNDERSTANDING OF THE BUSINESS: OPTION ANALYSIS"
- assertion: state the recommendation itself (title grammar rule 5).
- criteria: use these six in this order, each with a short "descriptor" clause explaining what is being judged: Scalability, Business operation fit, Data management & visibility, Functionality adjustment, External integration, Total cost of ownership.
- options: exactly these three, in this order: "${extend}", "${buy}", "${build}". For each, give a "cells" array with ONE verdict per criterion, index-aligned to the criteria order above. Each verdict is a short phrase${depth === "detailed" ? " of up to 12 words" : " of up to 8 words"} — a judgement, not a description ("Full fit with customization", "Limited — vendor roadmap dependent").
- The Total cost of ownership row must carry a rough relative cost band for each option (e.g. a THB range implied by the brief's scale, or "Lowest"/"Highest") — never a precise invented figure.
- Mark exactly one option recommended:true — the one the brief's own constraints justify.`,
  };
}

export function solutionProposalPrompt(
  brief: string,
  fileText: string | null | undefined,
  config: ProposalConfig,
  understanding: ProjectUnderstandingOutput,
  optionAnalysis: OptionAnalysisOutput,
  depth: DepthId
) {
  const recommended = optionAnalysis.options.find((c) => c.recommended)?.name ?? optionAnalysis.options[0]?.name;
  return {
    system: `You are a technology-consulting proposal writer drafting the "Solution Proposal" slide. ${COMMON_RULES}\n\n${ASSERTION_RULES}`,
    prompt: `${briefContext(brief, fileText)}

Recommended approach: ${recommended}.
Discovery findings: ${understanding.rows.map((r) => `${r.label ?? ""} ${r.text}`).join(" ")}

Available modules to choose from (pick only the ones relevant to this brief, most important first):
${moduleList(config)}

Produce:
- selectedModuleKeys: the module keys (from the list above, using the exact key strings) that this brief calls for
- sectionLabel: "SOLUTION PROPOSAL"
- assertion: per the title grammar — name the shape of the solution and what it unlocks, with the module count if that is meaningful
- rows: one row per selected module. Set "label" to the module's short name and "text" to why it matters for THIS brief specifically. ${rowGuidance(depth)}`,
  };
}

export function valueChainPrompt(
  brief: string,
  selectedModuleNames: string[],
  depth: DepthId
) {
  return {
    system: `You are a technology-consulting proposal writer drafting the "feature to benefit value chain" slide. ${COMMON_RULES}\n\n${ASSERTION_RULES}`,
    prompt: `${briefContext(brief, null)}

Scope being delivered: ${selectedModuleNames.join(", ")}.

Produce a value-chain table that justifies this scope commercially.
- sectionLabel: "SOLUTION PROPOSAL – IMPACT IN DETAILS"
- assertion: per the title grammar — what this scope produces in business terms.
- blocks: exactly 1 block, with an optional short caption, containing ${depth === "concise" ? "3" : depth === "detailed" ? "5" : "4"} rows chosen from the most significant modules above.

Each row has FIVE columns and each has a strict, distinct meaning. Do not blur them:
- feature: the capability name
- task: what WE BUILD (an engineering activity)
- output: the ARTEFACT that build produces (a thing that then exists)
- outcome: the BEHAVIOUR CHANGE it causes for the client's staff or systems
- benefit: the BUSINESS GAIN that follows (cost, time, risk, revenue)

Every cell is 5-12 words. All five must be populated on every row.`,
  };
}

export function executionMethodologyPrompt(
  brief: string,
  config: ProposalConfig,
  selectedModuleNames: string[],
  depth: DepthId
) {
  const detail =
    depth === "concise"
      ? "a short clause (under 10 words)"
      : depth === "detailed"
        ? "a sentence plus one concrete example"
        : "a one-sentence detail";
  return {
    system: `You are a technology-consulting proposal writer drafting the "Execution Methodology" slide. ${COMMON_RULES}\n\n${ASSERTION_RULES}`,
    prompt: `${briefContext(brief, null)}

Scope being delivered: ${selectedModuleNames.join(", ")}.

Produce:
- sectionLabel: "EXECUTION METHODOLOGY"
- assertion: per the title grammar — must state the total duration as a number (e.g. "… — 7 + 2 MONTHS TO FINISH DEVELOPMENT AND GO-LIVE").
- phases: a 4-phase plan using exactly these names in order: "Prepare", "Explore", "Realize", "Deploy". For each give "weeks" (a short duration appropriate to the scope size, e.g. "3 weeks") and "detail" — ${detail} of what happens in that phase.
- footnote: optional single italic caveat line if one is genuinely warranted.`,
  };
}

export function executiveSummaryPrompt(params: {
  brief: string;
  clientName: string;
  understanding: ProjectUnderstandingOutput;
  optionAnalysis: OptionAnalysisOutput;
  solutionProposal: SolutionProposalOutput;
  totalWeeks: string;
  commercialTotal: string;
}) {
  const recommended = params.optionAnalysis.options.find((c) => c.recommended);
  return {
    system: `You are a technology-consulting proposal writer drafting the "Executive Summary" — the whole proposal on one slide, and the most important slide in the deck. It is generated last, after every other section. ${COMMON_RULES}\n\n${ASSERTION_RULES}`,
    prompt: `Client: ${params.clientName}
Brief: ${params.brief.trim()}
Recommended approach: ${recommended?.name ?? "the recommended option"}
Solution scope: ${params.solutionProposal.rows.map((r) => r.label ?? r.text).join(", ")}
Total execution time: ${params.totalWeeks}
Total investment (already computed from the rate card — repeat this figure verbatim, do not alter or recompute it): ${params.commercialTotal}

Produce:
- sectionLabel: "EXECUTIVE SUMMARY"
- assertion: per the title grammar. This one must carry the headline number — the investment figure and what it buys.
- rows: exactly 4 rows with these labels in this order: "Business requirements", "Proposed solution", "Execution plan", "Investment".
  Each row has a "bullets" array of 2-4 bullets, each a maximum of 16 words.
  - "Business requirements": what the client needs and why now.
  - "Proposed solution": the recommended approach and the modules it includes.
  - "Execution plan": the phases and the total duration (${params.totalWeeks}).
  - "Investment": must state the total investment figure exactly as given above, plus what is and isn't included.`,
  };
}

// ---- Single-slide editing -------------------------------------------------
// Both paths below live here rather than in the route so the house title
// grammar has exactly one definition. It used to be restated by hand in
// api/edit, which meant two copies of the most style-critical block in the
// product, free to drift apart.

/** One line per layout, written for the model that has to choose between
 * them. Phrased as "reach for this when…" rather than "this renders…" —
 * the picker needs the selection criterion, not the geometry. */
const LAYOUT_BRIEFS: Record<NewSlideKind, string> = {
  bullets: "a stack of 2-6 labelled points — findings, pain points, scope items, principles. The default when the content is a list of things with short explanations.",
  summary: "a 4-5 row executive summary, each row a labelled category with 2-4 bullets. Only for whole-proposal recaps.",
  comparison: "an option matrix: 3-6 criteria down the side, 2-3 options across the top, exactly one recommended. Use when the slide's job is to choose between alternatives.",
  table: "a feature detail table — rows of feature / description / details / action support. Use for module or capability specification.",
  valueChain: "a five-column feature→task→output→outcome→benefit chain. Use only when the slide must justify scope in business-value terms.",
  timeline: "a 3-5 phase ribbon with durations and per-phase detail. Use for plans, roadmaps, rollout sequences.",
  team: "a grid of 2-6 named people with roles and one-line bios.",
  divider: "a chapter break carrying only a section name. Use when the instruction asks for a section break or a title-only slide.",
};

/**
 * Step 1 of filling an empty slide: pick the layout.
 *
 * Split from content generation on purpose. The alternative — one call whose
 * tool schema is a union of all ten content shapes — makes the model choose
 * a branch and populate it in a single shot, and the failure mode is a
 * half-populated shape from the wrong branch. Choosing first means step 2
 * runs against exactly the same single-kind schema as a normal edit, so a
 * new slide and an edited slide share one validated code path.
 */
export function slideKindPrompt(instruction: string, outline: SlideOutlineEntry[], position: number) {
  return {
    system: `You select the layout for one new slide in a client-facing technology-consulting proposal deck. Choose the layout that fits the requested content — not the one that is most impressive. When the instruction is vague, prefer "bullets": it is the most forgiving layout and reads well with almost any content.`,
    prompt: `Available layouts:
${(Object.keys(LAYOUT_BRIEFS) as NewSlideKind[]).map((k) => `- ${k}: ${LAYOUT_BRIEFS[k]}`).join("\n")}

${outlineBlock(outline)}

The new slide sits at position ${position} in that deck.

The user asked for: "${instruction}"

Return:
- kind: the layout id
- plan: one sentence, max 25 words, saying what this specific slide will assert. This is handed to the writer, so name the actual content — not "a bullets slide about the timeline".`,
  };
}

/** Step 2 of filling an empty slide: write the content for the chosen kind. */
export function newSlidePrompt(params: {
  kind: SlideKind;
  instruction: string;
  plan: string;
  outline: SlideOutlineEntry[];
  position: number;
}) {
  const titled = params.kind !== "divider" && params.kind !== "title";
  return {
    system: `You are writing ONE new slide for a client-facing technology-consulting proposal deck, using the "${params.kind}" layout. ${COMMON_RULES}

The deck already exists — this slide has to sound like it was drafted with the rest, not bolted on. Do not restate what a neighbouring slide already says.${titled ? `\n\n${ASSERTION_RULES}` : ""}`,
    prompt: `${outlineBlock(params.outline)}

You are writing the slide at position ${params.position}.

The user asked for: "${params.instruction}"
Editorial plan for this slide: ${params.plan}

Fill every field the schema requires. Where the user's instruction doesn't supply a detail, infer it from the surrounding deck rather than leaving a placeholder — never emit "TBD", "XXX", or bracketed blanks.${
      titled
        ? `\n\nPick the sectionLabel that names this slide's job in the argument, not the neighbouring slide's — a slide that weighs options belongs under option analysis even if it sits next to discovery slides.`
        : ""
    }`,
  };
}

/** Revising an existing slide: same grammar, but the shape is already fixed. */
export function editSlidePrompt(params: {
  kind: SlideKind;
  content: unknown;
  instruction: string;
  outline: SlideOutlineEntry[];
  position: number;
}) {
  const titled = "assertion" in (params.content as Record<string, unknown>);
  return {
    system: `You are revising ONE slide of a client-facing technology-consulting proposal deck. The slide's kind is "${params.kind}" and its field structure must stay identical — same keys, same shapes, same array lengths where the schema requires them. Only change what the instruction asks; keep everything else faithful to the original. ${COMMON_RULES}${titled ? `\n\n${ASSERTION_RULES}\n\nIf your edit changes the underlying numbers, update the assertion to match rather than leaving a headline that contradicts the body.` : ""}`,
    prompt: `${outlineBlock(params.outline)}

You are revising the slide at position ${params.position}. Its current content:
${JSON.stringify(params.content)}

Instruction: "${params.instruction}"

Return the complete revised slide content in the same shape.`,
  };
}

/**
 * A compact map of the deck — one line per slide, titles only.
 *
 * This is what lets an edit stay consistent with slides the model never
 * sees, and it costs ~15 tokens per slide instead of the ~400 a full slide
 * body would. The client sends only this plus the slides actually being
 * edited, rather than the whole deck on every keystroke-sized instruction.
 */
function outlineBlock(outline: SlideOutlineEntry[]): string {
  if (!outline.length) return "DECK OUTLINE: (this is the only slide.)";
  const lines = outline.map(
    (s) => `${s.index}. [${s.kind}] ${s.assertion ?? s.title ?? "—"}`
  );
  return `DECK OUTLINE (for context — do not edit these):\n${lines.join("\n")}`;
}
