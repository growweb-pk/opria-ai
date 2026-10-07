import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Database (Supabase PostgreSQL via Prisma)
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),

  // AI Provider
  AI_PROVIDER: z.enum(["gemini", "openai", "custom"]).default("gemini"),
  AI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().default("gemini-3.6-flash"),
  AI_MODEL_JSON: z.string().optional(), // Structured-output agents (analysis, research, matching, etc.)
  AI_MODEL_CHAT: z.string().optional(), // Advisor conversational agent
  AI_MAX_TOKENS: z.coerce.number().default(4096),
  AI_BASE_URL: z.string().url().optional(), // For OpenAI/custom providers

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Demo
  DEMO_MODE_ENABLED: z.enum(["true", "false"]).default("false"),
});

export type Env = z.infer<typeof envSchema>;

// Lazy validation — validated on first access, not on import.
// This lets the dev server compile without real credentials.
let _env: Env | null = null;

function getEnv(): Env {
  if (_env) return _env;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error(
      "Invalid environment variables. Copy .env.example to .env.local and fill in your credentials."
    );
  }

  _env = parsed.data;
  return _env;
}

/**
 * Access validated environment variables.
 * Throws if required variables are missing.
 * Only call this from server-side code (Route Handlers, Server Actions, Server Components).
 */
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});
