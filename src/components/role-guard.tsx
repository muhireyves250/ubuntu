"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { dashboardPathForRole } from "@/lib/auth/role-routes";
import type { Role } from "@/lib/auth/types";

export function RoleGuard({
  roles,
  children,
}: {
  roles: Role[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isHydrated } = useAuth();

  const isAllowed = !!user && roles.includes(user.role);

  useEffect(() => {
    if (isHydrated && user && !isAllowed) {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [isHydrated, user, isAllowed, router]);

  if (!isAllowed) return null;

  return <>{children}</>;
}
