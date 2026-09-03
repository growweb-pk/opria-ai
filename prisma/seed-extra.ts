/**
 * Opria Seed Script — Phase 7 Demo Scale (EXTRA)
 *
 * Adds demo breadth on top of the core Bella's Boutique scenario:
 *   - 2 additional businesses (profile + analysis + 3 opportunities each)
 *   - 9 additional professional profiles (pool grows to 15)
 *
 * IMPORTANT — this script is IDEMPOTENT and NON-DESTRUCTIVE:
 *   - Users/profiles are upserted by email / userId.
 *   - Analyses + opportunities are only created when none exist yet.
 *   - It never touches Bella's Boutique or the 6 existing MatchResults.
 *   - It performs ZERO AI calls (all content is pre-computed here).
 *
 * Usage:
 *   npm run db:seed:extra
 */

import fs from "node:fs";
import path from "node:path";
import {
  PrismaClient,
  Role,
  CompanySize,
  Priority,
  OpportunityStatus,
} from "@prisma/client";

// ─── Load .env.local (tsx does not do this automatically) ───
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}
loadEnvLocal();

const prisma = new PrismaClient();

function placeholderId(email: string) {
  return `demo-${email.split("@")[0]}-00000000`;
}

// ─── Additional businesses (lightweight: profile + analysis + opportunities) ───

