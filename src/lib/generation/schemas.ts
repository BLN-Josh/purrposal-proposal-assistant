import { z } from "zod";
import {
  BulletsContent,
  ComparisonContentBase,
  TimelineContent,
  SummaryContent,
  ValueChainContent,
  SectionLabelSchema,
} from "@/lib/slides/schema";

/**
 * Generation-only output shapes — the slide content schema plus the two-line
 * title (deck-system spec §2) plus, where a step must hand structure
 * forward, a small amount of extra scaffolding that never reaches a slide
 * (e.g. which config modules are in scope).
 *
 * `sectionLabel` is a closed enum here on purpose: constraining it in the
 * tool schema means the model *cannot* return an off-taxonomy section name,
 * which is more reliable than instructing it not to. The assertion is free
 * text and so is governed by the prompt's rules plus the deck linter.
 *
 * Cross-field invariants (e.g. "exactly one recommended option") are
 * deliberately NOT refinements here — a refinement failure costs a full
 * model retry, and the pipeline can repair these deterministically. See
 * `normalizeRecommended` in pipeline.ts.
 */
const titled = {
  sectionLabel: SectionLabelSchema.describe(
    "The slide's section label, from the fixed house taxonomy.",
  ),
  assertion: z
    .string()
    .describe(
      "The slide's conclusion as an 8-18 word claim in UPPERCASE, quantified where the data allows.",
    ),
};

export const ProjectUnderstandingOutput = BulletsContent.extend({
  ...titled,
  clientName: z
    .string()
    .describe(
      "The client or organization name mentioned in the brief, or a short generic label if none is given.",
    ),
  projectTitle: z
    .string()
    .describe("A short (3-6 word) project title suitable for a cover slide."),
});
export type ProjectUnderstandingOutput = z.infer<
  typeof ProjectUnderstandingOutput
>;

export const OptionAnalysisOutput = ComparisonContentBase.extend(titled);
export type OptionAnalysisOutput = z.infer<typeof OptionAnalysisOutput>;

export const SolutionProposalOutput = BulletsContent.extend({
  ...titled,
  selectedModuleKeys: z
    .array(z.string())
    .min(1)
    .describe(
      "Keys of the config modules (from the provided module list) relevant to this brief, most important first.",
    ),
});
export type SolutionProposalOutput = z.infer<typeof SolutionProposalOutput>;

export const ValueChainOutput = ValueChainContent.extend(titled);
export type ValueChainOutput = z.infer<typeof ValueChainOutput>;

export const ExecutionMethodologyOutput = TimelineContent.extend(titled);
export type ExecutionMethodologyOutput = z.infer<
  typeof ExecutionMethodologyOutput
>;

export const ExecutiveSummaryOutput = SummaryContent.extend(titled);
export type ExecutiveSummaryOutput = z.infer<typeof ExecutiveSummaryOutput>;
