import { z } from "zod";

export const createAdvisorConversationSchema = z.object({
  opportunityId: z.string().min(1, "Opportunity ID is required"),
});

export const sendAdvisorMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(4000, "Message is too long"),
});

export type CreateAdvisorConversationInput = z.infer<
  typeof createAdvisorConversationSchema
>;
export type SendAdvisorMessageInput = z.infer<typeof sendAdvisorMessageSchema>;