const businesses = [
  {
    email: "marco@demo.opria.app",
    profile: {
      companyName: "Marco's Pizzeria",
      industry: "Restaurant / Food",
      size: CompanySize.SMALL,
      location: "Austin, Texas",
      website: null,
      description:
        "A family-owned pizzeria with two locations and a strong local following. Most revenue is dine-in and phone orders; third-party delivery apps take a large cut.",
      goals: [
        "Launch direct online ordering to reduce delivery-app fees",
        "Improve local search visibility across both locations",
        "Build a repeat-customer loyalty program",
      ],
      challenges: [
        "No direct online ordering channel",
        "Heavy reliance on third-party delivery apps",
        "Inconsistent local SEO and Google Business profiles",
        "No systematic customer retention program",
      ],
    },
    analysis: {
      confidence: 0.78,
      healthScores: {
        overall: 46,
        digital: 22,
        operational: 48,
        financial: 50,
        market: 55,
        technology: 30,
        humanCapital: 58,
        customerExperience: 44,
        innovation: 32,
      },
      analysisData: {
        strengths: [
          "Strong local brand and repeat dine-in customers",
          "Two established physical locations",
          "High-margin owned recipes and supply relationships",
        ],
        weaknesses: [
          "No direct digital ordering channel",
          "Large commission fees to delivery marketplaces",
          "Minimal customer data capture",
        ],
        opportunities: [
          "Direct online ordering to reclaim delivery margin",
          "Local SEO to capture high-intent nearby searches",
          "Loyalty program to increase order frequency",
        ],
        threats: [
          "Delivery-app dependency erodes margins",
          "Competing chains with mature digital ordering",
          "Rising food and labor costs",
        ],
      },
      provenance: {
        digital: "INFERRED",
        operational: "INFERRED",
        financial: "INFERRED",
        strengths: "INFERRED",
      },
    },
    opportunities: [
      {
        title: "Direct Online Ordering",
        category: "digital_transformation",
        priority: Priority.IMMEDIATE,
        confidence: 0.92,
        details: {
          description:
            "Build a branded online ordering flow with in-house delivery and pickup, integrated with the POS.",
          reasoning:
            "Reclaiming the 20-30% marketplace commission is the single highest-impact margin lever.",
          impact: "critical",
          feasibility: "moderate",
          estimatedTimeline: "2-4 months",
          estimatedInvestment: "$6,000 - $18,000",
          requiredCapabilities: ["Web Development", "POS Integration", "Payments"],
        },
      },
      {
        title: "Local SEO & Google Business Optimization",
        category: "brand_and_marketing",
        priority: Priority.SHORT_TERM,
        confidence: 0.86,
        details: {
          description:
            "Optimize both Google Business profiles, citations, and localized landing pages.",
          reasoning:
            "Nearby 'pizza near me' searches are high-intent and currently under-captured.",
          impact: "high",
          feasibility: "easy",
          estimatedTimeline: "1-2 months",
          estimatedInvestment: "$1,000 - $4,000",
          requiredCapabilities: ["Local SEO", "Content", "Analytics"],
        },
      },
      {
        title: "Customer Loyalty Program",
        category: "customer_experience",
        priority: Priority.SHORT_TERM,
        confidence: 0.8,
        details: {
          description:
            "Digital rewards tied to ordering accounts to increase repeat purchase frequency.",
          reasoning:
            "A strong existing customer base with no retention mechanism leaves frequency on the table.",
          impact: "medium",
          feasibility: "easy",
          estimatedTimeline: "1-2 months",
          estimatedInvestment: "$1,500 - $5,000",
          requiredCapabilities: ["CRM", "Loyalty Programs", "Customer Analytics"],
        },
      },
    ],
  },
  {
    email: "danielle@demo.opria.app",
    profile: {
      companyName: "GreenLeaf Landscaping",
      industry: "Home Services",
      size: CompanySize.SOLO,
      location: "Denver, Colorado",
      website: null,
      description:
        "A residential landscaping and lawn-care company with a small crew. Booking is done by phone and text; scheduling and quoting are manual.",
      goals: [
        "Move booking and quoting online",
        "Grow reviews and referral pipeline",
        "Fill off-season capacity with recurring maintenance plans",
      ],
      challenges: [
        "No online booking or scheduling",
        "Manual quoting and follow-up",
        "Few online reviews relative to competitors",
        "Seasonal demand swings",
      ],
    },
    analysis: {
      confidence: 0.75,
      healthScores: {
        overall: 50,
        digital: 28,
        operational: 42,
        financial: 52,
        market: 50,
        technology: 26,
        humanCapital: 60,
        customerExperience: 48,
        innovation: 30,
      },
      analysisData: {
        strengths: [
          "Skilled crew with strong word-of-mouth referrals",
          "Recurring revenue potential in maintenance",
          "Owner-operator responsiveness",
        ],
        weaknesses: [
          "Manual scheduling and quoting",
          "Weak online review presence",
          "Limited digital footprint",
        ],
        opportunities: [
          "Online booking and automated quoting",
          "Review generation to win local comparisons",
          "Recurring maintenance plans to smooth seasonality",
        ],
        threats: [
          "Competitors with polished booking experiences",
          "Seasonal cash-flow volatility",
          "Labor availability",
        ],
      },
      provenance: {
        digital: "INFERRED",
        operational: "INFERRED",
        market: "INFERRED",
      },
    },
    opportunities: [
      {
        title: "Online Booking & Scheduling System",
        category: "operational_efficiency",
        priority: Priority.IMMEDIATE,
        confidence: 0.9,
        details: {
          description:
            "Field-service scheduling with online booking, automated quotes, and job tracking.",
          reasoning:
            "Manual scheduling caps crew utilization and slows response to leads.",
          impact: "high",
          feasibility: "moderate",
          estimatedTimeline: "1-3 months",
          estimatedInvestment: "$3,000 - $10,000",
          requiredCapabilities: ["Field Service Software", "Automation", "Integrations"],
        },
      },
      {
        title: "Review Management & Reputation",
        category: "brand_and_marketing",
        priority: Priority.SHORT_TERM,
        confidence: 0.84,
        details: {
          description:
            "Automated review requests and reputation monitoring across Google and social.",
          reasoning:
            "Home-services buyers compare reviews heavily; volume is a deciding factor.",
          impact: "high",
          feasibility: "easy",
          estimatedTimeline: "1-2 months",
          estimatedInvestment: "$500 - $3,000",
          requiredCapabilities: ["Reputation Management", "CRM", "Marketing"],
        },
      },
      {
        title: "Recurring Maintenance Plans",
        category: "customer_experience",
        priority: Priority.MEDIUM_TERM,
        confidence: 0.77,
        details: {
          description:
            "Subscription-style seasonal maintenance plans with automated reminders and billing.",
          reasoning:
            "Smooths seasonal demand and increases customer lifetime value.",
          impact: "medium",
          feasibility: "moderate",
          estimatedTimeline: "2-3 months",
          estimatedInvestment: "$2,000 - $7,000",
          requiredCapabilities: ["Billing", "CRM", "Marketing Automation"],
        },
      },
    ],
  },
];

// ─── Additional professionals (pool grows to 15) ───

