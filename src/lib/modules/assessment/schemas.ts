import { z } from "zod";

// Schema for a single assessment response.
// The client sends only the answer label — the server derives the canonical
// score from the question bank, so the client can never manipulate scores.
export const assessmentResponseSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  category: z.string().min(1, "Category is required"),
  question: z.string().min(1, "Question text is required"),
  answer: z.string().min(1, "Answer is required"),
});

// Schema for submitting a complete assessment
export const submitAssessmentSchema = z.object({
  responses: z
    .array(assessmentResponseSchema)
    .min(1, "At least one response is required"),
});

// Type exports
export type AssessmentResponseInput = z.infer<typeof assessmentResponseSchema>;
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;
