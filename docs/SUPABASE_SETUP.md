# Supabase Setup Guide for Opria

Complete beginner-friendly guide to setting up Supabase for the Opria project.

---

## Table of Contents

1. [Creating a Supabase Project](#1-creating-a-supabase-project)
2. [Getting Your Credentials](#2-getting-your-credentials)
3. [Configuring Environment Variables](#3-configuring-environment-variables)
4. [Database Setup](#4-database-setup)
5. [Row Level Security (RLS)](#5-row-level-security-rls)
6. [Authentication Configuration](#6-authentication-configuration)
7. [Seeding Demo Data](#7-seeding-demo-data)
8. [Testing the Setup](#8-testing-the-setup)
9. [Development Workflow](#9-development-workflow)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Creating a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in with GitHub (recommended) or create an account
3. Click **"New Project"**
4. Fill in the form:
   - **Organization**: Select your personal org or create a new one
   - **Project Name**: `Opria` (or any name you prefer)
   - **Database Password**: Create a strong password — **save it somewhere safe** (e.g., password manager). You'll need it for the connection string.
   - **Region**: Choose the region closest to you (e.g., US East, EU West, Southeast Asia)
   - **Pricing Plan**: Free tier is fine for development/hackathon
5. Click **"Create new project"**
6. Wait 2-3 minutes for the project to initialize

---

## 2. Getting Your Credentials

Once the project is ready, you need **4 credentials**:

### A. Project URL

1. In your Supabase dashboard, go to **Settings** (gear icon in left sidebar)
2. Click **API**
3. Under **"Project URL"**, copy the URL that looks like: `https://abcdefgh.supabase.co`
4. This goes in `NEXT_PUBLIC_SUPABASE_URL`

### B. Anonymous (anon) Public Key

1. Same page (Settings → API)
2. Under **"Project API keys"**, copy the **`anon` `public`** key
3. This is a long string starting with `eyJ...`
4. This goes in `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### C. Service Role Key (SECRET)

1. Same page (Settings → API)
2. Under **"Project API keys"**, copy the **`service_role` `secret`** key
3. **⚠️ This key bypasses Row Level Security. Never expose it to the browser.**
4. This goes in `SUPABASE_SERVICE_ROLE_KEY`

### D. Database Connection Strings

1. Go to **Settings** → **Database**
2. Scroll to **"Connection string"**
3. You'll see tabs: **Direct**, **Session**, **Transaction**
4. For Opria:
   - **DATABASE_URL** (runtime): Select **"Transaction"** tab → Copy the connection string. It looks like:
     ```
     postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
     ```
     Replace `[YOUR-PASSWORD]` with the database password you created in step 1.
   - **DIRECT_URL** (for migrations): Select **"Session"** tab → Copy the connection string. It looks like:
     ```
     postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
     ```
     Replace `[YOUR-PASSWORD]` with your database password.

**Why two different URLs?**
- **Transaction pooler** (port 6543): Best for serverless (Vercel). Efficient connection sharing for the running app.
- **Session pooler** (port 5432): Needed for Prisma CLI commands (`db push`, `migrate`) which require DDL operations that don't work well with transaction pooling.
- **Direct connection** (db.*.supabase.co): Can cause IPv6 issues on some networks. Session pooler is more reliable for most users.

---

## 3. Configuring Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

Then open `.env.local` and fill in:

```env
# PUBLIC — safe for browser
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# SERVER-ONLY — never expose
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...

# DATABASE
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# AI PROVIDER (Gemini)
AI_PROVIDER=gemini
AI_API_KEY=your-gemini-api-key
AI_MODEL=gemini-2.5-flash
AI_MAX_TOKENS=4096
```

### Getting a Gemini API Key

1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click **"Create API key"**
3. Select a Google Cloud project (or create one)
4. Copy the API key
5. Paste it into `AI_API_KEY` in `.env.local`

---

## 4. Database Setup

### Install Dependencies (if not done)

```bash
npm install --legacy-peer-deps
```

### Generate Prisma Client

```bash
npx prisma generate
```

This reads `prisma/schema.prisma` and generates TypeScript types. Run this after any schema change.

### Push Schema to Database

```bash
npx prisma db push
```

**This creates all tables in your Supabase database.** No manual SQL needed. Prisma handles everything:
- Creates all 14 tables (users, business_profiles, professional_profiles, assessments, etc.)
- Creates all enums (Role, CompanySize, Priority, etc.)
- Sets up foreign keys and indexes
- Safe to run multiple times (idempotent)

**⚠️ IMPORTANT**: This command uses the `DIRECT_URL` from your `.env.local`.

### Verify Tables Were Created

```bash
npx prisma studio
```

This opens a visual database browser at `http://localhost:5555`. You should see all 14 tables.

### Do I Need SQL Scripts?

**No.** Prisma creates all tables automatically. You do NOT need to:
- Manually write CREATE TABLE statements
- Use the Supabase SQL Editor for schema setup
- Run any migration SQL files

The only SQL you might want to run manually is the RLS policy script (next section).

---

## 5. Row Level Security (RLS)

### Why RLS Matters

Supabase auto-generates a REST API for your database tables. Without RLS, **anyone with your public anon key could read and write ALL your tables** through this API. Since the anon key is in your frontend code (it has to be — Supabase client needs it), this is a real security risk.

### How RLS Works for Opria

Our app uses **Prisma** (server-side) for all database access. Prisma connects as the `postgres` role (table owner), which **bypasses RLS by default**. So enabling RLS doesn't affect our app.

The RLS script enables RLS on all 14 tables with NO policies. This means:
- ✅ Prisma (our app) → full access
- ✅ Supabase service_role → full access
- ❌ Supabase anon role → no access (REST API blocked)
- ❌ Supabase authenticated role → no access (REST API blocked)

### Running the RLS Script

1. Go to your Supabase Dashboard → **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase/rls.sql` from this project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)

### Verify RLS is Enabled

Run this query in the SQL Editor:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

---

## 6. Authentication Configuration

### Email/Password Authentication

Supabase Auth comes with email/password enabled by default. No additional setup needed.

### Disable Email Confirmation (Development Only)

For hackathon testing, disable email confirmation so you can log in immediately after registering:

1. Go to **Authentication** → **Providers** (left sidebar)
2. Click **Email** (under "Authentication Providers")
3. Toggle **"Confirm email"** to **OFF**
4. Click **"Save"**

**⚠️ This is a development-only setting.** In production, keep email confirmation ON.

### Site URL

1. Go to **Authentication** → **URL Configuration**
2. Under **"Site URL"**, set: `http://localhost:3000`
3. Under **"Redirect URLs"**, add: `http://localhost:3000/**`

---

## 7. Seeding Demo Data

### Run the Seed Script

```bash
npm run db:seed
```

This creates:
- **7 users**: Bella (business owner) + 6 professionals
- **1 business profile**: Bella's Boutique
- **1 assessment**: 12 questions with realistic answers
- **1 business analysis**: Health scores, SWOT, findings
- **5 opportunities**: Prioritized growth opportunities
- **6 professional profiles**: Realistic freelancer profiles
- **1 conversation**: 12-message advisor chat
- **1 requirement**: Structured project document
- **6 match results**: Ranked professional recommendations

### Demo Login Credentials

If Supabase is configured correctly:

```
Email:    bella@demo.opria.app
Password: OpriaDemo2026!
```

All demo users share the same password. Professional emails:
- `alex.chen@demo.opria.app`
- `maria.santos@demo.opria.app`
- `james.wright@demo.opria.app`
- `priya.patel@demo.opria.app`
- `david.kim@demo.opria.app`
- `sarah.johnson@demo.opria.app`

### If Seed Fails

If you see Supabase auth errors, the seed still creates data with placeholder IDs. The data structure is complete, but demo users cannot log in. Fix Supabase credentials and re-run:

```bash
npx prisma db push --force-reset
npm run db:seed
```

**⚠️ `--force-reset` DELETES ALL DATA.** Only use in development.

---

## 8. Testing the Setup

### Step-by-Step Verification

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open http://localhost:3000** — You should see the Opria landing page.

3. **Test Registration:**
   - Click "Get Started" or go to `/register`
   - Fill in email and password
   - Select "Business Owner" role
   - Submit — you should be redirected to `/business`

4. **Test Login:**
   - Go to `/login`
   - Enter the credentials you just used
   - Submit — you should reach the dashboard

5. **Test Demo Login (if seeded):**
   - Go to `/login`
   - Email: `bella@demo.opria.app`
   - Password: `OpriaDemo2026!`
   - You should see the business dashboard with Bella's Boutique data

6. **Verify Database:**
   ```bash
   npx prisma studio
   ```
   Check that tables have data.

7. **Test AI (if Gemini key configured):**
   - AI features will be available in Phase 1
   - The provider abstraction is set up and ready

### What's Tested vs What's Not

| Feature | Status |
|---|---|
| Dev server starts | TESTED (build verified) |
| TypeScript compilation | TESTED |
| ESLint | TESTED |
| Production build | TESTED |
| Prisma schema validation | TESTED |
| Prisma client generation | TESTED |
| Registration flow | REQUIRES SUPABASE CREDENTIALS |
| Login/logout | REQUIRES SUPABASE CREDENTIALS |
| Database persistence | REQUIRES SUPABASE CREDENTIALS |
| AI calls (Gemini) | REQUIRES GEMINI API KEY |
| Demo mode | REQUIRES SEEDED DATA + CREDENTIALS |

---

## 9. Development Workflow

### Daily Development

```bash
# Start working
npm run dev

# After schema changes
npx prisma generate
npx prisma db push

# View database
npx prisma studio
```

### After Schema Changes

1. Edit `prisma/schema.prisma`
2. Run `npx prisma generate` (regenerates TypeScript types)
3. Run `npx prisma db push` (updates database tables)
4. Continue working — no restart needed for most changes

### Resetting the Database

**⚠️ THIS DELETES ALL DATA. Only use in development.**

```bash
# 1. Wipe all tables
npx prisma db push --force-reset

# 2. Recreate tables
npx prisma db push

# 3. Re-seed demo data
npm run db:seed
```

---

## 10. Troubleshooting

### "Connection refused" or timeout on `prisma db push`

- **Cause**: IPv6 issues with direct database connection
- **Fix**: Make sure `DIRECT_URL` uses the **Session pooler** (port 5432), not the direct connection (`db.*.supabase.co`)

### "Authentication failed" on `prisma db push`

- **Cause**: Wrong password in connection string
- **Fix**: Double-check the password in both `DATABASE_URL` and `DIRECT_URL`. Remember to URL-encode special characters in passwords.

### Prisma Client not found

- **Cause**: Prisma Client not generated
- **Fix**: Run `npx prisma generate`

### "Module not found" errors

- **Cause**: Dependencies not installed
- **Fix**: `npm install --legacy-peer-deps`

### Registration creates auth user but no profile

- **Cause**: Network failure between auth signup and profile creation, or API route error
- **Fix**: The create-profile route is idempotent — try logging in again. If the auth user exists but no profile, a new registration attempt should create the profile.

### Demo seed users can't log in

- **Cause**: Supabase credentials not configured (placeholder values)
- **Fix**: Set real Supabase credentials in `.env.local`, then:
  ```bash
  npx prisma db push --force-reset
  npm run db:seed
  ```

### Gemini API returns 429 (rate limit)

- **Cause**: Free tier rate limits
- **Fix**: Wait and retry. The adapter handles rate limits with error messages. Reduce AI call frequency during development.