const professionals = [
  {
    email: "tom.rivera@demo.opria.app",
    name: "Tom Rivera",
    title: "SEO & Local Search Specialist",
    skills: ["Local SEO", "Google Business Profile", "Technical SEO", "Keyword Research", "Google Analytics", "Schema Markup"],
    services: ["Local SEO", "Search Optimization", "Analytics Setup"],
    certifications: ["Google Analytics Certified", "Semrush SEO Toolkit"],
    industryExpertise: ["Restaurant / Food", "Home Services", "Retail"],
    bio: "SEO specialist focused on helping local businesses win high-intent nearby searches.",
    hourlyRate: 90,
    projectMinBudget: 1000,
    projectMaxBudget: 12000,
    reputation: 4.6,
  },
  {
    email: "aisha.bello@demo.opria.app",
    name: "Aisha Bello",
    title: "Mobile App Developer",
    skills: ["React Native", "TypeScript", "Firebase", "REST APIs", "App Store Deployment"],
    services: ["Mobile App Development", "API Integration", "App Store Launch"],
    certifications: ["AWS Certified Developer"],
    industryExpertise: ["Retail", "SaaS", "Restaurant / Food"],
    bio: "Builds cross-platform mobile apps for small businesses ready to offer a native experience.",
    hourlyRate: 115,
    projectMinBudget: 6000,
    projectMaxBudget: 40000,
    reputation: 4.7,
  },
  {
    email: "greg.novak@demo.opria.app",
    name: "Greg Novak",
    title: "POS & Restaurant Systems Integrator",
    skills: ["Square", "Toast", "Clover", "POS Integration", "Online Ordering", "Payments"],
    services: ["POS Integration", "Online Ordering Setup", "Payment Systems"],
    certifications: ["Square Partner"],
    industryExpertise: ["Restaurant / Food", "Retail"],
    bio: "Connects restaurant POS systems with online ordering to cut marketplace fees and sync inventory.",
    hourlyRate: 105,
    projectMinBudget: 4000,
    projectMaxBudget: 25000,
    reputation: 4.5,
  },
  {
    email: "lena.fischer@demo.opria.app",
    name: "Lena Fischer",
    title: "Brand & Graphic Designer",
    skills: ["Brand Identity", "Logo Design", "Adobe Illustrator", "Print Design", "Packaging"],
    services: ["Brand Identity", "Graphic Design", "Marketing Collateral"],
    certifications: ["Adobe Certified Professional"],
    industryExpertise: ["Restaurant / Food", "Retail", "Lifestyle"],
    bio: "Creates memorable brand identities and packaging for food and retail businesses.",
    hourlyRate: 88,
    projectMinBudget: 2000,
    projectMaxBudget: 15000,
    reputation: 4.8,
  },
  {
    email: "marcus.webb@demo.opria.app",
    name: "Marcus Webb",
    title: "Paid Ads Specialist (Google & Meta)",
    skills: ["Google Ads", "Meta Ads", "PPC", "Conversion Tracking", "A/B Testing"],
    services: ["Paid Advertising", "Campaign Management", "Conversion Optimization"],
    certifications: ["Google Ads Certified", "Meta Media Buying"],
    industryExpertise: ["Home Services", "Restaurant / Food", "Retail"],
    bio: "Runs profitable local ad campaigns with tight conversion tracking for service businesses.",
    hourlyRate: 95,
    projectMinBudget: 1500,
    projectMaxBudget: 20000,
    reputation: 4.4,
  },
  {
    email: "sofia.marino@demo.opria.app",
    name: "Sofia Marino",
    title: "Email & Marketing Automation Strategist",
    skills: ["Klaviyo", "Mailchimp", "Email Automation", "Segmentation", "Copywriting"],
    services: ["Email Marketing", "Marketing Automation", "Retention Campaigns"],
    certifications: ["Klaviyo Partner", "HubSpot Email Marketing"],
    industryExpertise: ["Retail", "E-commerce", "Restaurant / Food"],
    bio: "Designs automated email flows that turn one-time buyers into repeat customers.",
    hourlyRate: 82,
    projectMinBudget: 1000,
    projectMaxBudget: 10000,
    reputation: 4.6,
  },
  {
    email: "dev.raman@demo.opria.app",
    name: "Dev Raman",
    title: "Data & Analytics Engineer",
    skills: ["SQL", "Looker Studio", "Data Warehousing", "ETL", "Dashboarding", "Python"],
    services: ["Analytics Setup", "Reporting Dashboards", "Data Integration"],
    certifications: ["Google Data Analytics Certificate"],
    industryExpertise: ["SaaS", "Retail", "E-commerce"],
    bio: "Turns scattered business data into clear dashboards owners can act on.",
    hourlyRate: 100,
    projectMinBudget: 3000,
    projectMaxBudget: 22000,
    reputation: 4.5,
  },
  {
    email: "chloe.bennett@demo.opria.app",
    name: "Chloe Bennett",
    title: "Customer Experience & CRM Consultant",
    skills: ["HubSpot", "Salesforce", "Customer Journeys", "Support Operations", "CRM"],
    services: ["CRM Implementation", "Customer Experience", "Support Processes"],
    certifications: ["HubSpot CRM Certified"],
    industryExpertise: ["Home Services", "Retail", "SaaS"],
    bio: "Helps service businesses systematize follow-up and customer experience in a CRM.",
    hourlyRate: 92,
    projectMinBudget: 2000,
    projectMaxBudget: 16000,
    reputation: 4.7,
  },
  {
    email: "omar.haddad@demo.opria.app",
    name: "Omar Haddad",
    title: "Field Service & Scheduling Software Consultant",
    skills: ["Jobber", "ServiceTitan", "Scheduling Automation", "Dispatch", "Quoting Systems"],
    services: ["Field Service Software", "Scheduling Automation", "Quoting Setup"],
    certifications: ["Jobber Certified Pro"],
    industryExpertise: ["Home Services", "Logistics"],
    bio: "Implements field-service platforms so crews spend less time scheduling and more time on jobs.",
    hourlyRate: 98,
    projectMinBudget: 2500,
    projectMaxBudget: 18000,
    reputation: 4.6,
  },
];

