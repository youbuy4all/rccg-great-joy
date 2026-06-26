"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import api from "@/lib/api";

// ─── Idle timeout settings ─────────────────────────────────────────────────────
const IDLE_WARN_MS   = 25 * 60 * 1000;  // Show warning at 25 minutes
const IDLE_LOGOUT_MS = 30 * 60 * 1000;  // Log out at 30 minutes
const ACTIVITY_EVENTS = ["mousemove","mousedown","keydown","scroll","touchstart","click"] as const;

// ─── Page titles ───────────────────────────────────────────────────────────────
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
  "/house-fellowship": "House Fellowship",
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.entries(PAGE_TITLES)
    .filter(([p]) => p !== "/" && pathname.startsWith(p + "/"))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return match ? match[1] : "Dashboard";
}

// ─── Idle warning modal ────────────────────────────────────────────────────────
function IdleWarningModal({ secondsLeft, onStay }: { secondsLeft: number; onStay: () => void }) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdown = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg mb-2">
          Session Expiring Soon
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          You have been inactive for 25 minutes.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          You will be logged out in{" "}
          <span className="font-bold text-orange-500 text-base">{countdown}</span>
        </p>
        <button
          onClick={onStay}
          className="w-full py-3 rounded-xl bg-[#145C14] text-white font-bold text-sm hover:bg-[#0A3D0A] transition"
        >
          Stay Logged In
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard layout ──────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router     = useRouter();
  const pathname   = usePathname();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const clearAuth  = useAuthStore(s => s.clearAuth);

  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [mounted,     setMounted]     = useState(false);

  // Idle state
  const [showWarning, setShowWarning] = useState(false);
  const [countdown,   setCountdown]   = useState(300); // 5 min countdown in seconds
  const warnTimerRef   = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef   = useRef<ReturnType<typeof setInterval>>();

  // ── Logout helper ──
  const doLogout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch { /* silent */ }
    clearAuth();
    router.replace("/login");
  }, [clearAuth, router]);

  // ── Reset idle timers on any user activity ──
  const resetIdle = useCallback(() => {
    // Clear existing timers
    clearTimeout(warnTimerRef.current);
    clearTimeout(logoutTimerRef.current);
    clearInterval(countdownRef.current);
    setShowWarning(false);
    setCountdown(300);

    // Restart: warn at 25 min
    warnTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(300);

      // Tick the countdown every second
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(countdownRef.current); return 0; }
          return c - 1;
        });
      }, 1000);
    }, IDLE_WARN_MS);

    // Logout at 30 min
    logoutTimerRef.current = setTimeout(() => {
      doLogout();
    }, IDLE_LOGOUT_MS);
  }, [doLogout]);

  // ── Wire up activity listeners ──
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isLoggedIn) return;

    resetIdle();

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetIdle));
      clearTimeout(warnTimerRef.current);
      clearTimeout(logoutTimerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [mounted, isLoggedIn, resetIdle]);

  // ── Auth guard ──
  useEffect(() => {
    if (mounted && !isLoggedIn) router.replace("/login");
  }, [mounted, isLoggedIn, router]);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (!mounted || !isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#145C14] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleToggle = () => {
    if (window.innerWidth < 768) { setMobileOpen(o => !o); }
    else                         { setCollapsed(c => !c); }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
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

      {showWarning && (
        <IdleWarningModal secondsLeft={countdown} onStay={resetIdle} />
      )}
    </div>
  );
}
