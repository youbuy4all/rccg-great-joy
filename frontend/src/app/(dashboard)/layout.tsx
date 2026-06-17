"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

const PAGE_TITLES: Record<string, string> = {
  "/":            "Dashboard",
  "/members":     "Members",
  "/departments": "Departments",
  "/attendance":  "Attendance",
  "/finance":     "Finance",
  "/returns":     "Returns",
  "/reports":     "Reports",
  "/messaging":   "Messaging",
  "/settings":    "Settings",
};

function getTitle(pathname: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (path === "/") { if (pathname === "/") return title; }
    else if (pathname === path || pathname.startsWith(path + "/")) return title;
  }
  return "Dashboard";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router     = useRouter();
  const pathname   = usePathname();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isLoggedIn) router.replace("/login");
  }, [mounted, isLoggedIn, router]);

  if (!mounted || !isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#145C14] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const toggle = () => setCollapsed(c => !c);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar title={getTitle(pathname)} onToggle={toggle} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}
