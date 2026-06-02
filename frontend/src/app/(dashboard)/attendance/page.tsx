"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle, Users, Calendar } from "lucide-react";
import api from "@/lib/api";
import { formatDate, formatServiceType, cn } from "@/lib/utils";
import type { AttendanceSession, AttendanceSummary, Paginated } from "@/types";

const now   = new Date();
const month = now.getMonth() + 1;
const year  = now.getFullYear();

const SERVICE_TYPES = [
  "SUNDAY_MORNING","SUNDAY_EVENING","TUESDAY","THURSDAY","FRIDAY",
  "SATURDAY","DIGGING_DEEP","FAITH_CLINIC","YOUTH_SERVICE","CHILDREN_SERVICE",
  "HOUSE_FELLOWSHIP","SPECIAL_SERVICE",
];

export default function AttendancePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    serviceDate:   new Date().toISOString().split("T")[0],
    serviceType:   "SUNDAY_MORNING",
    preacher:      "",
    menCount:      "",
    womenCount:    "",
    childrenCount: "",
    sundaySchoolCount:    "",
    houseFellowshipCount: "",
    notes: "",
  });

  const { data: sessions, isLoading } = useQuery<Paginated<AttendanceSession>>({
    queryKey: ["sessions"],
    queryFn:  () => api.get(`/attendance/sessions?month=${month}&year=${year}`).then(r => r.data),
  });

  const { data: summary } = useQuery<AttendanceSummary>({
    queryKey: ["attendance-summary", month, year],
    queryFn:  () => api.get(`/attendance/summary?month=${month}&year=${year}`).then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post("/attendance/sessions", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["attendance-summary"] });
      setShowForm(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({
      serviceDate:          form.serviceDate,
      serviceType:          form.serviceType,
      preacher:             form.preacher || undefined,
      menCount:             parseInt(form.menCount)      || 0,
      womenCount:           parseInt(form.womenCount)    || 0,
      childrenCount:        parseInt(form.childrenCount) || 0,
      sundaySchoolCount:    parseInt(form.sundaySchoolCount)    || 0,
      houseFellowshipCount: parseInt(form.houseFellowshipCount) || 0,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-bold text-gray-900 text-2xl">Attendance</h1>
          <p className="text-gray-400 text-sm font-medium mt-0.5">
            {new Date().toLocaleString("en-NG", { month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#145C14] hover:bg-[#0A3D0A] text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-green-900/20 transition"
        >
          <Plus size={15} /> Record Service
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Sessions",   value: summary?.totalSessions || 0,  icon: Calendar },
          { label: "Overall Average",  value: summary?.overallAvg    || 0,  icon: Users },
          { label: "Sunday Avg",       value: summary?.byServiceType?.SUNDAY_MORNING?.avg || 0, icon: CheckCircle },
          { label: "Highest Attendance",value: summary?.highestAttendance?.count || 0, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mb-3">
              <Icon size={20} className="text-[#145C14]" />
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</div>
            <div className="text-2xl font-serif font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Sessions table */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-serif font-bold text-gray-900 text-lg">Service Sessions</h2>
          <span className="text-xs font-bold text-gray-400">{sessions?.pagination?.total || 0} sessions this month</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-[#F0F7F0] border-b border-green-100">
              {["Date","Service","Preacher","Men","Women","Children","Total","Sun. School","House Fell."].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : sessions?.data.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-gray-400 text-sm">No sessions recorded this month</td>
              </tr>
            ) : (
              sessions?.data.map((s, i) => (
                <tr key={s.id} className={cn("border-b border-gray-50", i % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                  <td className="px-4 py-3 text-sm font-bold text-gray-700">{formatDate(s.serviceDate)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                      {formatServiceType(s.serviceType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-medium">{s.preacher || "—"}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-700">{s.menCount}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-700">{s.womenCount}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-700">{s.childrenCount}</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#145C14]">{s.totalCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.sundaySchoolCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.houseFellowshipCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Session Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-serif font-bold text-gray-900 text-xl mb-5">Record Service Attendance</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Date</label>
                  <input type="date" required value={form.serviceDate}
                    onChange={e => setForm(f => ({ ...f, serviceDate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Service Type</label>
                  <select value={form.serviceType} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14]"
                  >
                    {SERVICE_TYPES.map(t => <option key={t} value={t}>{formatServiceType(t)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Preacher</label>
                <input type="text" value={form.preacher} onChange={e => setForm(f => ({ ...f, preacher: e.target.value }))}
                  placeholder="Name of preacher"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14]"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[["Men","menCount"],["Women","womenCount"],["Children","childrenCount"]].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
                    <input type="number" min="0" value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14]"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["Sunday School","sundaySchoolCount"],["House Fellowship","houseFellowshipCount"]].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
                    <input type="number" min="0" value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14]"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={create.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70">
                  {create.isPending ? "Saving…" : "Save Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
