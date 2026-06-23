"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, Search, Sun, Moon, Printer, Download } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/context/theme";
import api from "@/lib/api";

function downloadCSV(data: any[], filename: string) {
  if (!data?.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val).includes(",") ? `"${val}"` : val;
    }).join(",")
  );
  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `rccg-${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const EXPORT_CONFIG: Record<string, { label: string; fn: () => Promise<void> }> = {
  "/members":     { label: "Members",      fn: async () => { const r = await api.get("/members?limit=1000"); downloadCSV(r.data.data, "members"); } },
  "/finance":     { label: "Transactions", fn: async () => { const r = await api.get("/finance/transactions?limit=1000"); downloadCSV(r.data.data, "transactions"); } },
  "/attendance":  { label: "Attendance",   fn: async () => { const r = await api.get("/attendance/sessions?limit=1000"); downloadCSV(r.data.data, "attendance"); } },
  "/departments": { label: "Departments",  fn: async () => { const r = await api.get("/departments"); downloadCSV(r.data, "departments"); } },
  "/returns":     { label: "Returns",      fn: async () => { const r = await api.get("/returns"); downloadCSV(r.data, "returns"); } },
};

const ROLE_COLORS: Record<string, string> = {
  PASTOR:      "bg-purple-100 text-purple-700",
  TREASURER:   "bg-yellow-100 text-yellow-700",
  SECRETARY:   "bg-blue-100 text-blue-700",
  HOD:         "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  AUDITOR:     "bg-orange-100 text-orange-700",
  WORKER:      "bg-gray-100 text-gray-600",
  MEMBER:      "bg-gray-100 text-gray-600",
  SUPER_ADMIN: "bg-red-100 text-red-700",
};

interface TopBarProps { title: string; onToggle: () => void; }

export function TopBar({ title, onToggle }: TopBarProps) {
  const user     = useAuthStore(s => s.user);
  const { isDark, toggle } = useTheme();
  const pathname = usePathname();

  const exportKey    = Object.keys(EXPORT_CONFIG).find(k => pathname === k || pathname.startsWith(k + "/"));
  const exportConfig = exportKey ? EXPORT_CONFIG[exportKey] : null;

  const handleExport = async () => {
    if (!exportConfig) return;
    try { await exportConfig.fn(); } catch { alert("Export failed."); }
  };

  return (
    <header className="no-print h-16 bg-white dark:bg-gray-800 border-b border-green-100 flex items-center gap-3 px-5 flex-shrink-0 shadow-sm">
      <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 transition p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <img src="/logo.png" alt="RCCG" className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div className="min-w-0">
          <h1 className="font-serif font-bold text-gray-900 dark:text-white text-[17px] leading-tight truncate">{title}</h1>
          <p className="text-gray-400 text-[11px] font-semibold">RCCG Great Joy Parish · Rivers Province 12</p>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2 w-48">
        <Search size={13} className="text-gray-400 flex-shrink-0" />
        <input placeholder="Search…" className="bg-transparent outline-none text-sm text-gray-700 dark:text-gray-300 font-medium placeholder-gray-400 dark:placeholder-gray-500 w-full" />
      </div>

      {/* ── Global Action Bar ── */}
      <div className="flex items-center gap-1.5">
        {exportConfig && (
          <button onClick={handleExport} title={`Export ${exportConfig.label} as CSV`}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-green-50 hover:text-primary hover:border-green-200 transition">
            <Download size={14} /> Export
          </button>
        )}
        <button onClick={() => window.print()} title="Print this page"
          className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-green-50 hover:text-primary hover:border-green-200 transition">
          <Printer size={15} />
        </button>
        <button onClick={toggle} title={isDark ? "Light Mode" : "Dark Mode"}
          className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-green-50 hover:text-primary hover:border-green-200 transition">
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <div className="relative">
          <button className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-green-50 hover:border-green-200 transition">
            <Bell size={15} />
          </button>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">3</span>
        </div>
      </div>

      {user?.role && (
        <span className={`hidden sm:block text-[10px] font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-600"}`}>
          {user.role}
        </span>
      )}

      <div className="hidden lg:block bg-green-50 text-primary text-[11px] font-bold px-3 py-1.5 rounded-full border border-green-200 whitespace-nowrap">
        {new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
      </div>
    </header>
  );
}
