import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Lightbulb,
  Link2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { getOptionalAuth } from "@/lib/modules/auth/service";

const HOW_IT_WORKS = [
  {
    icon: BarChart3,
    step: "01",
    title: "Describe your business",
    desc: "Complete a short profile and growth assessment. Opria turns your answers into a structured picture of where you stand.",
  },
  {
    icon: Brain,
    step: "02",
    title: "Get an AI health analysis",
    desc: "Receive a health score across 8 dimensions with a full SWOT — every AI field tagged with its provenance.",
  },
  {
    icon: Lightbulb,
    step: "03",
    title: "Discover prioritized opportunities",
    desc: "Opria identifies growth opportunities ranked by impact and feasibility, then helps you refine them with an AI advisor.",
  },
  {
    icon: Link2,
    step: "04",
    title: "Match with the right professionals",
    desc: "Structured requirements are matched to verified professionals with transparent, explainable recommendations.",
  },
];

const FEATURES = [
  {
    icon: Brain,
    title: "Advisory before marketplace",
    desc: "Understand what you actually need before you spend a dollar on services.",
  },
  {
    icon: BarChart3,
    title: "8-dimension health score",
    desc: "Digital, operational, financial, market, technology, people, customer, and innovation.",
  },
  {
    icon: Target,
    title: "Prioritized opportunities",
    desc: "Growth moves ranked by impact and feasibility, tailored to your business.",
  },
  {
    icon: MessageSquare,
    title: "AI advisor chat",
    desc: "Refine ideas and turn conversations into structured, actionable requirements.",
  },
  {
    icon: Users,
    title: "Hybrid matching",
    desc: "70% structured scoring plus 30% AI semantic analysis for reliable fits.",
  },
  {
    icon: ShieldCheck,
    title: "Provenance you can trust",
    desc: "Every AI-generated field is tagged PROVIDED, INFERRED, or RECOMMENDED.",
  },
];

export default async function HomePage() {
  const user = await getOptionalAuth();

  if (user) {
    if (user.role === "BUSINESS") redirect("/business");
    if (user.role === "PROFESSIONAL") redirect("/professional");
    if (user.role === "ADMIN") redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Opria
            </span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            AI-Powered Business Growth Operating System
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Understand your business.
            <br />
            <span className="text-primary">Grow with confidence.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Opria analyzes your business, surfaces the growth opportunities that
            matter, and connects you with the right professionals — all before
            you commit to a single service.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Get Started — It&apos;s Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-8 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Sign In
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { value: "8", label: "Health dimensions analyzed" },
              { value: "70/30", label: "Structured + AI hybrid matching" },
              { value: "7", label: "Specialized AI capabilities" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5"
              >
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How Opria works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A guided path from raw business context to a confident, well-matched
            next step.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              className="relative rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <span className="text-sm font-bold text-primary/60">{item.step}</span>
              <item.icon className="mt-3 h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold text-card-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to decide
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Opria is the advisory layer in front of every business technology
              decision.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <feature.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-semibold text-card-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Ready to see your growth path?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Create a free account, describe your business, and get an AI-powered
          analysis in minutes.
        </p>
        <Link
          href="/register"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Get Started — It&apos;s Free
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="font-semibold text-foreground">Opria</span>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-Powered Business Growth Operating System.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign In
            </Link>
            <Link href="/register" className="transition-colors hover:text-foreground">
              Register
            </Link>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="mx-auto max-w-6xl px-6 py-4 text-center text-xs text-muted-foreground">
            © 2026 GrowWeb IT Company / Ameer Hamza Arshad — Opria. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
