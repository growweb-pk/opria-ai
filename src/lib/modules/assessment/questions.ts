/**
 * Assessment Question Bank
 *
 * 13 questions across 8 blueprint-specified categories:
 *   Digital Presence (2), Marketing Maturity (2), Operations (2),
 *   Customer Management (1), Technology Adoption (2),
 *   Automation (1), AI Readiness (2), Security Awareness (1)
 *
 * Each question scored 0-5.
 * Compatible with AssessmentResponse model:
 *   questionId, category, question, answer, score
 */

export interface AssessmentOption {
  label: string;
  score: number;
}

export interface AssessmentQuestion {
  id: string;
  category: string;
  text: string;
  options: AssessmentOption[];
}

export const ASSESSMENT_CATEGORIES = [
  "Digital Presence",
  "Marketing Maturity",
  "Operations",
  "Customer Management",
  "Technology Adoption",
  "Automation",
  "AI Readiness",
  "Security Awareness",
] as const;

export type AssessmentCategory = (typeof ASSESSMENT_CATEGORIES)[number];

export const questions: AssessmentQuestion[] = [
  // ─── Digital Presence (2 questions) ─────────────────────
  {
    id: "dp-1",
    category: "Digital Presence",
    text: "Does your business have a website?",
    options: [
      { label: "No website at all", score: 0 },
      { label: "A basic social media page only", score: 1 },
      { label: "A simple one-page website", score: 2 },
      { label: "A multi-page website with basic info", score: 3 },
      { label: "A full website with product/service details", score: 4 },
      { label: "A professional website with e-commerce or booking", score: 5 },
    ],
  },
  {
    id: "dp-2",
    category: "Digital Presence",
    text: "Can customers purchase or book your services online?",
    options: [
      { label: "No — all transactions are in-person", score: 0 },
      { label: "Only through informal channels (DMs, phone)", score: 1 },
      { label: "We're planning to add online sales", score: 2 },
      { label: "Yes, but it's a basic setup", score: 3 },
      { label: "Yes, fully functional online store/booking", score: 5 },
    ],
  },

  // ─── Marketing Maturity (2 questions) ───────────────────
  {
    id: "mm-1",
    category: "Marketing Maturity",
    text: "Do you run any paid advertising or marketing campaigns?",
    options: [
      { label: "No advertising at all", score: 0 },
      { label: "Occasional social media boosts", score: 1 },
      { label: "Small budget on one platform", score: 2 },
      { label: "Multi-platform advertising with a set budget", score: 3 },
      { label: "Full marketing strategy with tracked ROI", score: 5 },
    ],
  },
  {
    id: "mm-2",
    category: "Marketing Maturity",
    text: "Do you have a defined brand identity (logo, colors, messaging)?",
    options: [
      { label: "No brand identity", score: 0 },
      { label: "A logo but no other brand guidelines", score: 1 },
      { label: "Logo and basic color scheme", score: 2 },
      { label: "Full brand guidelines document", score: 3 },
      { label: "Comprehensive brand strategy with voice and positioning", score: 5 },
    ],
  },

  // ─── Operations (2 questions) ───────────────────────────
  {
    id: "op-1",
    category: "Operations",
    text: "How do you manage inventory or service delivery?",
    options: [
      { label: "Manual counting / no system", score: 0 },
      { label: "Spreadsheets only", score: 1 },
      { label: "Basic inventory software", score: 2 },
      { label: "Dedicated inventory/operations management tool", score: 3 },
      { label: "Automated system integrated with sales", score: 5 },
    ],
  },
  {
    id: "op-2",
    category: "Operations",
    text: "Do you use a point-of-sale (POS) or payment system?",
    options: [
      { label: "Cash only, no system", score: 0 },
      { label: "Basic card reader", score: 1 },
      { label: "Standard POS (Square, Clover, etc.)", score: 3 },
      { label: "Advanced POS with inventory integration", score: 4 },
      { label: "Full POS with CRM, inventory, and reporting", score: 5 },
    ],
  },

  // ─── Customer Management (2 questions) ──────────────────
  {
    id: "cm-1",
    category: "Customer Management",
    text: "Do you have a system for collecting and managing customer data?",
    options: [
      { label: "No customer data collection at all", score: 0 },
      { label: "I remember regulars by name", score: 1 },
      { label: "Informal email list or spreadsheet", score: 2 },
      { label: "Basic CRM with customer records", score: 3 },
      { label: "Full CRM with purchase history and segmentation", score: 5 },
    ],
  },
  {
    id: "cm-2",
    category: "Customer Management",
    text: "Do you have a customer loyalty or retention program?",
    options: [
      { label: "No loyalty program", score: 0 },
      { label: "Informal — I remember regulars", score: 1 },
      { label: "Basic punch card or points system", score: 2 },
      { label: "Formal loyalty program with tiers", score: 3 },
      { label: "Full CRM-driven retention strategy", score: 5 },
    ],
  },

  // ─── Technology Adoption (2 questions) ──────────────────
  {
    id: "ta-1",
    category: "Technology Adoption",
    text: "What software tools does your business use?",
    options: [
      { label: "Nothing — pen and paper", score: 0 },
      { label: "Basic spreadsheet and email", score: 1 },
      { label: "A few tools (POS, email, social media)", score: 2 },
      { label: "Multiple integrated tools", score: 3 },
      { label: "Full tech stack with automation", score: 5 },
    ],
  },
  {
    id: "ta-2",
    category: "Technology Adoption",
    text: "How do you store and manage business data?",
    options: [
      { label: "No data storage — everything in my head", score: 0 },
      { label: "Local files on my computer", score: 1 },
      { label: "Cloud storage (Google Drive, Dropbox)", score: 2 },
      { label: "Organized cloud storage with backups", score: 3 },
      { label: "Centralized database with automated backups", score: 5 },
    ],
  },

  // ─── Automation (2 questions) ───────────────────────────
  {
    id: "au-1",
    category: "Automation",
    text: "How much of your daily operations are automated?",
    options: [
      { label: "Everything is done manually", score: 0 },
      { label: "A few tasks are automated (e.g., receipts)", score: 1 },
      { label: "Some workflows are automated (ordering, invoicing)", score: 2 },
      { label: "Most repetitive tasks are automated", score: 3 },
      { label: "Full workflow automation across operations", score: 5 },
    ],
  },
  {
    id: "au-2",
    category: "Automation",
    text: "Do your business tools integrate with each other?",
    options: [
      { label: "No integration — everything is separate", score: 0 },
      { label: "Some manual data transfer between tools", score: 1 },
      { label: "A few tools connect automatically", score: 2 },
      { label: "Most tools are integrated", score: 3 },
      { label: "Fully integrated ecosystem with data flowing between all tools", score: 5 },
    ],
  },

  // ─── AI Readiness (2 questions) ─────────────────────────
  {
    id: "ai-1",
    category: "AI Readiness",
    text: "Does your business currently use any AI-powered tools?",
    options: [
      { label: "No AI tools at all", score: 0 },
      { label: "Basic tools (spell-check, autocomplete)", score: 1 },
      { label: "Some AI features in existing tools (e.g., smart suggestions)", score: 2 },
      { label: "Actively using AI tools for marketing or operations", score: 3 },
      { label: "AI is integrated into multiple business processes", score: 5 },
    ],
  },
  {
    id: "ai-2",
    category: "AI Readiness",
    text: "How open is your business to adopting AI and new technologies?",
    options: [
      { label: "Not interested — I stick to what works", score: 0 },
      { label: "Curious but haven't tried anything", score: 1 },
      { label: "Willing to try if there's a clear benefit", score: 2 },
      { label: "Actively exploring AI solutions for my business", score: 3 },
      { label: "Already experimenting and investing in AI", score: 5 },
    ],
  },

  // ─── Security Awareness (1 question) ────────────────────
  {
    id: "sa-1",
    category: "Security Awareness",
    text: "How secure is your business data and customer information?",
    options: [
      { label: "No security measures", score: 0 },
      { label: "Basic passwords only", score: 1 },
      { label: "Strong passwords and some encryption", score: 2 },
      { label: "Password manager, 2FA, encrypted storage", score: 3 },
      { label: "Full security policy with compliance measures", score: 5 },
    ],
  },
];

/**
 * Get questions for a specific category.
 */
export function getQuestionsByCategory(
  category: string
): AssessmentQuestion[] {
  return questions.filter((q) => q.category === category);
}

/**
 * Get all questions grouped by category.
 */
export function getQuestionsGrouped(): Record<string, AssessmentQuestion[]> {
  const grouped: Record<string, AssessmentQuestion[]> = {};
  for (const category of ASSESSMENT_CATEGORIES) {
    grouped[category] = getQuestionsByCategory(category);
  }
  return grouped;
}

/**
 * Get total question count.
 */
export function getTotalQuestions(): number {
  return questions.length;
}

/**
 * Get a question by its ID.
 */
export function getQuestionById(id: string): AssessmentQuestion | undefined {
  return questions.find((q) => q.id === id);
}
