import { z } from "zod";

// Zod schema for creating a professional profile
export const createProfessionalProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name is too long"),
  title: z
    .string()
    .min(1, "Professional title is required")
    .max(200, "Title is too long"),
  skills: z
    .array(z.string().min(1).max(100))
    .min(1, "At least one skill is required")
    .max(20, "Maximum 20 skills"),
  services: z
    .array(z.string().min(1).max(200))
    .min(1, "At least one service is required")
    .max(20, "Maximum 20 services"),
  bio: z
    .string()
    .max(2000, "Bio is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  certifications: z
    .array(z.string().min(1).max(200))
    .max(10, "Maximum 10 certifications")
    .optional(),
  hourlyRate: z
    .number()
    .positive("Hourly rate must be positive")
    .max(10000, "Hourly rate is too high")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// Zod schema for updating a professional profile (all fields optional)
export const updateProfessionalProfileSchema =
  createProfessionalProfileSchema.partial();

// Type exports
export type CreateProfessionalProfileInput = z.infer<
  typeof createProfessionalProfileSchema
>;
export type UpdateProfessionalProfileInput = z.infer<
  typeof updateProfessionalProfileSchema
>;

// Zod schema for a professional responding (accept/decline) to a matched opportunity.
// Only the MatchResult id is supplied by the client; ownership is resolved server-side.
export const respondOpportunitySchema = z.object({
  matchResultId: z.string().min(1, "Match result ID is required"),
  responseStatus: z.enum(["ACCEPTED", "DECLINED"]),
});
export type RespondOpportunityInput = z.infer<typeof respondOpportunitySchema>;
