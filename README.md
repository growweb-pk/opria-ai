# Opria — AI-Powered Business Growth Operating System

Opria helps businesses understand their needs before connecting them with the right professionals. It is not a marketplace — it is the advisory layer that sits in front of every business technology decision.

## Core Innovation

Unlike traditional marketplaces that start after a business has decided what it needs, Opria starts **before** — helping a business understand what problem it is actually trying to solve before any solution is recommended.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **UI:** Tailwind CSS + shadcn/ui
- **Database:** Supabase PostgreSQL (via Prisma ORM)
- **Auth:** Supabase Auth
- **AI:** Google Gemini 2.5 Flash (configurable provider abstraction)
- **Deployment:** Vercel

## AI Architecture

Opria uses a **modular AI pipeline** with 7 specialized agents:

1. **Business Research** — Structures business data, identifies missing information
2. **Business Analysis** — Health scores, SWOT, key findings
3. **Opportunity Discovery** — Identifies and prioritizes growth opportunities
4. **AI Business Advisor** — Conversational requirement discovery
5. **Requirement Structuring** — Produces structured project requirements
6. **Matching Support** — Semantic professional matching (0-100 scores)
7. **Explanation** — Generates match explanations

All AI calls go through a **provider abstraction layer** (`src/lib/modules/ai/provider.ts`). Switch providers via environment variables — no code changes needed.

**Supported providers:** Gemini (default), OpenAI, any OpenAI-compatible API.

## Getting Started

For a complete beginner-friendly setup guide, see [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (free tier)

### Quick Setup

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase and Gemini credentials

# 3. Generate Prisma client
npx prisma generate

# 4. Create database tables
npx prisma db push

# 5. (Optional) Seed demo data
npm run db:seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo Credentials

After seeding, log in with:
- **Email:** `bella@demo.opria.app`
- **Password:** `OpriaDemo2026!`

## Project Structure

```
src/
├── app/                    # Next.js pages & API routes
│   ├── (marketing)/        # Landing page
│   ├── (auth)/             # Login & register
│   ├── (dashboard)/        # Business, professional, admin dashboards
│   └── api/                # REST API route handlers
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives
│   └── layout/             # Sidebar, header
├── lib/                    # Server-side modules
│   ├── modules/            # Feature modules
│   │   ├── ai/             # AI provider + 7 agent modules
│   │   │   ├── provider.ts        # Provider abstraction (factory)
│   │   │   ├── adapters/          # Gemini + OpenAI adapters
│   │   │   ├── agents/            # 7 AI agent modules
│   │   │   └── provenance.ts      # Data provenance tracking
│   │   └── auth/           # Supabase auth helpers
│   ├── db/                 # Prisma client
│   ├── config/             # Environment validation
│   └── utils/              # Shared utilities
├── actions/                # Server Actions
├── hooks/                  # React hooks
└── stores/                 # Zustand stores
prisma/
├── schema.prisma           # Database schema (14 tables)
└── seed.ts                 # Demo data seeder
supabase/
└── rls.sql                 # Row Level Security policies
docs/
└── SUPABASE_SETUP.md       # Complete setup guide
```

## Architecture

- **Single Next.js app** — Route Handlers for API, Server Actions for mutations, RSC for data fetching
- **Modular AI agents** — 7 specialized agents with Zod-validated inputs/outputs
- **Provider abstraction** — Switch AI providers via env vars (Gemini, OpenAI, custom)
- **Provenance tracking** — Every AI field tagged as PROVIDED / INFERRED / RECOMMENDED
- **Hybrid matching** — 70% structured scoring + 30% AI semantic analysis
- **RLS security** — All tables protected by Row Level Security

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## Environment Variables

See `.env.example` for the full documented list. Key variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (SECRET) |
| `DATABASE_URL` | PostgreSQL connection (transaction pooler) |
| `DIRECT_URL` | PostgreSQL connection (session pooler, for migrations) |
| `AI_PROVIDER` | `gemini` \| `openai` \| `custom` |
| `AI_API_KEY` | Provider API key (SECRET) |
| `AI_MODEL` | Model name (e.g., `gemini-2.5-flash`) |

## Intellectual Property & Usage

**Copyright © 2026 GrowWeb IT Company / Ameer Hamza Arshad. All rights reserved.**

Opria and its original source code, software architecture, application design, documentation, branding, and original project materials are the proprietary intellectual property of **GrowWeb IT Company** and/or **Ameer Hamza Arshad** (the "Rights Holder").

This repository is publicly accessible for hackathon evaluation, review, and related authorized purposes. **Public visibility does not grant a license** to reproduce, modify, distribute, sublicense, sell, commercially exploit, or create derivative works from the proprietary Opria source code or project materials without prior written permission from the Rights Holder.

No open-source license (MIT, Apache, GPL, BSD, or otherwise) is granted to this software. This statement is a reservation of rights and is subordinate to any applicable written hackathon agreement or official rules; hackathon organizers and authorized evaluators may access and review the repository for the purposes of the hackathon, subject to those rules and agreements.

Third-party open-source libraries used by this project (Next.js, React, Prisma, Tailwind CSS, shadcn/ui, Supabase client libraries, Zod, AI provider SDKs, etc.) remain under their own respective licenses.

For licensing or permission inquiries, contact the Rights Holder via [github.com/growweb-pk](https://github.com/growweb-pk). See also the root-level [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE) files.
