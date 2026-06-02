"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Download, Eye } from "lucide-react";
import api from "@/lib/api";
import { formatDate, getInitials, cn } from "@/lib/utils";
import { AddMemberModal } from "@/components/members/AddMemberModal";
import type { Member, Paginated } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:          "bg-green-100 text-green-700",
  INACTIVE:        "bg-gray-100 text-gray-500",
  VISITOR:         "bg-blue-100 text-blue-700",
  NEW_CONVERT:     "bg-yellow-100 text-yellow-700",
  TRANSFERRED_IN:  "bg-purple-100 text-purple-700",
  TRANSFERRED_OUT: "bg-red-100 text-red-600",
};

const WORKER_COLORS: Record<string, string> = {
  NONE:               "bg-gray-100 text-gray-500",
  WORKER_IN_TRAINING: "bg-yellow-100 text-yellow-700",
  WORKER:             "bg-green-100 text-green-700",
  DEPARTMENT_HEAD:    "bg-blue-100 text-blue-700",
  PASTOR:             "bg-purple-100 text-purple-700",
};

export default function MembersPage() {
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("ALL");
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState<Member | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery<Paginated<Member>>({
    queryKey: ["members", search, filter, page],
    queryFn:  () => api.get("/members", {
      params: {
        search:       search || undefined,
        workerStatus: filter !== "ALL" ? filter : undefined,
        page,
        limit: 15,
      },
    }).then(r => r.data),
  });

  const { data: detail } = useQuery<Member>({
    queryKey: ["member", selected?.id],
    queryFn:  () => api.get(`/members/${selected?.id}`).then(r => r.data),
    enabled:  !!selected?.id,
  });

  if (selected) {
    const m = detail || selected;
    return (
      <div className="p-6">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 mb-6 transition"
        >
          ← Back to Members
        </button>
        <div className="grid grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 text-center">
              <div className="w-20 h-20 rounded-full bg-[#145C14] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                {getInitials(m.firstName, m.lastName)}
              </div>
              <h2 className="font-serif font-bold text-gray-900 text-xl">{m.firstName} {m.lastName}</h2>
              <p className="text-gray-400 text-sm font-medium mt-1">{m.department?.name || "No Department"}</p>
              <div className="mt-3 flex justify-center gap-2">
                <span className={cn("text-xs font-bold px-3 py-1 rounded-full", WORKER_COLORS[m.workerStatus])}>
                  {m.workerStatus.replace(/_/g, " ")}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-left">
                {[
                  ["📱", m.phone],
                  ["✉️", m.email || "—"],
                  ["📍", m.houseFellowship?.name || "—"],
                  ["🗓", formatDate(m.joinedDate)],
                ].map(([icon, val]) => (
                  <div key={String(val)} className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{icon}</span><span className="font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
              <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide mb-3">RCCG Details</h3>
              {[
                ["Member ID",   m.memberId],
                ["Zone",        m.zone || "—"],
                ["Province",    m.province || "—"],
                ["Baptised",    m.baptismStatus === "BAPTISED" ? "Yes ✓" : "No"],
                ["Foundation School", m.foundationSchool ? "Completed ✓" : "Not yet"],
                ["Status",      m.status],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                  <span className="text-gray-400 font-semibold">{k}</span>
                  <span className="text-gray-800 font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right columns */}
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
              <h3 className="font-serif font-bold text-gray-900 text-lg mb-1">Member Profile</h3>
              <p className="text-gray-400 text-sm mb-4">Full details for {m.firstName} {m.lastName}</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Gender",   m.gender],
                  ["Phone 2",  m.phone2 || "—"],
                  ["Address",  m.address || "—"],
                  ["New Convert", m.isNewConvert ? "Yes" : "No"],
                  ["First Timer", m.isFirstTimer ? "Yes" : "No"],
                  ["Area",     m.area || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{k}</div>
                    <div className="text-sm font-bold text-gray-800">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
              <h3 className="font-serif font-bold text-gray-900 text-lg mb-4">Notes</h3>
              <p className="text-gray-500 text-sm">{m.notes || "No notes recorded."}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-bold text-gray-900 text-2xl">Members Directory</h1>
          <p className="text-gray-400 text-sm font-medium mt-0.5">
            {data?.pagination.total || 0} members registered
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#145C14] hover:bg-[#0A3D0A] text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-green-900/20 transition">
          <Plus size={15} /> Add Member
        </button>
      </div>

      {showModal && <AddMemberModal onClose={() => setShowModal(false)} />}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-green-100 rounded-xl px-3.5 py-2.5 flex-1 max-w-xs shadow-sm">
          <Search size={14} className="text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or phone…"
            className="bg-transparent outline-none text-sm text-gray-700 font-medium placeholder-gray-400 w-full"
          />
        </div>
        {["ALL","WORKER","DEPARTMENT_HEAD","PASTOR","WORKER_IN_TRAINING"].map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={cn(
              "text-xs font-bold px-4 py-2 rounded-full border transition",
              filter === f
                ? "bg-[#145C14] text-white border-[#145C14]"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#145C14]"
            )}
          >
            {f === "ALL" ? "All" : f.replace(/_/g, " ")}
          </button>
        ))}
        <button className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-xl hover:border-gray-300 transition ml-auto">
          <Download size={13} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F0F7F0] border-b border-green-100">
              {["Member","Department","Fellowship","Zone","Status","Worker Status","Joined",""].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-gray-400 text-sm font-medium">
                  No members found
                </td>
              </tr>
            ) : (
              data?.data.map((m, i) => (
                <tr
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className={cn(
                    "border-b border-gray-50 cursor-pointer hover:bg-green-50 transition",
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  )}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#145C14] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(m.firstName, m.lastName)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{m.firstName} {m.lastName}</div>
                        <div className="text-xs text-gray-400 font-medium">{m.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-gray-600">{m.department?.name || "—"}</td>
                  <td className="px-5 py-4 text-sm text-gray-500 font-medium">{m.houseFellowship?.name || "—"}</td>
                  <td className="px-5 py-4 text-sm text-gray-500 font-medium">{m.zone || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", STATUS_COLORS[m.status])}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", WORKER_COLORS[m.workerStatus])}>
                      {m.workerStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400 font-medium">{formatDate(m.joinedDate)}</td>
                  <td className="px-5 py-4">
                    <Eye size={15} className="text-gray-300 hover:text-[#145C14] transition" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-400 font-medium">
              Showing {((page-1)*15)+1}–{Math.min(page*15, data.pagination.total)} of {data.pagination.total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={!data.pagination.hasPrev}
                onClick={() => setPage(p => p - 1)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:border-[#145C14] transition"
              >
                Previous
              </button>
              <button
                disabled={!data.pagination.hasNext}
                onClick={() => setPage(p => p + 1)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:border-[#145C14] transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
