import { z } from "zod";
import { BulletsContent, ComparisonContent, TimelineContent, SummaryContent } from "@/lib/slides/schema";

/**
 * Generation-only output shapes — a superset of the slide content schema
 * when a step needs to hand a small amount of extra structure forward to
 * later steps (e.g. which config modules are in scope) without that extra
 * structure leaking into the rendered slide itself.
 */

export const ProjectUnderstandingOutput = BulletsContent.extend({
  clientName: z.string().describe("The client or organization name mentioned in the brief, or a short generic label if none is given."),
  projectTitle: z.string().describe("A short (3-6 word) project title suitable for a cover slide."),
});
export type ProjectUnderstandingOutput = z.infer<typeof ProjectUnderstandingOutput>;

export const OptionAnalysisOutput = ComparisonContent;
export type OptionAnalysisOutput = z.infer<typeof OptionAnalysisOutput>;

export const SolutionProposalOutput = BulletsContent.extend({
  selectedModuleKeys: z
    .array(z.string())
    .min(1)
    .describe("Keys of the config modules (from the provided module list) that are relevant to this brief, most important first."),
});
export type SolutionProposalOutput = z.infer<typeof SolutionProposalOutput>;

export const ExecutionMethodologyOutput = TimelineContent;
export type ExecutionMethodologyOutput = z.infer<typeof ExecutionMethodologyOutput>;

export const ExecutiveSummaryOutput = SummaryContent;
export type ExecutiveSummaryOutput = z.infer<typeof ExecutiveSummaryOutput>;
