import { z } from "zod";

/**
 * Input to trigger the matching pipeline for a requirement.
 * Only the requirementId is accepted — businessId/userId are NEVER trusted
 * from the client and are always resolved from the authenticated session.
 */
export const runMatchSchema = z.object({
  requirementId: z.string().min(1, "Requirement ID is required"),
});

export type RunMatchInput = z.infer<typeof runMatchSchema>;
