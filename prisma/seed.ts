/**
 * Opria Seed Script — Demo Data
 *
 * Seeds the database with realistic demo data centered around:
 * - Bella's Boutique (clothing retail going online)
 * - 6 professional profiles (clearly fictional)
 * - Complete business analysis, opportunities, conversation, requirement, and match results
 *
 * Usage:
 *   npm run db:seed
 *
 * Requires:
 * - Database tables created via `npx prisma db push`
 * - Valid Supabase credentials in .env.local (for auth user creation)
 * - If Supabase credentials are placeholders, seed continues with placeholder IDs
 *   (demo users cannot log in, but data structure is fully seeded)
 */

import { PrismaClient, Role, CompanySize, Priority, OpportunityStatus, RequirementStatus, MatchStatus } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

// ─── Configuration ───────────────────────────────────────

const DEMO_PASSWORD = "OpriaDemo2026!";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function hasRealSupabase(): boolean {
  return (
    SUPABASE_URL.length > 0 &&
    SUPABASE_SERVICE_KEY.length > 0 &&
    !SUPABASE_URL.includes("placeholder") &&
    !SUPABASE_SERVICE_KEY.includes("placeholder")
  );
}

// ─── Supabase Auth Helper ────────────────────────────────

async function getOrCreateAuthUser(
  supabase: any,
  email: string
): Promise<string> {
  if (!supabase) {
    // Return deterministic placeholder ID for offline seeding
    return `demo-${email.split("@")[0]}-00000000`;
  }

  try {
    // Check if user already exists by listing and filtering
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existingUser = listData?.users?.find((u: any) => u.email === email);
    if (existingUser) {
      return existingUser.id;
    }

    // Create new auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { demo: true },
    });

    if (error) {
      console.warn(`  ⚠ Could not create auth user for ${email}: ${error.message}`);
      return `demo-${email.split("@")[0]}-00000000`;
    }

    return data.user.id;
  } catch {
    console.warn(`  ⚠ Supabase auth unavailable, using placeholder for ${email}`);
    return `demo-${email.split("@")[0]}-00000000`;
  }
}

// ─── Main Seed ───────────────────────────────────────────

