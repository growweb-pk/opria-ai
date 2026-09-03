"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Ban, CheckCircle2, Loader2 } from "lucide-react";

export interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  label: string | null;
}

const ROLE_TONE: Record<string, string> = {
  BUSINESS: "bg-primary/10 text-primary",
  PROFESSIONAL: "bg-emerald-50 text-emerald-700",
  ADMIN: "bg-amber-50 text-amber-700",
  ADVISOR: "bg-muted text-muted-foreground",
  VERIFICATION: "bg-muted text-muted-foreground",
};

export function UsersTable({
  users,
  currentAdminId,
}: {
  users: AdminUserRow[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState(users);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStatus(userId: string, status: "ACTIVE" | "SUSPENDED") {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not update user status");
      }

      setRows((prev) =>
        prev.map((row) => (row.id === userId ? { ...row, status } : row))
      );
      toast({
        title: status === "SUSPENDED" ? "User suspended" : "User reactivated",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Users ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const isSelf = row.id === currentAdminId;
                const suspended = row.status === "SUSPENDED";
                return (
                  <tr key={row.id}>
                    <td className="px-6 py-3">
                      <p className="font-medium text-foreground">{row.email}</p>
                      {row.label && (
                        <p className="text-xs text-muted-foreground">{row.label}</p>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase ${
                          ROLE_TONE[row.role] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {row.role}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          suspended ? "text-destructive" : "text-emerald-600"
                        }`}
                      >
                        {suspended ? (
                          <Ban className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {row.status}
                        {isSelf && (
                          <span className="text-muted-foreground">(you)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        variant={suspended ? "outline" : "destructive"}
                        size="sm"
                        disabled={isSelf || busyId === row.id}
                        onClick={() =>
                          setStatus(row.id, suspended ? "ACTIVE" : "SUSPENDED")
                        }
                        title={isSelf ? "You cannot change your own status" : undefined}
                      >
                        {busyId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : suspended ? (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        ) : (
                          <Ban className="h-4 w-4 mr-1" />
                        )}
                        {suspended ? "Reactivate" : "Suspend"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
