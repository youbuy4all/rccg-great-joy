"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { ThemeProvider } from "@/context/theme";
import { useAuthStore } from "@/store/auth";
import { canAccess } from "@/lib/permissions";
import type { Role } from "@/types";

const PAGE_TITLES: Record<string, string> = {
  "/":            "Dashboard",
  "/members":     "Members",
  "/departments": "Departments",
  "/attendance":  "Attendance",
  "/finance":     "Finance",
  "/returns":     "Monthly Returns",
  "/reports":     "Reports",
  "/messaging":   "Messaging",
  "/settings":    "Settings",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router     = useRouter();
  const pathname   = usePathname();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const user       = useAuthStore(s => s.user);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    // RBAC route guard
    if (user?.role && !canAccess(user.role as Role, pathname)) {
      router.replace("/unauthorized");
    }
  }, [isLoggedIn, user, pathname, router]);

  if (!isLoggedIn || !user) return null;

  const base  = "/" + pathname.split("/")[1];
  const title = PAGE_TITLES[base] || PAGE_TITLES[pathname] || "Dashboard";

  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--bg)" }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar title={title} onToggle={() => setCollapsed(v => !v)} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
