import { prisma } from "@/lib/db/client";
import type { BusinessProfile } from "@prisma/client";
import {
  createBusinessProfileSchema,
  updateBusinessProfileSchema,
  type CreateBusinessProfileInput,
  type UpdateBusinessProfileInput,
} from "./schemas";

/**
 * Get the business profile for a user.
 * Returns null if no profile exists.
 */
export async function getBusinessProfile(
  userId: string
): Promise<BusinessProfile | null> {
  return prisma.businessProfile.findUnique({
    where: { userId },
  });
}

/**
 * Create a new business profile for a user.
 * Throws if a profile already exists (idempotency check).
 */
export async function createBusinessProfile(
  userId: string,
  data: CreateBusinessProfileInput
): Promise<BusinessProfile> {
  // Validate input
  const validated = createBusinessProfileSchema.parse(data);

  // Check for existing profile
  const existing = await getBusinessProfile(userId);
  if (existing) {
    throw new Error("Business profile already exists");
  }

  // Create the profile
  return prisma.businessProfile.create({
    data: {
      userId,
      companyName: validated.companyName,
      industry: validated.industry,
      size: validated.size,
      location: validated.location,
      website: validated.website ?? null,
      description: validated.description ?? null,
      goals: validated.goals,
      challenges: validated.challenges,
    },
  });
}

/**
 * Update an existing business profile.
 * Throws if no profile exists.
 */
export async function updateBusinessProfile(
  userId: string,
  data: UpdateBusinessProfileInput
): Promise<BusinessProfile> {
  // Validate input
  const validated = updateBusinessProfileSchema.parse(data);

  // Check profile exists
  const existing = await getBusinessProfile(userId);
  if (!existing) {
    throw new Error("Business profile not found");
  }

  // Update the profile
  return prisma.businessProfile.update({
    where: { userId },
    data: {
      ...(validated.companyName !== undefined && {
        companyName: validated.companyName,
      }),
      ...(validated.industry !== undefined && {
        industry: validated.industry,
      }),
      ...(validated.size !== undefined && { size: validated.size }),
      ...(validated.location !== undefined && {
        location: validated.location,
      }),
      ...(validated.website !== undefined && {
        website: validated.website,
      }),
      ...(validated.description !== undefined && {
        description: validated.description,
      }),
      ...(validated.goals !== undefined && { goals: validated.goals }),
      ...(validated.challenges !== undefined && {
        challenges: validated.challenges,
      }),
    },
  });
}

/**
 * Create or update a business profile (upsert).
 * Returns the profile and a boolean indicating if it was created.
 */
export async function upsertBusinessProfile(
  userId: string,
  data: CreateBusinessProfileInput
): Promise<{ profile: BusinessProfile; created: boolean }> {
  const validated = createBusinessProfileSchema.parse(data);

  const existing = await getBusinessProfile(userId);

  if (existing) {
    const updated = await updateBusinessProfile(userId, validated);
    return { profile: updated, created: false };
  }

  const created = await createBusinessProfile(userId, validated);
  return { profile: created, created: true };
}
