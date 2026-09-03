import { z } from "zod";

// Zod schema for creating a business profile
export const createBusinessProfileSchema = z.object({
  companyName: z
    .string()
    .min(1, "Company name is required")
    .max(200, "Company name is too long"),
  industry: z
    .string()
    .min(1, "Industry is required")
    .max(100, "Industry is too long"),
  size: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE"], {
    errorMap: () => ({ message: "Business size is required" }),
  }),
  location: z
    .string()
    .min(1, "Location is required")
    .max(200, "Location is too long"),
  website: z
    .string()
    .url("Invalid website URL")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  description: z
    .string()
    .max(2000, "Description is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  goals: z
    .array(z.string().min(1).max(500))
    .min(1, "At least one goal is required")
    .max(10, "Maximum 10 goals"),
  challenges: z
    .array(z.string().min(1).max(500))
    .min(1, "At least one challenge is required")
    .max(10, "Maximum 10 challenges"),
});

// Zod schema for updating a business profile (all fields optional)
export const updateBusinessProfileSchema =
  createBusinessProfileSchema.partial();

// Type exports
export type CreateBusinessProfileInput = z.infer<
  typeof createBusinessProfileSchema
>;
export type UpdateBusinessProfileInput = z.infer<
  typeof updateBusinessProfileSchema
>;
