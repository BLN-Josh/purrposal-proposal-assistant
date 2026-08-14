import type { ProposalConfig } from "@/config/types";
import type { DepthId } from "@/config/deck-shapes";
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
  return config.modules
    .map((m) => `- ${m.key}: ${m.name} — ${m.description}`)
    .join("\n");
}

const COMMON_RULES = `Write for a client-facing consulting proposal deck: direct, concrete, no filler adjectives, no exclamation marks. Keep every field short enough to read at a glance on a 16:9 slide. Never invent a specific price or currency figure — pricing is computed separately from a rate card.`;

const BULLET_TARGET_BY_DEPTH: Record<DepthId, number> = {
  concise: 3,
  standard: 4,
  detailed: 6,
};

function bulletGuidance(depth: DepthId): string {
  const n = BULLET_TARGET_BY_DEPTH[depth];
  if (depth === "concise") return `Exactly ${n} short bullets (max ~12 words each) — headline only, no elaboration.`;
  if (depth === "detailed") return `${n} bullets (max ~24 words each), each with one clause of supporting detail.`;
  return `${n} bullets (max ~18 words each).`;
}

function phaseDetailGuidance(depth: DepthId): string {
  if (depth === "concise") return "a short clause (under 10 words) of what happens in that phase";
  if (depth === "detailed") return "a sentence plus one concrete example of what happens in that phase";
  return "a one-sentence detail of what happens in that phase";
}

function fitGuidance(depth: DepthId): string {
  return depth === "detailed"
    ? "a one-to-two sentence \"fit\" verdict"
    : "a one-sentence \"fit\" verdict";
}

export function projectUnderstandingPrompt(
  brief: string,
  fileText: string | null | undefined,
  config: ProposalConfig,
  depth: DepthId
) {
  return {
    system: `You are a technology-consulting proposal writer drafting the "Project Understanding" slide for this engagement. ${COMMON_RULES}`,
    prompt: `${briefContext(brief, fileText)}

Relevant KPIs this engagement typically tracks: ${config.kpis.join(", ")}.

Produce:
- clientName: the client/organization name from the brief (or a short generic label like "the client" if none is stated)
- projectTitle: a 3-6 word cover-slide title for this engagement
- title: "Project Understanding"
- subtitle: a one-line framing of what was heard and found
- bullets: ${bulletGuidance(depth)} Capture the client's stated pain points and root causes from the brief.`,
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
    system: `You are a technology-consulting proposal writer drafting the "Option Analysis" slide for this engagement. ${COMMON_RULES}`,
    prompt: `${briefContext(brief, fileText)}

Produce a 3-column comparison with exactly these three options in this order: "${extend}", "${buy}", "${build}".
For each column give a plausible relative cost band (e.g. "Lowest", "Highest", or a rough THB range if the brief implies scale — never a precise invented figure), a rough relative timeframe (e.g. "8-10 wks"), and ${fitGuidance(depth)} tied to the brief's actual constraints (budget sensitivity, deadline, etc). Mark exactly one column recommended:true — the one best justified by the brief. title: "Option Analysis". subtitle: a one-line framing of what was assessed.`,
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
  const recommended = optionAnalysis.cols.find((c) => c.recommended)?.name ?? optionAnalysis.cols[0]?.name;
  return {
    system: `You are a technology-consulting proposal writer drafting the "Solution Proposal" slide for this engagement. ${COMMON_RULES}`,
    prompt: `${briefContext(brief, fileText)}

Recommended approach: ${recommended}.
Project understanding bullets: ${understanding.bullets.map((b) => b.text).join(" ")}

Available modules to choose from (pick only the ones relevant to this brief, most important first):
${moduleList(config)}

Produce:
- selectedModuleKeys: the module keys (from the list above, using the exact key strings) that this brief calls for
- title: "Solution Proposal"
- subtitle: a one-line framing of the proposed solution
- bullets: one bullet per selected module explaining why it matters for this specific brief. ${bulletGuidance(depth)}`,
  };
}

export function executionMethodologyPrompt(
  brief: string,
  config: ProposalConfig,
  selectedModuleNames: string[],
  depth: DepthId
) {
  return {
    system: `You are a technology-consulting proposal writer drafting the "Execution Methodology" slide for this engagement. ${COMMON_RULES}`,
    prompt: `${briefContext(brief, null)}

Scope being delivered: ${selectedModuleNames.join(", ")}.

Produce a 4-phase timeline using exactly these phase names in order: "Prepare", "Explore", "Realize", "Deploy" (n = "1".."4"). For each phase give a short duration in weeks appropriate to the scope size, and ${phaseDetailGuidance(depth)}. title: "Execution Methodology". subtitle: a one-line framing mentioning the total duration and the go-live goal implied by the brief (e.g. before a stated deadline), without inventing a date that isn't implied.`,
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
  const recommended = params.optionAnalysis.cols.find((c) => c.recommended);
  return {
    system: `You are a technology-consulting proposal writer drafting the "Executive Summary" slide — a single-slide rollup generated last, after every other section. ${COMMON_RULES}`,
    prompt: `Client: ${params.clientName}
Brief: ${params.brief.trim()}
Recommended approach: ${recommended?.name ?? "the recommended option"} — ${recommended?.fit ?? ""}
Solution bullets: ${params.solutionProposal.bullets.map((b) => b.text).join(" ")}
Total execution time: ${params.totalWeeks}
Total investment (already computed from the rate card — repeat this figure verbatim, do not alter it): ${params.commercialTotal}

Produce exactly 4 rows with labels "Requirements", "Solution", "Execution", "Investment" (in that order), each a one-sentence rollup of that dimension. The Investment row must state the total investment figure exactly as given above. title: "Executive Summary". subtitle: "One-page rollup of the proposal".`,
  };
}