async function main() {
  console.log("🌱 Opria Seed (Phase 7 EXTRA) — Starting...\n");

  // ── Additional businesses ──
  for (const b of businesses) {
    const user = await prisma.user.upsert({
      where: { email: b.email },
      update: {},
      create: {
        supabaseId: placeholderId(b.email),
        email: b.email,
        role: Role.BUSINESS,
      },
    });

    const profile = await prisma.businessProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, ...b.profile },
    });

    const existingAnalysis = await prisma.businessAnalysis.findFirst({
      where: { businessId: profile.id },
      select: { id: true },
    });

    if (existingAnalysis) {
      console.log(`  ✓ ${b.profile.companyName} — already seeded (skipped)`);
      continue;
    }

    const analysis = await prisma.businessAnalysis.create({
      data: {
        businessId: profile.id,
        confidence: b.analysis.confidence,
        healthScores: b.analysis.healthScores,
        analysisData: b.analysis.analysisData,
        provenance: b.analysis.provenance,
      },
    });

    for (const opp of b.opportunities) {
      await prisma.opportunity.create({
        data: {
          businessId: profile.id,
          analysisId: analysis.id,
          title: opp.title,
          category: opp.category,
          priority: opp.priority,
          confidence: opp.confidence,
          status: OpportunityStatus.IDENTIFIED,
          details: opp.details,
        },
      });
    }

    console.log(
      `  ✓ ${b.profile.companyName} — analysis + ${b.opportunities.length} opportunities`
    );
  }

  // ── Additional professionals ──
  for (const p of professionals) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        supabaseId: placeholderId(p.email),
        email: p.email,
        role: Role.PROFESSIONAL,
      },
    });

    await prisma.professionalProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        name: p.name,
        title: p.title,
        skills: p.skills,
        services: p.services,
        certifications: p.certifications,
        industryExpertise: p.industryExpertise,
        bio: p.bio,
        hourlyRate: p.hourlyRate,
        projectMinBudget: p.projectMinBudget,
        projectMaxBudget: p.projectMaxBudget,
        reputation: p.reputation,
      },
    });

    console.log(`  ✓ ${p.name} — ${p.title}`);
  }

  const [businessCount, professionalCount, analysisCount, matchResultCount] =
    await Promise.all([
      prisma.businessProfile.count(),
      prisma.professionalProfile.count(),
      prisma.businessAnalysis.count(),
      prisma.matchResult.count(),
    ]);

  console.log("\n✅ Phase 7 extra seed complete.");
  console.log(
    `   Businesses: ${businessCount} · Professionals: ${professionalCount} · Analyses: ${analysisCount} · MatchResults: ${matchResultCount}`
  );
  console.log("   Bella's Boutique + 6 MatchResults are untouched.");
}

main()
  .catch((e) => {
    console.error("❌ Seed (extra) failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
