import { generateStructured } from "@/lib/anthropic";
import { MODULE_CATALOG } from "@/config/module-catalog";
import { getDeckShape, getDepth, SECTION_ORDER, type SectionId } from "@/config/deck-shapes";
import { TEAM_ROSTER } from "@/config/team-roster";
import { CHANGE_MANAGEMENT_SLIDE } from "@/config/boilerplate";
import { computeCommercialTerms } from "@/lib/pricing";
import {
  ProjectUnderstandingOutput,
  OptionAnalysisOutput,
  SolutionProposalOutput,
  ValueChainOutput,
  ExecutionMethodologyOutput,
  ExecutiveSummaryOutput,
} from "./schemas";
import {
  projectUnderstandingPrompt,
  optionAnalysisPrompt,
  solutionProposalPrompt,
  valueChainPrompt,
  executionMethodologyPrompt,
  executiveSummaryPrompt,
} from "./prompts";
import { Deck, type Slide, type FeatureRow } from "@/lib/slides/schema";
import { repairComparison } from "@/lib/slides/repair";
import type { GenerateRequest } from "@/lib/api-types";

export type ProgressEmitter = (step: string, label: string) => void;

function sumWeeks(phases: { weeks: string }[]): string {
  const total = phases.reduce((sum, p) => {
    const n = parseInt(p.weeks, 10);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  return total > 0 ? `${total} weeks` : `${phases.length} phases`;
}


/**
 * FR-3.1's section pipeline. Executive Summary is always generated last even
 * though it displays first (§0 of the Technical Design Document / PRD
 * FR-3.1). Boilerplate slides (Change Management, Team) are retrieved from
 * config, never generated (FR-3.2). Commercial Terms is a deterministic
 * rate-card calculation, never an LLM completion (FR-3.4).
 *
 * Section dividers are inserted structurally rather than generated: the
 * deck-system spec's narrative arc (§3) puts a DIV-01 before the Solution
 * and Execution chapters, and that placement is a property of the arc, not
 * a judgement call worth a model call.
 */
export async function runGenerationPipeline(
  req: GenerateRequest,
  emit: ProgressEmitter
): Promise<Deck> {
  const shape = getDeckShape(req.deckShape);
  const depth = getDepth(req.depth).id;
  const config = MODULE_CATALOG;
  const { model, brief, fileText } = req;
  const needsExecSummary = shape.sections.includes("exec");

  if (fileText) emit("extract", "Extracting source document…");

  const [understanding, optionAnalysisRaw] = await Promise.all([
    generateStructured({
      model,
      schema: ProjectUnderstandingOutput,
      maxTokens: 3072,
      effort: "medium",
      label: "gen:understanding",
      ...projectUnderstandingPrompt(brief, fileText, config, depth),
    }),
    generateStructured({
      model,
      schema: OptionAnalysisOutput,
      // Six criteria × three options of prose, plus thinking, is the
      // largest single completion in the pipeline after the value chain.
      maxTokens: 4096,
      effort: "medium",
      label: "gen:options",
      ...optionAnalysisPrompt(brief, fileText, config, depth),
    }),
  ]);
  const optionAnalysis = { ...optionAnalysisRaw, ...repairComparison(optionAnalysisRaw) };
  emit("understanding", "Project understanding · option analysis");

  const solutionProposal = await generateStructured({
    model,
    schema: SolutionProposalOutput,
    maxTokens: 3072,
    effort: "medium",
    label: "gen:solution",
    ...solutionProposalPrompt(brief, fileText, config, understanding, optionAnalysis, depth),
  });

  const validKeys = new Set(config.modules.map((m) => m.key));
  let selectedKeys = solutionProposal.selectedModuleKeys.filter((k) => validKeys.has(k));
  if (!selectedKeys.length) selectedKeys = config.modules.map((m) => m.key);
  const selectedModules = config.modules.filter((m) => selectedKeys.includes(m.key));
  const selectedNames = selectedModules.map((m) => m.name);

  // Feature Detail is retrieval from config, not generation (PRD FR-3.1 step 4).
  const featureRows: FeatureRow[] = selectedModules.map((m) => ({
    feature: m.name,
    description: m.description,
    details: m.details,
    actionSupport: m.actionSupport,
  }));
  emit("solution", "Solution proposal · feature detail");

  const [valueChain, executionMethodology] = await Promise.all([
    generateStructured({
      model,
      schema: ValueChainOutput,
      // Five populated cells per row across up to five rows.
      maxTokens: 6144,
      effort: "medium",
      label: "gen:value-chain",
      ...valueChainPrompt(brief, selectedNames, depth),
    }),
    generateStructured({
      model,
      schema: ExecutionMethodologyOutput,
      maxTokens: 3072,
      effort: "medium",
      label: "gen:execution",
      ...executionMethodologyPrompt(brief, config, selectedNames, depth),
    }),
  ]);

  // Deterministic — never an LLM completion (NFR-2).
  const commercial = computeCommercialTerms(config, selectedKeys);
  emit("execution", "Value chain · execution methodology · commercial terms");

  const executiveSummary = needsExecSummary
    ? await generateStructured({
        model,
        schema: ExecutiveSummaryOutput,
        maxTokens: 4096,
        // The one slide worth thinking harder about: it is generated last,
        // from every other section's output, and is the slide a client
        // actually reads.
        effort: "high",
        label: "gen:exec-summary",
        ...executiveSummaryPrompt({
          brief,
          clientName: understanding.clientName,
          understanding,
          optionAnalysis,
          solutionProposal,
          totalWeeks: sumWeeks(executionMethodology.phases),
          commercialTotal: commercial.total ?? "",
        }),
      })
    : null;
  emit("summary", needsExecSummary ? "Executive summary" : "Assembling deck…");

  const today = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const deckTitle = `${understanding.projectTitle} — ${understanding.clientName}`;
  const id = () => crypto.randomUUID();

  const bySection: Partial<Record<SectionId, Slide>> = {
    cover: {
      id: id(),
      kind: "title",
      title: understanding.projectTitle,
      subtitle: `Prepared for ${understanding.clientName}`,
      date: today.toUpperCase(),
    },
    understanding: {
      id: id(),
      kind: "bullets",
      sectionLabel: understanding.sectionLabel,
      assertion: understanding.assertion,
      intro: understanding.intro,
      rows: understanding.rows,
      conclusion: understanding.conclusion,
    },
    options: {
      id: id(),
      kind: "comparison",
      sectionLabel: optionAnalysis.sectionLabel,
      assertion: optionAnalysis.assertion,
      criteria: optionAnalysis.criteria,
      options: optionAnalysis.options,
    },
    solutionDivider: {
      id: id(),
      kind: "divider",
      sectionName: "Solution Proposal",
      deckSubtitle: deckTitle,
    },
    solution: {
      id: id(),
      kind: "bullets",
      sectionLabel: solutionProposal.sectionLabel,
      assertion: solutionProposal.assertion,
      intro: solutionProposal.intro,
      rows: solutionProposal.rows,
      conclusion: solutionProposal.conclusion,
    },
    features: {
      id: id(),
      kind: "table",
      sectionLabel: "SOLUTION PROPOSAL",
      assertion: `MODULE-LEVEL SCOPE ACROSS ${featureRows.length} MODULES SELECTED AGAINST THE BRIEF'S STATED CONSTRAINTS`,
      group: "Module scope",
      rows: featureRows.slice(0, 6),
    },
    valueChain: {
      id: id(),
      kind: "valueChain",
      sectionLabel: valueChain.sectionLabel,
      assertion: valueChain.assertion,
      blocks: valueChain.blocks,
    },
    executionDivider: {
      id: id(),
      kind: "divider",
      sectionName: "Execution Plan",
      deckSubtitle: deckTitle,
    },
    method: {
      id: id(),
      kind: "timeline",
      sectionLabel: executionMethodology.sectionLabel,
      assertion: executionMethodology.assertion,
      phases: executionMethodology.phases,
      footnote: executionMethodology.footnote,
    },
    change: { id: id(), kind: "bullets", ...CHANGE_MANAGEMENT_SLIDE },
    team: {
      id: id(),
      kind: "team",
      sectionLabel: "EXECUTION METHODOLOGY",
      assertion: `A NAMED DELIVERY TEAM OF ${TEAM_ROSTER.length} ALLOCATED TO THIS ENGAGEMENT FOR ITS FULL DURATION`,
      people: TEAM_ROSTER,
    },
    commercial: {
      id: id(),
      kind: "commercial",
      sectionLabel: "COMMERCIAL TERM",
      assertion: `TOTAL INVESTMENT OF ${commercial.total ?? "THE COMPUTED FIGURE"} COVERING DEVELOPMENT, INTEGRATION, TRAINING AND HYPER-CARE`,
      ...commercial,
    },
    ...(executiveSummary
      ? {
          exec: {
            id: id(),
            kind: "summary",
            sectionLabel: executiveSummary.sectionLabel,
            assertion: executiveSummary.assertion,
            rows: executiveSummary.rows,
          } satisfies Slide,
        }
      : {}),
  };

  const included = new Set(shape.sections);
  const slides: Slide[] = SECTION_ORDER.filter((id) => included.has(id))
    .map((id) => bySection[id])
    .filter((s): s is Slide => !!s);

  const deck: Deck = {
    deckId: id(),
    meta: {
      title: deckTitle,
      deckShape: shape.id,
      depth,
      createdWithModel: model,
      sourceFileName: req.sourceFileName ?? null,
    },
    slides,
  };

  return Deck.parse(deck);
}
