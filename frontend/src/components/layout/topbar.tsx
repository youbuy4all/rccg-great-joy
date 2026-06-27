"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, Sun, Moon, Printer, X, Loader2, Users, Receipt, FileText } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/context/theme";
import api from "@/lib/api";
import { useState, useRef, useEffect, useCallback } from "react";
import { formatCurrency, formatCategory } from "@/lib/utils";
import { ImportExportButton } from "@/components/ImportExport";
import { BirthdayNotifications } from "@/components/BirthdayNotifications";

// ─── Page Import/Export Config ─────────────────────────────────────────────────
import type { PageImportExportConfig } from "@/components/ImportExport";

const PAGE_CONFIG: Record<string, PageImportExportConfig> = {
  "/members": {
    label: "Members",
    getData: async () => { const r = await api.get("/members?limit=5000"); return r.data.data; },
    importConfig: {
      endpoint: "/members/bulk",
      columns: [
        { key: "firstName",    label: "First Name",                  required: true },
        { key: "lastName",     label: "Last Name",                   required: true },
        { key: "phone",        label: "Phone (10+ digits)",          required: true },
        { key: "gender",       label: "Gender",                      required: true,  hint: "MALE or FEMALE" },
        { key: "email",        label: "Email",                       required: false },
        { key: "status",       label: "Status",                      required: false, hint: "ACTIVE, INACTIVE, VISITOR" },
        { key: "workerStatus", label: "Worker Status",               required: false, hint: "WORKER or NON_WORKER" },
        { key: "address",      label: "Address",                     required: false },
        { key: "dateOfBirth",  label: "Date of Birth (YYYY-MM-DD)", required: false },
        { key: "zone",         label: "Zone",                        required: false },
        { key: "area",         label: "Area",                        required: false },
        { key: "notes",        label: "Notes",                       required: false },
      ],
      templateRow: { firstName:"John", lastName:"Doe", phone:"08012345678", gender:"MALE", email:"john@example.com", status:"ACTIVE", workerStatus:"WORKER", address:"123 Church Street, Port Harcourt", dateOfBirth:"1990-01-15", zone:"Zone A" },
    },
  },
  "/finance": {
    label: "Transactions",
    getData: async () => { const r = await api.get("/finance/transactions?limit=5000"); return r.data.data; },
    importConfig: {
      endpoint: "/finance/transactions/bulk",
      columns: [
        { key: "type",             label: "Type",                        required: true,  hint: "INCOME or EXPENSE" },
        { key: "incomeCategory",   label: "Income Category",             required: false, hint: "TITHE, THANKSGIVING, SUNDAY_LOVE_OFFERING, CRM_OFFERING, GOSPEL_FUND, FIRST_FRUIT, FIRST_BORN_REDEMPTION" },
        { key: "expenseCategory",  label: "Expense Category",            required: false, hint: "UTILITIES, STATIONERY, WELFARE, MAINTENANCE" },
        { key: "amount",           label: "Amount (₦)",                  required: true },
        { key: "description",      label: "Description",                 required: true },
        { key: "paymentMethod",    label: "Payment Method",              required: true,  hint: "CASH, TRANSFER, CHEQUE" },
        { key: "transactionDate",  label: "Date (YYYY-MM-DD)",           required: true },
      ],
      templateRow: { type:"INCOME", incomeCategory:"THANKSGIVING", expenseCategory:"", amount:"5000", description:"Sunday thanksgiving offering", paymentMethod:"CASH", transactionDate:"2024-03-10" },
    },
  },
  "/attendance": {
    label: "Attendance",
    getData: async () => { const r = await api.get("/attendance/sessions?limit=5000"); return r.data.data; },
    importConfig: {
      endpoint: "/attendance/sessions/bulk",
      columns: [
        { key: "serviceDate",          label: "Service Date (YYYY-MM-DD)", required: true },
        { key: "serviceType",          label: "Service Type",              required: true,  hint: "SUNDAY_SERVICE, TUESDAY_SERVICE, THURSDAY_SERVICE, SPECIAL_SERVICE" },
        { key: "preacher",             label: "Preacher",                  required: false },
        { key: "menCount",             label: "Men Count",                 required: false },
        { key: "womenCount",           label: "Women Count",               required: false },
        { key: "childrenCount",        label: "Children Count",            required: false },
        { key: "sundaySchoolCount",    label: "Sunday School Count",       required: false },
        { key: "houseFellowshipCount", label: "House Fellowship Count",    required: false },
      ],
      templateRow: { serviceDate:"2024-03-10", serviceType:"SUNDAY_SERVICE", preacher:"Pastor John", menCount:"20", womenCount:"35", childrenCount:"15", sundaySchoolCount:"12", houseFellowshipCount:"8" },
    },
  },
  "/house-fellowship": {
    label: "House Fellowship",
    getData: async () => { const r = await api.get("/house-fellowship"); return r.data; },
  },
  "/departments": {
    label: "Departments",
    getData: async () => { const r = await api.get("/departments"); return r.data; },
  },
  "/returns": {
    label: "Returns",
    getData: async () => { const r = await api.get("/returns"); return r.data; },
  },
  "/reports": {
    label: "Members Report",
    getData: async () => { const r = await api.get("/members?limit=5000"); return r.data.data; },
  },
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

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Global Search ─────────────────────────────────────────────────────────────
interface SearchResults {
  members:      any[];
  transactions: any[];
  returns:      any[];
}

function GlobalSearch() {
  const router = useRouter();
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    try {
      const r = await api.get(`/search?q=${encodeURIComponent(q)}`);
      setResults(r.data);
      setOpen(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  const go = (href: string) => { setOpen(false); setQuery(""); setResults(null); router.push(href); };

  const hasResults = results && (results.members.length + results.transactions.length + results.returns.length) > 0;

  return (
    <div ref={wrapRef} className="relative hidden md:block w-56">
      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2">
        {loading ? <Loader2 size={13} className="text-gray-400 flex-shrink-0 animate-spin" /> : <Search size={13} className="text-gray-400 flex-shrink-0" />}
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => results && setOpen(true)}
          placeholder="Search anything…"
          className="bg-transparent outline-none text-sm text-gray-700 dark:text-gray-300 font-medium placeholder-gray-400 dark:placeholder-gray-500 w-full"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults(null); setOpen(false); }}>
            <X size={12} className="text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden">
          {!hasResults ? (
            <div className="py-8 text-center text-sm text-gray-400">No results for "{query}"</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">

              {/* Members */}
              {results!.members.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <Users size={11} className="text-gray-400" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Members</p>
                  </div>
                  {results!.members.map((m: any) => (
                    <button key={m.id} onClick={() => go(`/members/${m.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                      <div className="w-7 h-7 rounded-full bg-[#145C14]/10 flex items-center justify-center text-[#145C14] font-bold text-[10px] flex-shrink-0">
                        {m.firstName[0]}{m.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{m.firstName} {m.lastName}</p>
                        <p className="text-[10px] text-gray-400">{m.memberId} · {m.phone}</p>
                      </div>
                      <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {m.ageGroup !== "ADULT" ? m.ageGroup : m.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Transactions */}
              {results!.transactions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1 border-t border-gray-100 dark:border-gray-700">
                    <Receipt size={11} className="text-gray-400" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Transactions</p>
                  </div>
                  {results!.transactions.map((tx: any) => (
                    <button key={tx.id} onClick={() => go(`/finance`)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white font-mono">{tx.reference}</p>
                        <p className="text-[10px] text-gray-400 truncate">{formatCategory(tx.incomeCategory || tx.expenseCategory || "")}</p>
                      </div>
                      <span className={`text-xs font-bold flex-shrink-0 ${tx.type === "INCOME" ? "text-green-600" : "text-red-500"}`}>
                        {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Returns */}
              {results!.returns.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1 border-t border-gray-100 dark:border-gray-700">
                    <FileText size={11} className="text-gray-400" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Monthly Returns</p>
                  </div>
                  {results!.returns.map((r: any) => (
                    <button key={r.id} onClick={() => go(`/returns`)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{MONTHS[r.month - 1]} {r.year}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{formatCurrency(r.totalRemittance)}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${r.status === "SUBMITTED" ? "bg-blue-100 text-blue-700" : r.status === "ACKNOWLEDGED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{r.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <button onClick={() => go(`/members?search=${encodeURIComponent(query)}`)}
                  className="text-[11px] font-bold text-[#145C14] hover:underline">
                  See all member results for "{query}" →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TopBar ────────────────────────────────────────────────────────────────────
interface TopBarProps { title: string; onToggle: () => void; }

export function TopBar({ title, onToggle }: TopBarProps) {
  const user     = useAuthStore(s => s.user);
  const { isDark, toggle } = useTheme();
  const pathname = usePathname();

  const pageKey    = Object.keys(PAGE_CONFIG).find(k => pathname === k || pathname.startsWith(k + "/"));
  const pageConfig = pageKey ? PAGE_CONFIG[pageKey] : null;

  return (
    <header className="no-print h-16 bg-white dark:bg-gray-800 border-b border-green-100 flex items-center gap-3 px-5 flex-shrink-0 shadow-sm">
      <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 transition p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
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

      <GlobalSearch />

      <div className="flex items-center gap-1.5">
        {pageConfig && <ImportExportButton config={pageConfig} />}
        <BirthdayNotifications />
        <button onClick={() => window.print()} title="Print this page"
          className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-green-50 hover:text-primary hover:border-green-200 transition">
          <Printer size={15} />
        </button>
        <button onClick={toggle} title={isDark ? "Light Mode" : "Dark Mode"}
          className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-green-50 hover:text-primary hover:border-green-200 transition">
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

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