async function main() {
  console.log("🌱 Opria Seed — Starting...\n");

  const supabase = hasRealSupabase()
    ? (createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      }) as any)
    : null;

  if (!supabase) {
    console.log("⚠ Supabase credentials not configured or are placeholders.");
    console.log("  Demo users will have placeholder supabaseIds and cannot log in.");
    console.log("  Configure real credentials in .env.local for full demo login.\n");
  } else {
    console.log("✓ Supabase connected — demo auth users will be created.");
    console.log(`  Demo password for all users: ${DEMO_PASSWORD}\n`);
  }

  // ── 1. Create Demo Users ──────────────────────────────

  console.log("👤 Creating demo users...");

  const bellaSupabaseId = await getOrCreateAuthUser(supabase, "bella@demo.opria.app");
  const bella = await prisma.user.upsert({
    where: { supabaseId: bellaSupabaseId },
    update: {},
    create: { supabaseId: bellaSupabaseId, email: "bella@demo.opria.app", role: Role.BUSINESS },
  });
  console.log(`  ✓ Bella (Business) — ${bella.id}`);

  const adminSupabaseId = await getOrCreateAuthUser(supabase, "admin@demo.opria.app");
  const admin = await prisma.user.upsert({
    where: { supabaseId: adminSupabaseId },
    update: {},
    create: { supabaseId: adminSupabaseId, email: "admin@demo.opria.app", role: Role.ADMIN },
  });
  console.log(`  ✓ Admin (Admin) — ${admin.id}`);

  const professionalEmails = [
    "alex.chen@demo.opria.app",
    "maria.santos@demo.opria.app",
    "james.wright@demo.opria.app",
    "priya.patel@demo.opria.app",
    "david.kim@demo.opria.app",
    "sarah.johnson@demo.opria.app",
  ];

  const professionalUsers = [];
  for (const email of professionalEmails) {
    const sid = await getOrCreateAuthUser(supabase, email);
    const user = await prisma.user.upsert({
      where: { supabaseId: sid },
      update: {},
      create: { supabaseId: sid, email, role: Role.PROFESSIONAL },
    });
    professionalUsers.push(user);
    console.log(`  ✓ ${email.split("@")[0]} (Professional) — ${user.id}`);
  }

  // ── 2. Bella's Boutique — Business Profile ────────────

  console.log("\n🏪 Creating Bella's Boutique...");

  const businessProfile = await prisma.businessProfile.upsert({
    where: { userId: bella.id },
    update: {},
    create: {
      userId: bella.id,
      companyName: "Bella's Boutique",
      industry: "Retail / Fashion",
      size: CompanySize.SMALL,
      location: "Portland, Oregon",
      website: null,
      description:
        "A women's clothing boutique specializing in curated fashion from independent designers. Operating for 8 years with a loyal local customer base, now looking to expand online.",
      goals: [
        "Launch an e-commerce website to sell clothing online",
        "Build a social media presence to reach new customers",
        "Implement a customer loyalty program",
        "Expand to new markets beyond Portland",
      ],
      challenges: [
        "No online sales channel — all revenue from physical store",
        "Limited social media presence",
        "Inventory management is manual (spreadsheet)",
        "No customer data or analytics",
        "Competition from online fashion retailers",
      ],
    },
  });
  console.log(`  ✓ Business Profile — ${businessProfile.id}`);

  // ── 3. Assessment ─────────────────────────────────────

  console.log("\n📋 Creating assessment...");

  const assessment = await prisma.assessment.create({
    data: {
      businessId: businessProfile.id,
      status: "COMPLETED",
      completedAt: new Date("2026-08-15"),
      responses: {
        create: [
          { questionId: "q1", category: "Digital Presence", question: "Does your business have a website?", answer: "No website currently", score: 1 },
          { questionId: "q2", category: "Digital Presence", question: "Do you sell products online?", answer: "No, only in-store", score: 0 },
          { questionId: "q3", category: "Digital Presence", question: "Do you use social media for business?", answer: "Personal Instagram only, not actively managed", score: 2 },
          { questionId: "q4", category: "Operations", question: "How do you manage inventory?", answer: "Spreadsheet and manual counting", score: 2 },
          { questionId: "q5", category: "Operations", question: "Do you use a POS system?", answer: "Basic Square POS for payments", score: 3 },
          { questionId: "q6", category: "Operations", question: "How do you handle customer orders?", answer: "All in-person at the store", score: 1 },
          { questionId: "q7", category: "Marketing", question: "Do you run digital marketing campaigns?", answer: "No paid advertising", score: 1 },
          { questionId: "q8", category: "Marketing", question: "Do you collect customer emails?", answer: "Informally at checkout, not systematic", score: 2 },
          { questionId: "q9", category: "Financial", question: "Do you track revenue by product category?", answer: "Roughly, through POS reports", score: 3 },
          { questionId: "q10", category: "Technology", question: "What software tools do you use?", answer: "Square POS, basic spreadsheet, Instagram", score: 2 },
          { questionId: "q11", category: "Human Capital", question: "How many employees do you have?", answer: "2 part-time employees plus myself", score: 3 },
          { questionId: "q12", category: "Customer Experience", question: "Do you have a customer feedback system?", answer: "Word of mouth and occasional Google reviews", score: 2 },
        ],
      },
    },
  });
  console.log(`  ✓ Assessment with 12 responses — ${assessment.id}`);

  // ── 4. Business Analysis ──────────────────────────────

  console.log("\n📊 Creating business analysis...");

  const analysis = await prisma.businessAnalysis.create({
    data: {
      businessId: businessProfile.id,
      assessmentId: assessment.id,
      confidence: 0.82,
      healthScores: {
        overall: 38,
        digital: 12,
        operational: 35,
        financial: 45,
        market: 40,
        technology: 20,
        humanCapital: 55,
        customerExperience: 35,
        innovation: 25,
      },
      analysisData: {
        strengths: [
          "Strong local brand recognition in Portland",
          "Loyal customer base with 8 years of operation",
          "Curated product selection from independent designers",
          "Hands-on owner involvement in daily operations",
        ],
        weaknesses: [
          "No online sales channel",
          "Manual inventory management",
          "Limited digital marketing capability",
          "Small team with no specialized tech skills",
        ],
        opportunities: [
          "E-commerce expansion could significantly increase revenue",
          "Social media marketing to reach younger demographics",
          "Online marketplace presence (Etsy, Amazon Handmade)",
          "Customer loyalty program to increase retention",
        ],
        threats: [
          "Competition from online fashion retailers",
          "Changing consumer shopping habits",
          "Rising commercial rent costs",
          "Supply chain dependency on independent designers",
        ],
      },
      provenance: {
        digital: "INFERRED",
        operational: "INFERRED",
        financial: "INFERRED",
        strengths: "INFERRED",
        weaknesses: "INFERRED",
      },
    },
  });
  console.log(`  ✓ Business Analysis — ${analysis.id}`);

  // ── 5. Opportunities ──────────────────────────────────

  console.log("\n🎯 Creating opportunities...");

  const opportunities = [
    {
      title: "Launch E-commerce Website",
      category: "digital_transformation",
      priority: Priority.IMMEDIATE,
      confidence: 0.95,
      status: OpportunityStatus.IDENTIFIED,
      details: {
        description: "Build a full-featured online store with product catalog, shopping cart, payment processing, and shipping integration.",
        reasoning: "The business currently has zero online revenue. E-commerce is the single highest-impact opportunity for revenue growth.",
        impact: "critical",
        feasibility: "moderate",
        estimatedTimeline: "3-6 months",
        estimatedInvestment: "$8,000 - $25,000",
        requiredCapabilities: ["Web Development", "E-commerce", "Payment Integration", "UX/UI Design"],
      },
    },
    {
      title: "Social Media Marketing Strategy",
      category: "brand_and_marketing",
      priority: Priority.IMMEDIATE,
      confidence: 0.9,
      status: OpportunityStatus.IDENTIFIED,
      details: {
        description: "Develop a comprehensive social media strategy including content calendar, brand voice, and paid advertising on Instagram and TikTok.",
        reasoning: "Bella only uses a personal Instagram account. A strategic social media presence could dramatically increase brand awareness and drive e-commerce traffic.",
        impact: "high",
        feasibility: "easy",
        estimatedTimeline: "1-3 months",
        estimatedInvestment: "$2,000 - $8,000",
        requiredCapabilities: ["Social Media Marketing", "Content Creation", "Brand Strategy"],
      },
    },
    {
      title: "Inventory Management System",
      category: "operational_efficiency",
      priority: Priority.SHORT_TERM,
      confidence: 0.85,
      status: OpportunityStatus.IDENTIFIED,
      details: {
        description: "Implement a modern inventory management system that integrates with both POS and e-commerce, with automated stock tracking and reorder alerts.",
        reasoning: "Manual spreadsheet-based inventory management will not scale with e-commerce and creates risk of overselling and stock discrepancies.",
        impact: "high",
        feasibility: "moderate",
        estimatedTimeline: "1-2 months",
        estimatedInvestment: "$3,000 - $10,000",
        requiredCapabilities: ["Inventory Management", "Software Integration", "Process Optimization"],
      },
    },
    {
      title: "Customer Loyalty Program",
      category: "customer_experience",
      priority: Priority.SHORT_TERM,
      confidence: 0.8,
      status: OpportunityStatus.IDENTIFIED,
      details: {
        description: "Implement a digital loyalty program with points, rewards, and personalized offers based on purchase history.",
        reasoning: "Bella's has 8 years of loyal customers but no systematic retention program. A loyalty program could increase repeat purchases by 20-40%.",
        impact: "medium",
        feasibility: "easy",
        estimatedTimeline: "1-2 months",
        estimatedInvestment: "$1,000 - $5,000",
        requiredCapabilities: ["CRM", "Loyalty Programs", "Customer Analytics"],
      },
    },
    {
      title: "Email Marketing & Automation",
      category: "brand_and_marketing",
      priority: Priority.MEDIUM_TERM,
      confidence: 0.75,
      status: OpportunityStatus.IDENTIFIED,
      details: {
        description: "Build an email list systematically and implement automated email campaigns for new arrivals, promotions, and abandoned cart recovery.",
        reasoning: "Email addresses are collected informally at checkout but not used systematically. Email marketing has the highest ROI of any digital channel.",
        impact: "medium",
        feasibility: "easy",
        estimatedTimeline: "1-2 months",
        estimatedInvestment: "$500 - $3,000",
        requiredCapabilities: ["Email Marketing", "Marketing Automation", "Copywriting"],
      },
    },
  ];

  for (const opp of opportunities) {
    await prisma.opportunity.create({
      data: {
        businessId: businessProfile.id,
        analysisId: analysis.id,
        ...opp,
      },
    });
    console.log(`  ✓ ${opp.title}`);
  }

  // ── 6. Professional Profiles ──────────────────────────

  console.log("\n👔 Creating professional profiles...");

  const professionalProfiles = [
    {
      name: "Alex Chen",
      title: "Full-Stack E-commerce Developer",
      skills: ["Shopify", "React", "Node.js", "Stripe", "Tailwind CSS", "Next.js", "PostgreSQL"],
      services: ["E-commerce Development", "Custom Web Applications", "API Integration", "Payment Systems"],
      certifications: ["Shopify Partner", "AWS Certified Developer"],
      industryExpertise: ["Retail", "Fashion", "E-commerce"],
      bio: "Full-stack developer specializing in e-commerce solutions for retail brands. 6 years of experience building online stores that convert. Focused on creating seamless shopping experiences with robust backend systems.",
      hourlyRate: 120,
      projectMinBudget: 5000,
      projectMaxBudget: 50000,
      reputation: 4.7,
    },
    {
      name: "Maria Santos",
      title: "Digital Marketing Strategist",
      skills: ["Instagram Marketing", "TikTok Ads", "Facebook Ads", "Content Strategy", "Brand Development", "Influencer Marketing", "Google Analytics"],
      services: ["Social Media Strategy", "Paid Advertising", "Brand Positioning", "Influencer Partnerships"],
      certifications: ["Google Ads Certified", "Meta Blueprint Certified", "HubSpot Inbound Marketing"],
      industryExpertise: ["Fashion", "Lifestyle", "Beauty", "Retail"],
      bio: "Digital marketing specialist with a focus on fashion and lifestyle brands. Helped 30+ small retailers build their online presence from scratch. Passionate about authentic brand storytelling.",
      hourlyRate: 95,
      projectMinBudget: 2000,
      projectMaxBudget: 15000,
      reputation: 4.8,
    },
    {
      name: "James Wright",
      title: "E-commerce & Retail Consultant",
      skills: ["Shopify", "WooCommerce", "Inventory Management", "POS Systems", "Shipping Logistics", "Retail Operations"],
      services: ["E-commerce Platform Selection", "Inventory System Setup", "Retail Operations Consulting", "POS Integration"],
      certifications: ["Shopify Plus Partner", "Retail Management Certificate"],
      industryExpertise: ["Retail", "E-commerce", "Logistics"],
      bio: "Retail operations consultant who bridges the gap between physical stores and online commerce. Specialized in helping traditional retailers transition to omnichannel. Previously managed operations for a mid-size fashion chain.",
      hourlyRate: 150,
      projectMinBudget: 8000,
      projectMaxBudget: 40000,
      reputation: 4.6,
    },
    {
      name: "Priya Patel",
      title: "UX/UI Designer & Brand Strategist",
      skills: ["Figma", "UI Design", "UX Research", "Brand Identity", "Responsive Design", "Design Systems", "Adobe Creative Suite"],
      services: ["Website Design", "Brand Identity", "Mobile App Design", "Design Systems"],
      certifications: ["Google UX Design Certificate", "Interaction Design Foundation"],
      industryExpertise: ["Fashion", "Lifestyle", "E-commerce", "Beauty"],
      bio: "Designer who creates beautiful, conversion-focused digital experiences for fashion brands. Believes that great design should feel as curated as a boutique's product selection.",
      hourlyRate: 110,
      projectMinBudget: 4000,
      projectMaxBudget: 25000,
      reputation: 4.9,
    },
    {
      name: "David Kim",
      title: "CRM & Loyalty Systems Specialist",
      skills: ["HubSpot", "Klaviyo", "Mailchimp", "Customer Analytics", "Email Automation", "Loyalty Programs", "Data Analysis"],
      services: ["CRM Implementation", "Email Marketing Setup", "Loyalty Program Design", "Customer Data Strategy"],
      certifications: ["HubSpot CRM Certified", "Klaviyo Partner"],
      industryExpertise: ["Retail", "E-commerce", "SaaS"],
      bio: "Customer retention specialist focused on helping small businesses build systematic customer engagement. Expert in email automation and loyalty programs that drive repeat purchases.",
      hourlyRate: 85,
      projectMinBudget: 1500,
      projectMaxBudget: 12000,
      reputation: 4.5,
    },
    {
      name: "Sarah Johnson",
      title: "Content Creator & Social Media Manager",
      skills: ["Photography", "Video Editing", "Copywriting", "Instagram Reels", "TikTok", "Content Calendars", "Community Management"],
      services: ["Social Media Management", "Content Production", "Brand Photography", "Video Content"],
      certifications: ["Adobe Creative Cloud Certified"],
      industryExpertise: ["Fashion", "Food", "Lifestyle", "Local Business"],
      bio: "Content creator based in Portland specializing in fashion and lifestyle brands. Creates authentic visual content that tells a brand's story and builds community engagement.",
      hourlyRate: 75,
      projectMinBudget: 1000,
      projectMaxBudget: 8000,
      reputation: 4.4,
    },
  ];

  const createdProfessionals = [];
  for (let i = 0; i < professionalProfiles.length; i++) {
    const profile = await prisma.professionalProfile.upsert({
      where: { userId: professionalUsers[i].id },
      update: {},
      create: {
        userId: professionalUsers[i].id,
        ...professionalProfiles[i],
      },
    });
    createdProfessionals.push(profile);
    console.log(`  ✓ ${profile.name} — ${profile.title}`);
  }

  // ── 7. Advisor Conversation ───────────────────────────

  console.log("\n💬 Creating advisor conversation...");

  const conversation = await prisma.conversation.create({
    data: {
      businessId: businessProfile.id,
      userId: bella.id,
      status: "COMPLETED",
      context: {
        stage: "requirement-gathering",
        topicsCovered: ["e-commerce-platform", "budget", "timeline", "inventory-integration"],
      },
      messages: {
        create: [
          { role: "ADVISOR", content: "Hi Bella! I've reviewed your business profile and assessment. It looks like you're in a great position to grow online. Let me ask a few questions to understand exactly what you need. What's your biggest priority right now — getting products online, building your brand, or something else?" },
          { role: "USER", content: "Definitely getting products online. I'm losing customers who want to shop from home, especially after the pandemic changed shopping habits. My regulars love coming in, but I know there are customers I'm missing." },
          { role: "ADVISOR", content: "That makes perfect sense. When you think about an online store, do you have a platform preference? Have you looked into Shopify, WooCommerce, or are you open to recommendations?" },
          { role: "USER", content: "I've heard of Shopify but never really explored it. I want something I can manage myself once it's set up. I'm not super technical — I can use Square and Instagram, that's about it." },
          { role: "ADVISOR", content: "Good to know. Shopify is actually a great fit for someone with your technical comfort level. What's your budget range for getting the online store set up? This helps me understand what's realistic." },
          { role: "USER", content: "I'd say between $10,000 and $20,000 for the initial build. I can invest more over time for marketing, but the website itself needs to be solid from day one." },
          { role: "ADVISOR", content: "That's a healthy budget for a well-built Shopify store. What about timeline — is there a deadline? A seasonal push, maybe holiday season?" },
          { role: "USER", content: "Ideally before the holiday season starts in November. That's my biggest sales period. So I'd want it live by October at the latest." },
          { role: "ADVISOR", content: "That gives us about 2-3 months, which is achievable. One more question — how would the online store connect with your current inventory? Would you need the online store to sync with your Square POS so stock levels stay accurate?" },
          { role: "USER", content: "Yes! That's really important. I can't be manually updating stock in two places. If I sell a dress in the store, it needs to come off the website immediately, and vice versa." },
          { role: "ADVISOR", content: "Absolutely — real-time inventory sync between Shopify and Square is a standard integration. I think I have a clear picture now. Here's what I'm seeing:\n\n1. A Shopify-based online store with your curated fashion catalog\n2. Integration with your existing Square POS for real-time inventory sync\n3. Mobile-responsive design that reflects your boutique's brand aesthetic\n4. Basic marketing setup (email capture, social links, SEO)\n\nYour budget of $10-20K is realistic, and an October launch before holidays is achievable. Shall I put together a detailed requirement document and find the right professionals for this?" },
          { role: "USER", content: "Yes, that sounds perfect! Please do." },
        ],
      },
    },
  });
  console.log(`  ✓ Conversation with 12 messages — ${conversation.id}`);

  // ── 8. Structured Requirement ─────────────────────────

  console.log("\n📝 Creating structured requirement...");

  const requirement = await prisma.requirement.create({
    data: {
      conversationId: conversation.id,
      businessId: businessProfile.id,
      title: "E-commerce Website with POS Integration for Bella's Boutique",
      status: RequirementStatus.MATCHING,
      confidence: 0.88,
      structuredData: {
        summary: "Bella's Boutique needs a full-featured e-commerce website built on Shopify, integrated with their existing Square POS for real-time inventory synchronization. The store must launch before the November holiday season.",
        goals: [
          { description: "Launch a fully functional online store before October", source: "PROVIDED" },
          { description: "Sync inventory between online store and physical POS", source: "PROVIDED" },
          { description: "Create a brand-consistent digital shopping experience", source: "INFERRED" },
          { description: "Enable email capture and basic marketing automation", source: "INFERRED" },
        ],
        requirements: [
          { category: "E-commerce Platform", description: "Shopify-based online store with product catalog (est. 200-400 SKUs)", priority: "must-have", source: "INFERRED" },
          { category: "POS Integration", description: "Real-time inventory sync between Shopify and Square POS", priority: "must-have", source: "PROVIDED" },
          { category: "Design", description: "Mobile-responsive design matching boutique brand aesthetic", priority: "must-have", source: "PROVIDED" },
          { category: "Payment", description: "Payment processing (Shopify Payments or Stripe)", priority: "must-have", source: "INFERRED" },
          { category: "Shipping", description: "Shipping rate calculation and label generation", priority: "must-have", source: "INFERRED" },
          { category: "Marketing", description: "Email capture popups and newsletter integration", priority: "should-have", source: "PROVIDED" },
          { category: "SEO", description: "Basic SEO setup (meta tags, sitemap, structured data)", priority: "should-have", source: "INFERRED" },
          { category: "Analytics", description: "Google Analytics and conversion tracking setup", priority: "should-have", source: "INFERRED" },
          { category: "Training", description: "Owner training on managing products, orders, and basic updates", priority: "must-have", source: "INFERRED" },
        ],
        constraints: [
          { type: "budget", description: "$10,000 - $20,000 initial investment", source: "PROVIDED" },
          { type: "timeline", description: "Must launch before November holiday season (October deadline)", source: "PROVIDED" },
          { type: "technical", description: "Owner has limited technical skills — system must be manageable", source: "PROVIDED" },
          { type: "resource", description: "2-3 month development window", source: "INFERRED" },
        ],
        budget: { estimated: "$10,000 - $20,000", confidence: 0.9, source: "PROVIDED" },
        timeline: { estimated: "2-3 months", deadline: "October 2026", confidence: 0.85, source: "PROVIDED" },
        professionalCategories: [
          { name: "E-commerce Developer", description: "Shopify specialist with POS integration experience", requiredSkills: ["Shopify", "POS Integration", "Payment Systems"], priority: "primary" },
          { name: "UX/UI Designer", description: "Fashion/retail brand designer", requiredSkills: ["UI Design", "Brand Identity", "Responsive Design"], priority: "primary" },
          { name: "Digital Marketer", description: "E-commerce launch marketing", requiredSkills: ["Email Marketing", "SEO", "Social Media"], priority: "secondary" },
        ],
      },
    },
  });
  console.log(`  ✓ Structured Requirement — ${requirement.id}`);

  // ── 9. Match Request & Results ────────────────────────

  console.log("\n🔗 Creating match results...");

  const matchRequest = await prisma.matchRequest.create({
    data: {
      requirementId: requirement.id,
      businessId: businessProfile.id,
      status: MatchStatus.COMPLETED,
      completedAt: new Date(),
      results: {
        method: "hybrid",
        structuredWeight: 0.7,
        aiWeight: 0.3,
        totalCandidates: 6,
      },
    },
  });

  // Match results with realistic scoring
  const matchData = [
    { professional: createdProfessionals[0], structuredScore: 92, aiScore: 88, rank: 1, skills: ["Shopify", "Payment Integration", "Next.js"], gaps: ["Brand Design"] },
    { professional: createdProfessionals[2], structuredScore: 88, aiScore: 85, rank: 2, skills: ["Shopify", "POS Systems", "Inventory Management"], gaps: ["Design"] },
    { professional: createdProfessionals[3], structuredScore: 72, aiScore: 78, rank: 3, skills: ["UI Design", "Brand Identity", "Responsive Design"], gaps: ["Shopify Development"] },
    { professional: createdProfessionals[1], structuredScore: 55, aiScore: 62, rank: 4, skills: ["Social Media", "Content Strategy"], gaps: ["E-commerce Development", "POS Integration"] },
    { professional: createdProfessionals[4], structuredScore: 45, aiScore: 50, rank: 5, skills: ["Email Automation", "CRM"], gaps: ["E-commerce Development"] },
    { professional: createdProfessionals[5], structuredScore: 40, aiScore: 48, rank: 6, skills: ["Content Creation", "Photography"], gaps: ["Development", "POS Integration"] },
  ];

  for (const m of matchData) {
    const finalScore = m.structuredScore * 0.7 + m.aiScore * 0.3;
    await prisma.matchResult.create({
      data: {
        matchRequestId: matchRequest.id,
        professionalId: m.professional.id,
        structuredScore: m.structuredScore,
        aiScore: m.aiScore,
        finalScore: Math.round(finalScore * 10) / 10,
        rank: m.rank,
        scoreBreakdown: {
          skillMatch: m.structuredScore,
          industryFit: m.aiScore > 70 ? 85 : m.aiScore > 50 ? 60 : 35,
          budgetFit: 80,
          availabilityFit: 75,
          reputationScore: m.professional.reputation * 20,
        },
        explanation: {
          headline: m.rank <= 2 ? "Strong match" : m.rank <= 4 ? "Moderate match" : "Partial match",
          skillOverlap: m.skills,
          skillGaps: m.gaps,
          reasoning: m.rank <= 2
            ? `${m.professional.name} has direct experience with the required technologies and a strong track record in e-commerce development.`
            : `${m.professional.name} brings complementary skills that could support the project but may need to be paired with a developer.`,
        },
      },
    });
    console.log(`  ✓ #${m.rank} ${m.professional.name} — Score: ${Math.round(finalScore * 10) / 10}`);
  }

  // ── Summary ───────────────────────────────────────────

  console.log("\n" + "═".repeat(50));
  console.log("✅ Seed complete!");
  console.log("═".repeat(50));
  console.log(`\n📊 Data created:`);
  console.log(`   - 8 users (1 business + 6 professionals + 1 admin)`);
  console.log(`   - 1 business profile (Bella's Boutique)`);
  console.log(`   - 1 assessment with 12 responses`);
  console.log(`   - 1 business analysis`);
  console.log(`   - 5 opportunities`);
  console.log(`   - 6 professional profiles`);
  console.log(`   - 1 conversation with 12 messages`);
  console.log(`   - 1 structured requirement`);
  console.log(`   - 6 match results`);

  if (supabase) {
    console.log(`\n🔐 Demo login credentials:`);
    console.log(`   Email: bella@demo.opria.app`);
    console.log(`   Password: ${DEMO_PASSWORD}`);
    console.log(`   (All demo users share this password)`);
  } else {
    console.log(`\n⚠ No Supabase auth — demo users cannot log in.`);
    console.log(`   Configure real Supabase credentials and re-run:`);
    console.log(`   npx prisma db push --force-reset`);
    console.log(`   npm run db:seed`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
