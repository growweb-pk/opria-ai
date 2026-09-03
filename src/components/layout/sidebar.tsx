"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/modules/auth/supabase-browser";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  BarChart3,
  Lightbulb,
  MessageSquare,
  FileText,
  Users,
  User,
  Briefcase,
  Brain,
  LogOut,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  role: "business" | "professional" | "admin";
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const businessNav: NavItem[] = [
  { href: "/business", label: "Overview", icon: LayoutDashboard },
  { href: "/business/profile", label: "Profile", icon: Building2 },
  { href: "/business/assessment", label: "Growth Assessment", icon: ClipboardCheck },
  { href: "/business/analysis", label: "Health Analysis", icon: BarChart3 },
  { href: "/business/opportunities", label: "Opportunities", icon: Lightbulb },
  { href: "/business/advisor", label: "AI Advisor", icon: MessageSquare },
  { href: "/business/requirements", label: "Requirements", icon: FileText },
  { href: "/business/recommendations", label: "Recommendations", icon: Users },
];

const professionalNav: NavItem[] = [
  { href: "/professional", label: "Overview", icon: LayoutDashboard },
  { href: "/professional/profile", label: "Profile", icon: User },
  { href: "/professional/opportunities", label: "Opportunities", icon: Briefcase },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/ai-monitor", label: "AI Monitor", icon: Brain },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems =
    role === "business"
      ? businessNav
      : role === "professional"
        ? professionalNav
        : adminNav;

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/" className="text-xl font-bold text-primary">
          Opria
        </Link>
        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary uppercase">
          {role}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/${role}` && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
