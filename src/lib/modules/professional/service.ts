import { prisma } from "@/lib/db/client";
import type { MatchResponseStatus, ProfessionalProfile } from "@prisma/client";
import {
  createProfessionalProfileSchema,
  updateProfessionalProfileSchema,
  respondOpportunitySchema,
  type CreateProfessionalProfileInput,
  type UpdateProfessionalProfileInput,
} from "./schemas";

/**
 * Get the professional profile for a user.
 * Returns null if no profile exists.
 */
export async function getProfessionalProfile(
  userId: string
): Promise<ProfessionalProfile | null> {
  return prisma.professionalProfile.findUnique({
    where: { userId },
  });
}

/**
 * Create a new professional profile for a user.
 * Throws if a profile already exists.
 */
export async function createProfessionalProfile(
  userId: string,
  data: CreateProfessionalProfileInput
): Promise<ProfessionalProfile> {
  const validated = createProfessionalProfileSchema.parse(data);

  const existing = await getProfessionalProfile(userId);
  if (existing) {
    throw new Error("Professional profile already exists");
  }

  return prisma.professionalProfile.create({
    data: {
      userId,
      name: validated.name,
      title: validated.title,
      skills: validated.skills,
      services: validated.services,
      bio: validated.bio ?? null,
      certifications: validated.certifications ?? [],
      hourlyRate: validated.hourlyRate ?? null,
    },
  });
}

/**
 * Update an existing professional profile.
 * Throws if no profile exists.
 */
export async function updateProfessionalProfile(
  userId: string,
  data: UpdateProfessionalProfileInput
): Promise<ProfessionalProfile> {
  const validated = updateProfessionalProfileSchema.parse(data);

  const existing = await getProfessionalProfile(userId);
  if (!existing) {
    throw new Error("Professional profile not found");
  }

  return prisma.professionalProfile.update({
    where: { userId },
    data: {
      ...(validated.name !== undefined && { name: validated.name }),
      ...(validated.title !== undefined && { title: validated.title }),
      ...(validated.skills !== undefined && { skills: validated.skills }),
      ...(validated.services !== undefined && { services: validated.services }),
      ...(validated.bio !== undefined && { bio: validated.bio }),
      ...(validated.certifications !== undefined && {
        certifications: validated.certifications,
      }),
      ...(validated.hourlyRate !== undefined && {
        hourlyRate: validated.hourlyRate,
      }),
    },
  });
}

/**
 * Phase 6 — Opportunity feed for the authenticated professional.
 *
 * SECURITY: matches are resolved exclusively through `professional.userId`, so a
 * professional only ever sees opportunities matched to THEIR OWN profile. The client
 * never supplies professionalId/businessId. Only the business fields relevant to a
 * matched opportunity (company name, industry, location) are exposed — never another
 * professional's scores, ranks, or unrelated business data.
 */
export async function getOpportunitiesForProfessional(userId: string) {
  return prisma.matchResult.findMany({
    where: { professional: { userId } },
    orderBy: [{ createdAt: "desc" }, { finalScore: "desc" }],
    include: {
      matchRequest: {
        select: {
          status: true,
          createdAt: true,
          completedAt: true,
          requirement: {
            select: {
              id: true,
              title: true,
              status: true,
              confidence: true,
              structuredData: true,
              business: {
                select: {
                  companyName: true,
                  industry: true,
                  location: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export type ProfessionalOpportunity = Awaited<
  ReturnType<typeof getOpportunitiesForProfessional>
>[number];

/**
 * Phase 6 — Accept or decline a matched opportunity.
 *
 * SECURITY: the MatchResult must belong to the authenticated professional
 * (`professional.userId === userId`); the client only supplies the MatchResult id.
 * IDEMPOTENT: re-submitting the same decision is a no-op returning the current row.
 * Once a decision (ACCEPTED/DECLINED) is recorded it is terminal — conflicting flips
 * are rejected rather than inventing new workflow states.
 */
export async function respondToOpportunity(
  userId: string,
  input: { matchResultId: string; responseStatus: "ACCEPTED" | "DECLINED" }
) {
  const validated = respondOpportunitySchema.parse(input);

  const match = await prisma.matchResult.findFirst({
    where: { id: validated.matchResultId, professional: { userId } },
  });

  if (!match) {
    throw new Error("Opportunity not found");
  }

  // Idempotent no-op when the same decision is submitted again.
  if (match.responseStatus === validated.responseStatus) {
    return match;
  }

  // Prevent conflicting transitions once a decision has been recorded.
  if (match.responseStatus !== "PENDING") {
    throw new Error("Opportunity already responded");
  }

  return prisma.matchResult.update({
    where: { id: match.id },
    data: {
      responseStatus: validated.responseStatus as MatchResponseStatus,
      respondedAt: new Date(),
    },
  });
}
