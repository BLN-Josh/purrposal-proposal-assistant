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
  ExecutionMethodologyOutput,
  ExecutiveSummaryOutput,
} from "./schemas";
import {
  projectUnderstandingPrompt,
  optionAnalysisPrompt,
  solutionProposalPrompt,
  executionMethodologyPrompt,
  executiveSummaryPrompt,
} from "./prompts";
import { Deck, type Slide, type TableRow } from "@/lib/slides/schema";
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
 * FR-3.1's 7-section pipeline, generated in this order — Executive Summary
 * always last even though it displays first (§0 of the Technical Design
 * Document / PRD FR-3.1). Boilerplate slides (Change Management, Team) are
 * retrieved from config, never generated (FR-3.2). Commercial Terms is a
 * deterministic rate-card calculation, never an LLM completion (FR-3.4).
 *
 * The deck shape only decides which of these standardized sections are kept
 * in the final deck (Discovery/Exec shapes render a subset) — every shape
 * still runs the same generic pipeline underneath. Execution Methodology and
 * Commercial Terms always run because Executive Summary depends on their
 * output even when its own slide is Discovery-shape-excluded.
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

  const [understanding, optionAnalysis] = await Promise.all([
    generateStructured({
      model,
      schema: ProjectUnderstandingOutput,
      ...projectUnderstandingPrompt(brief, fileText, config, depth),
    }),
    generateStructured({
      model,
      schema: OptionAnalysisOutput,
      ...optionAnalysisPrompt(brief, fileText, config, depth),
    }),
  ]);
  emit("understanding", "Project understanding · option analysis");

  const solutionProposal = await generateStructured({
    model,
    schema: SolutionProposalOutput,
    ...solutionProposalPrompt(brief, fileText, config, understanding, optionAnalysis, depth),
  });

  const validKeys = new Set(config.modules.map((m) => m.key));
  let selectedKeys = solutionProposal.selectedModuleKeys.filter((k) => validKeys.has(k));
  if (!selectedKeys.length) selectedKeys = config.modules.map((m) => m.key);
  const selectedModules = config.modules.filter((m) => selectedKeys.includes(m.key));

  // Feature Detail Table is retrieval from config, not generation (PRD FR-3.1 step 4).
  const featureRows: TableRow[] = selectedModules.map((m) => ({
    c1: m.name,
    c2: m.description,
    c3: m.details,
    c4: m.actionSupport,
  }));
  emit("solution", "Solution proposal · feature detail");

  const executionMethodology = await generateStructured({
    model,
    schema: ExecutionMethodologyOutput,
    ...executionMethodologyPrompt(
      brief,
      config,
      selectedModules.map((m) => m.name),
      depth
    ),
  });

  // Deterministic — never an LLM completion (NFR-2).
  const commercial = computeCommercialTerms(config, selectedKeys);
  emit("execution", "Execution methodology · commercial terms");

  const executiveSummary = needsExecSummary
    ? await generateStructured({
        model,
        schema: ExecutiveSummaryOutput,
        ...executiveSummaryPrompt({
          brief,
          clientName: understanding.clientName,
          understanding,
          optionAnalysis,
          solutionProposal,
          totalWeeks: sumWeeks(executionMethodology.phases),
          commercialTotal: commercial.total,
        }),
      })
    : null;
  emit("summary", needsExecSummary ? "Executive summary" : "Assembling deck…");

  const today = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const deckTitle = `${understanding.projectTitle} — ${understanding.clientName}`;

  const bySection: Partial<Record<SectionId, Slide>> = {
    cover: {
      id: crypto.randomUUID(),
      kind: "title",
      eyebrow: "Proposal Assistant",
      title: understanding.projectTitle,
      subtitle: `Prepared for ${understanding.clientName}`,
      footer: `Confidential · ${today}`,
    },
    understanding: {
      id: crypto.randomUUID(),
      kind: "bullets",
      title: understanding.title,
      subtitle: understanding.subtitle,
      bullets: understanding.bullets,
    },
    options: {
      id: crypto.randomUUID(),
      kind: "comparison",
      title: optionAnalysis.title,
      subtitle: optionAnalysis.subtitle,
      cols: optionAnalysis.cols,
    },
    solution: {
      id: crypto.randomUUID(),
      kind: "bullets",
      title: solutionProposal.title,
      subtitle: solutionProposal.subtitle,
      bullets: solutionProposal.bullets,
    },
    features: {
      id: crypto.randomUUID(),
      kind: "table",
      title: "Feature Detail",
      subtitle: "Module-level scope, four-column standard",
      rows: featureRows,
    },
    method: {
      id: crypto.randomUUID(),
      kind: "timeline",
      title: executionMethodology.title,
      subtitle: executionMethodology.subtitle,
      phases: executionMethodology.phases,
    },
    change: {
      id: crypto.randomUUID(),
      kind: "bullets",
      title: CHANGE_MANAGEMENT_SLIDE.title,
      subtitle: CHANGE_MANAGEMENT_SLIDE.subtitle,
      bullets: CHANGE_MANAGEMENT_SLIDE.bullets,
    },
    team: {
      id: crypto.randomUUID(),
      kind: "team",
      title: "Delivery Team",
      subtitle: "Named team, allocated for the engagement",
      people: TEAM_ROSTER,
    },
    commercial: {
      id: crypto.randomUUID(),
      kind: "commercial",
      title: commercial.title,
      subtitle: commercial.subtitle,
      rows: commercial.rows,
      totalLabel: commercial.totalLabel,
      total: commercial.total,
      footnote: commercial.footnote,
    },
    ...(executiveSummary
      ? {
          exec: {
            id: crypto.randomUUID(),
            kind: "summary",
            title: executiveSummary.title,
            subtitle: executiveSummary.subtitle,
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
    deckId: crypto.randomUUID(),
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
