import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/modules/auth/service";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // Determine sidebar based on role
  const sidebarRole =
    user.role === "PROFESSIONAL"
      ? "professional"
      : user.role === "ADMIN"
        ? "admin"
        : "business";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={sidebarRole} />
      <main className="flex-1 overflow-y-auto bg-background p-6">
        {children}
      </main>
    </div>
  );
}
