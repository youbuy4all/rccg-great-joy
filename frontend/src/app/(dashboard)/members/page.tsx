"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, UserPlus, Loader2, ChevronLeft, ChevronRight, Users, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { AddMemberModal } from "@/components/members/AddMemberModal";
import type { Member, MemberStats, Paginated } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:          "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  INACTIVE:        "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-400",
  VISITOR:         "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  NEW_CONVERT:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  TRANSFERRED_IN:  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  TRANSFERRED_OUT: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

const AGE_COLORS: Record<string, string> = {
  ADULT:    "",
  YOUTH:    "bg-teal-100 text-teal-700",
  TEENAGER: "bg-cyan-100 text-cyan-700",
  CHILD:    "bg-lime-100 text-lime-700",
  TODDLER:  "bg-pink-100 text-pink-700",
};

const WORKER_COLORS: Record<string, string> = {
  WORKER_IN_TRAINING: "bg-sky-100 text-sky-700",
  WORKER:             "bg-indigo-100 text-indigo-700",
  MINISTER:           "bg-rose-100 text-rose-700",
  DEPARTMENT_HEAD:    "bg-orange-100 text-orange-700",
  PASTOR:             "bg-purple-100 text-purple-700",
};

// ─── Clickable KPI pill ────────────────────────────────────────────────────────
function StatPill({ label, value, sub, active, onClick }: {
  label: string; value: number; sub?: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={cn(
      "text-left bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-2xl border shadow-sm px-5 py-4 transition-all hover:shadow-md",
      active ? "border-[#145C14] ring-2 ring-[#145C14]/20" : "border-gray-100 dark:border-gray-700 dark:border-gray-700 hover:border-gray-200 dark:border-gray-600"
    )}>
      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </button>
  );
}

// Active "view" derived from current filters — used to highlight the matching KPI pill
type ViewKey = "all" | "active" | "workers" | "new";

