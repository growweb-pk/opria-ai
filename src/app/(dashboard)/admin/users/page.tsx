import { requireAuth } from "@/lib/modules/auth/service";
import { getAdminUsers, type AdminUser } from "@/lib/modules/admin/service";
import { UsersTable, type AdminUserRow } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const user = await requireAuth(["ADMIN"]);
  const users = await getAdminUsers();

  const rows: AdminUserRow[] = users.map(mapUser);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="mt-1 text-muted-foreground">
          View roles and statuses. Suspend or reactivate accounts as needed.
        </p>
      </div>
      <UsersTable users={rows} currentAdminId={user.id} />
    </div>
  );
}

function mapUser(u: AdminUser): AdminUserRow {
  const label = u.business?.companyName
    ? u.business.companyName
    : u.professional
      ? `${u.professional.name}${u.professional.title ? ` — ${u.professional.title}` : ""}`
      : null;

  return {
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
    label,
  };
}
