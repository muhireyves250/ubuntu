"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessDashboardPath, dashboardPathForRole } from "@/lib/auth/role-routes";

export function RoleGuard({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isHydrated } = useAuth();

  const isAllowed = !!user && canAccessDashboardPath(user.role, path);

  useEffect(() => {
    if (isHydrated && user && !isAllowed) {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [isHydrated, user, isAllowed, router]);

  if (!isAllowed) return null;

  return <>{children}</>;
}