function MembersPageContent() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState("");
  const [status,       setStatus]       = useState("");
  const [workerStatus, setWorkerStatus] = useState("");
  const [newThisMonth, setNewThisMonth] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [hfId,         setHfId]         = useState("");
  const [showAdd,      setShowAdd]      = useState(false);
  const [hydrated,     setHydrated]     = useState(false);

  // ── Hydrate filters from URL on mount (enables deep-linking from Dashboard, Department, HF pages) ──
  useEffect(() => {
    setStatus(searchParams.get("status") || "");
    setWorkerStatus(searchParams.get("workerStatus") || "");
    setNewThisMonth(searchParams.get("newThisMonth") === "true");
    setDepartmentId(searchParams.get("departmentId") || "");
    setHfId(searchParams.get("houseFellowshipId") || "");
    setSearch(searchParams.get("search") || "");
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Push filter state back to URL whenever it changes (so the view is shareable) ──
  useEffect(() => {
    if (!hydrated) return;
    const p = new URLSearchParams();
    if (search)       p.set("search", search);
    if (status)       p.set("status", status);
    if (workerStatus) p.set("workerStatus", workerStatus);
    if (newThisMonth) p.set("newThisMonth", "true");
    if (departmentId) p.set("departmentId", departmentId);
    if (hfId)         p.set("houseFellowshipId", hfId);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, workerStatus, newThisMonth, departmentId, hfId, hydrated]);

  const { data: stats } = useQuery<MemberStats>({
    queryKey: ["member-stats"],
    queryFn:  () => api.get("/members/stats").then(r => r.data),
  });

  const { data, isLoading, isFetching } = useQuery<Paginated<Member>>({
    queryKey: ["members", page, search, status, workerStatus, newThisMonth, departmentId, hfId],
    queryFn:  () => {
      const p = new URLSearchParams({ page: String(page), limit: "20" });
      if (search)       p.set("search",            search);
      if (status)       p.set("status",             status);
      if (workerStatus) p.set("workerStatus",       workerStatus);
      if (newThisMonth) p.set("newThisMonth",       "true");
      if (departmentId) p.set("departmentId",       departmentId);
      if (hfId)         p.set("houseFellowshipId",  hfId);
      return api.get(`/members?${p}`).then(r => r.data);
    },
    placeholderData: prev => prev,
    enabled: hydrated,
  });

  const members    = data?.data ?? [];
  const pagination = data?.pagination;

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  // Determine which KPI pill is "active" based on current filter combination
  const activeView: ViewKey =
    newThisMonth                       ? "new"
    : workerStatus === "ANY"           ? "workers"
    : status === "ACTIVE" && !workerStatus ? "active"
    : "all";

  const selectView = (view: ViewKey) => {
    setPage(1);
    setDepartmentId(""); setHfId("");
    if (view === "all")     { setStatus(""); setWorkerStatus(""); setNewThisMonth(false); }
    if (view === "active")  { setStatus("ACTIVE"); setWorkerStatus(""); setNewThisMonth(false); }
    if (view === "workers") { setStatus(""); setWorkerStatus("ANY"); setNewThisMonth(false); }
    if (view === "new")     { setStatus(""); setWorkerStatus(""); setNewThisMonth(true); }
  };

  const clearCrossFilter = () => { setDepartmentId(""); setHfId(""); setPage(1); };

  const sel = "px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-800 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#145C14]";

  return (
    <div className="space-y-5">
      {/* Stats — each one is a clickable filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatPill label="Total Members"  value={stats?.total        ?? 0} sub={`${stats?.men ?? 0} men · ${stats?.women ?? 0} women`} active={activeView==="all"}     onClick={() => selectView("all")} />
        <StatPill label="Active"         value={stats?.active       ?? 0}                                                              active={activeView==="active"}  onClick={() => selectView("active")} />
        <StatPill label="Workers"        value={stats?.workers      ?? 0}                                                              active={activeView==="workers"} onClick={() => selectView("workers")} />
        <StatPill label="New This Month" value={stats?.newThisMonth ?? 0} sub={`${stats?.baptised ?? 0} baptised`}                      active={activeView==="new"}     onClick={() => selectView("new")} />
      </div>

      {/* Cross-module filter banner (when arriving from Department/HF deep link) */}
      {(departmentId || hfId) && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <p className="text-sm text-blue-700 font-medium">
            Showing members filtered by {departmentId ? "department" : "house fellowship"}
          </p>
          <button onClick={clearCrossFilter} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition">
            <X size={12} /> Clear filter
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 dark:border-gray-600 rounded-xl px-3.5 py-2.5 shadow-sm">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name, phone, member ID…"
            className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={sel}>
            <option value="">All Status</option>
            {["ACTIVE","INACTIVE","VISITOR","NEW_CONVERT","TRANSFERRED_IN","TRANSFERRED_OUT"].map(s => (
              <option key={s} value={s}>{s.replace(/_/g," ")}</option>
            ))}
          </select>
          <select value={workerStatus === "ANY" ? "" : workerStatus} onChange={e => { setWorkerStatus(e.target.value); setPage(1); }} className={sel}>
            <option value="">All Workers</option>
            {["NONE","WORKER_IN_TRAINING","WORKER","DEPARTMENT_HEAD","PASTOR"].map(s => (
              <option key={s} value={s}>{s.replace(/_/g," ")}</option>
            ))}
          </select>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition shadow-sm flex-shrink-0">
            <UserPlus size={15} /> Add Member
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Users size={36} className="mb-3 text-gray-200" />
            <p className="font-semibold text-sm">No members found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/40 dark:bg-gray-700/40">
                    {["Member","ID","Phone","Status","Zone","Department","Joined",""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {members.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 dark:bg-gray-700/40 dark:hover:bg-gray-700/30 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/members/${m.id}`} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#145C14]/10 dark:bg-[#145C14]/20 flex items-center justify-center text-[#145C14] dark:text-green-400 font-bold text-xs flex-shrink-0">
                            {getInitials(m.firstName, m.lastName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[140px] hover:text-[#145C14] transition">
                              {m.firstName} {m.lastName}
                            </p>
                            <div className="flex items-center gap-1 flex-wrap">
                              {m.workerStatus !== "NONE" && (
                                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", WORKER_COLORS[m.workerStatus])}>
                                  {m.workerStatus.replace(/_/g," ")}
                                </span>
                              )}
                              {m.ageGroup && m.ageGroup !== "ADULT" && (
                                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", AGE_COLORS[m.ageGroup])}>
                                  {m.ageGroup}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 whitespace-nowrap">{m.memberId}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-300 whitespace-nowrap">{m.phone}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_COLORS[m.status] ?? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400")}>
                          {m.status.replace(/_/g," ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 dark:text-gray-400 text-xs">{m.zone || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {m.department ? (
                          <button onClick={() => { setDepartmentId(m.department!.id); setHfId(""); setStatus(""); setWorkerStatus(""); setNewThisMonth(false); setPage(1); }}
                            className="text-[#145C14] dark:text-green-400 font-semibold hover:underline">
                            {m.department.name}
                          </button>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">{formatDate(m.joinedDate)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/members/${m.id}`}
                          className="flex items-center gap-1 text-xs font-bold text-[#145C14] dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          View <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-700/30 dark:bg-gray-700/20">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                  Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total.toLocaleString()}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => p - 1)} disabled={!pagination.hasPrev || isFetching}
                    className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-40 transition">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 text-xs font-bold text-gray-600 dark:text-gray-400 dark:text-gray-300">{page} / {pagination.totalPages}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext || isFetching}
                    className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-40 transition">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
    }>
      <MembersPageContent />
    </Suspense>
  );
}
