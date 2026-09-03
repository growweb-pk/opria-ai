/**
 * AI Agent Index
 *
 * All 7 Opria AI agents are exported from here.
 * Each agent has its own role, system prompt, input/output schemas, and run function.
 *
 * Agent Pipeline (typical flow):
 * 1. Business Research → Structure business data
 * 2. Business Analysis → Evaluate current state
 * 3. Opportunity Discovery → Identify growth opportunities
 * 4. AI Advisor → Conversational requirement discovery
 * 5. Requirement Structuring → Produce structured requirements
 * 6. Matching Support → Score professionals against requirements
 * 7. Explanation → Explain match recommendations
 */

// ─── Agent 1: Business Research ──────────────────────────
export {
  runBusinessResearch,
  BusinessResearchInput,
  BusinessResearchOutput,
} from "./business-research";
export type { BusinessResearchInput as BusinessResearchInputType, BusinessResearchOutput as BusinessResearchOutputType } from "./business-research";

// ─── Agent 2: Business Analysis ──────────────────────────
export {
  runBusinessAnalysis,
  BusinessAnalysisInput,
  BusinessAnalysisOutput,
} from "./business-analysis";
export type { BusinessAnalysisInput as BusinessAnalysisInputType, BusinessAnalysisOutput as BusinessAnalysisOutputType } from "./business-analysis";

// ─── Agent 3: Opportunity Discovery ──────────────────────
export {
  runOpportunityDiscovery,
  OpportunityDiscoveryInput,
  OpportunityDiscoveryOutput,
} from "./opportunity-discovery";
export type { OpportunityDiscoveryInput as OpportunityDiscoveryInputType, OpportunityDiscoveryOutput as OpportunityDiscoveryOutputType } from "./opportunity-discovery";

// ─── Agent 4: AI Business Advisor ────────────────────────
export { runAdvisor, AdvisorInput } from "./advisor";
export type { AdvisorInput as AdvisorInputType, AdvisorOutput } from "./advisor";

// ─── Agent 5: Requirement Structuring ────────────────────
export {
  runRequirementStructuring,
  RequirementStructuringInput,
  RequirementStructuringOutput,
} from "./requirement-structuring";
export type { RequirementStructuringInput as RequirementStructuringInputType, RequirementStructuringOutput as RequirementStructuringOutputType } from "./requirement-structuring";

// ─── Agent 6: Matching Support ───────────────────────────
export {
  runMatchingSupport,
  MatchingSupportInput,
  MatchingSupportOutput,
} from "./matching-support";
export type { MatchingSupportInput as MatchingSupportInputType, MatchingSupportOutput as MatchingSupportOutputType } from "./matching-support";

// ─── Agent 7: Explanation ────────────────────────────────
export {
  runExplanation,
  ExplanationInput,
  ExplanationOutput,
} from "./explanation";
export type { ExplanationInput as ExplanationInputType, ExplanationOutput as ExplanationOutputType } from "./explanation";

// ─── Provenance ──────────────────────────────────────────
export {
  ProvenanceEnum,
  ProvenanceFieldSchema,
  provided,
  inferred,
  recommended,
} from "../provenance";
export type { Provenance, ProvenanceField } from "../provenance";
