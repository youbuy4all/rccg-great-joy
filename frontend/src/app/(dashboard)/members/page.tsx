"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, Loader2, ChevronLeft, ChevronRight, Users } from "lucide-react";
import api from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { AddMemberModal } from "@/components/members/AddMemberModal";
import type { Member, MemberStats, Paginated } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:           "bg-green-100 text-green-700",
  INACTIVE:         "bg-gray-100 text-gray-500",
  VISITOR:          "bg-blue-100 text-blue-700",
  NEW_CONVERT:      "bg-yellow-100 text-yellow-700",
  TRANSFERRED_IN:   "bg-purple-100 text-purple-700",
  TRANSFERRED_OUT:  "bg-red-100 text-red-600",
};

const WORKER_COLORS: Record<string, string> = {
  NONE:               "",
  WORKER_IN_TRAINING: "bg-sky-100 text-sky-700",
  WORKER:             "bg-indigo-100 text-indigo-700",
  DEPARTMENT_HEAD:    "bg-orange-100 text-orange-700",
  PASTOR:             "bg-purple-100 text-purple-700",
};

function StatPill({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function MembersPage() {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [workerStatus, setWorkerStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data: stats } = useQuery<MemberStats>({
    queryKey: ["member-stats"],
    queryFn:  () => api.get("/members/stats").then(r => r.data),
  });

  const { data, isLoading, isFetching } = useQuery<Paginated<Member>>({
    queryKey: ["members", page, search, status, workerStatus],
    queryFn:  () => {
      const p = new URLSearchParams({ page: String(page), limit: "20" });
      if (search)       p.set("search",       search);
      if (status)       p.set("status",       status);
      if (workerStatus) p.set("workerStatus", workerStatus);
      return api.get(`/members?${p}`).then(r => r.data);
    },
    placeholderData: prev => prev,
  });

  const members    = data?.data ?? [];
  const pagination = data?.pagination;

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleFilter = (key: "status" | "workerStatus", v: string) => {
    if (key === "status")       { setStatus(v);       setPage(1); }
    if (key === "workerStatus") { setWorkerStatus(v); setPage(1); }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatPill label="Total Members"  value={stats?.total       ?? 0} sub={`${stats?.men ?? 0} men · ${stats?.women ?? 0} women`} />
        <StatPill label="Active"         value={stats?.active      ?? 0} />
        <StatPill label="Workers"        value={stats?.workers     ?? 0} />
        <StatPill label="New This Month" value={stats?.newThisMonth ?? 0} sub={`${stats?.baptised ?? 0} baptised`} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-sm">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name, phone, member ID…"
            className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-700 placeholder-gray-400"
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <select value={status} onChange={e => handleFilter("status", e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#145C14]">
            <option value="">All Status</option>
            {["ACTIVE","INACTIVE","VISITOR","NEW_CONVERT","TRANSFERRED_IN","TRANSFERRED_OUT"].map(s => (
              <option key={s} value={s}>{s.replace(/_/g," ")}</option>
            ))}
          </select>
          <select value={workerStatus} onChange={e => handleFilter("workerStatus", e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#145C14]">
            <option value="">All Workers</option>
            {["NONE","WORKER_IN_TRAINING","WORKER","DEPARTMENT_HEAD","PASTOR"].map(s => (
              <option key={s} value={s}>{s.replace(/_/g," ")}</option>
            ))}
          </select>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition shadow-sm shadow-green-900/20 flex-shrink-0">
            <UserPlus size={15} /> Add Member
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {["Member","ID","Phone","Status","Zone","Department","Joined"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {members.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Name + avatar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#145C14]/10 flex items-center justify-center text-[#145C14] font-bold text-xs flex-shrink-0">
                            {getInitials(m.firstName, m.lastName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate max-w-[140px]">
                              {m.firstName} {m.lastName}
                            </p>
                            {m.workerStatus !== "NONE" && (
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", WORKER_COLORS[m.workerStatus])}>
                                {m.workerStatus.replace(/_/g," ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{m.memberId}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{m.phone}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_COLORS[m.status] ?? "bg-gray-100 text-gray-500")}>
                          {m.status.replace(/_/g," ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.zone || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.department?.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(m.joinedDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
                <p className="text-xs font-medium text-gray-400">
                  Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total.toLocaleString()}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => p - 1)} disabled={!pagination.hasPrev || isFetching}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-40 transition">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 text-xs font-bold text-gray-600">{page} / {pagination.totalPages}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext || isFetching}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-40 transition">
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
