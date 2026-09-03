import { z } from "zod";

export const generateRequirementSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
});

export const updateRequirementSchema = z.object({
  status: z.enum(["DRAFT", "APPROVED"]).optional(),
});

export type GenerateRequirementInput = z.infer<typeof generateRequirementSchema>;
export type UpdateRequirementInput = z.infer<typeof updateRequirementSchema>;
