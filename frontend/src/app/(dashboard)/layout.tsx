"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

const PAGE_TITLES: Record<string, string> = {
  "/":               "Dashboard",
  "/members":        "Members",
  "/departments":    "Departments",
  "/attendance":     "Attendance",
  "/finance":        "Finance",
  "/returns":        "Returns",
  "/reports":        "Reports",
  "/messaging":      "Messaging",
  "/settings":       "Settings",
  "/settings/users": "User Management",
};

function getTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Prefix match (longest wins)
  const match = Object.entries(PAGE_TITLES)
    .filter(([p]) => p !== "/" && pathname.startsWith(p + "/"))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return match ? match[1] : "Dashboard";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router     = useRouter();
  const pathname   = usePathname();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  // Desktop: whether the sidebar is collapsed to icon-only
  const [collapsed,   setCollapsed]   = useState(false);
  // Mobile: whether the sidebar overlay is open
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [mounted,     setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isLoggedIn) router.replace("/login");
  }, [mounted, isLoggedIn, router]);

  // Close mobile sidebar whenever the route changes
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (!mounted || !isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#145C14] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Hamburger click: open mobile overlay on small screens, toggle collapse on desktop
  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setMobileOpen(o => !o);
    } else {
      setCollapsed(c => !c);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Mobile backdrop — shown behind the sidebar overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={handleToggle}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar title={getTitle(pathname)} onToggle={handleToggle} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}
