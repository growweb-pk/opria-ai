import { z } from "zod";

// Zod schema for changing a user's status (suspend / reactivate).
// Only the target user id and desired status are supplied by the client;
// authorization and self-protection are enforced server-side.
export const setUserStatusSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;
