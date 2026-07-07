"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, Loader2, CalendarCheck, X, Calendar, Trash2, CheckSquare, Square, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { cn, formatDate, formatServiceType, MONTHS } from "@/lib/utils";
import type { AttendanceSession, AttendanceSummary } from "@/types";

const SERVICE_TYPES = [
  "SUNDAY_MORNING","SUNDAY_EVENING","MONDAY","DIGGING_DEEP","WEDNESDAY","FAITH_CLINIC","FRIDAY",
  "SATURDAY","YOUTH_SERVICE",
  "CHILDREN_SERVICE","HOUSE_FELLOWSHIP","SPECIAL_SERVICE",
];

const schema = z.object({
  serviceDate:          z.string().min(1, "Date is required"),
  serviceType:          z.string().min(1, "Service type required"),
  preacher:             z.string().optional(),
  menCount:             z.coerce.number().min(0).default(0),
  womenCount:           z.coerce.number().min(0).default(0),
  childrenCount:        z.coerce.number().min(0).default(0),
  sundaySchoolCount:    z.coerce.number().min(0).default(0),
  houseFellowshipCount: z.coerce.number().min(0).default(0),
  notes:                z.string().optional(),
});
type Form = z.infer<typeof schema>;

const inp = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 transition";

function LogSessionModal({ session, onClose, onDuplicateFound }: { session?: AttendanceSession; onClose: () => void; onDuplicateFound?: (existingId: string) => void }) {
  const qc = useQueryClient();
  const [apiErr, setApiErr] = useState("");
  const isEdit = !!session;

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: session ? {
      serviceDate:          new Date(session.serviceDate).toISOString().split("T")[0],
      serviceType:          session.serviceType,
      preacher:             session.preacher || "",
      menCount:             session.menCount,
      womenCount:           session.womenCount,
      childrenCount:        session.childrenCount,
      sundaySchoolCount:    session.sundaySchoolCount,
      houseFellowshipCount: session.houseFellowshipCount,
      notes:                session.notes || "",
    } : { serviceDate: new Date().toISOString().split("T")[0], serviceType: "SUNDAY_MORNING" },
  });

  const men      = Number(watch("menCount")      || 0);
  const women    = Number(watch("womenCount")    || 0);
  const children = Number(watch("childrenCount") || 0);

  const save = useMutation({
    mutationFn: (d: Form) => isEdit
      ? api.patch(`/attendance/sessions/${session!.id}`, d)
      : api.post("/attendance/sessions", d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["sessions"] }); qc.invalidateQueries({ queryKey: ["attendance-summary"] }); onClose(); },
    onError:    (e: any) => {
      const existingId = e?.response?.data?.existingId;
      if (!isEdit && e?.response?.status === 409 && existingId && onDuplicateFound) {
        onDuplicateFound(existingId);
      } else {
        setApiErr(e?.response?.data?.message || `Failed to ${isEdit ? "update" : "log"} session`);
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">{isEdit ? "Edit Attendance Session" : "Log Attendance Session"}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={handleSubmit(d => save.mutate(d))} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Service Date *</label>
              <input {...register("serviceDate")} type="date" className={cn(inp, errors.serviceDate && "border-red-400")} />
              {errors.serviceDate && <p className="mt-1 text-xs text-red-600">{errors.serviceDate.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Service Type *</label>
              <select {...register("serviceType")} className={inp}>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{formatServiceType(t)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Preacher</label>
            <input {...register("preacher")} placeholder="Name of preacher" className={inp} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(["menCount","womenCount","childrenCount"] as const).map(f => (
              <div key={f}>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  {f === "menCount" ? "Men" : f === "womenCount" ? "Women" : "Children"}
                </label>
                <input {...register(f)} type="number" min="0" placeholder="0" className={inp} />
              </div>
            ))}
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
            <span>Total Count</span>
            <span className="text-[#145C14] dark:text-green-400 text-lg">{(men + women + children).toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["sundaySchoolCount","houseFellowshipCount"] as const).map(f => (
              <div key={f}>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  {f === "sundaySchoolCount" ? "Sunday School" : "House Fellowship"}
                </label>
                <input {...register(f)} type="number" min="0" placeholder="0" className={inp} />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea {...register("notes")} rows={2} placeholder="Any notes about this session…" className={cn(inp, "resize-none")} />
          </div>
          {apiErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{apiErr}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition">Cancel</button>
            <button type="submit" disabled={save.isPending}
              className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70 flex items-center justify-center gap-2">
              {save.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : isEdit ? "Save Changes" : "Log Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AttendancePageContent() {
  const router       = useRouter();
  const pathname      = usePathname();
  const searchParams  = useSearchParams();
  const now = new Date();

  const [month,       setMonth]       = useState(now.getMonth() + 1);
  const [year,        setYear]        = useState(now.getFullYear());
  const [serviceType, setServiceType] = useState("");
  const [showLog,      setShowLog]     = useState(false);
  const [editingSession, setEditingSession] = useState<AttendanceSession|null>(null);
  const [dupNotice, setDupNotice] = useState("");

  async function handleDuplicateFound(existingId: string) {
    setShowLog(false);
    try {
      const { data } = await api.get(`/attendance/sessions/${existingId}`);
      setEditingSession(data);
      setDupNotice("A session already existed for this date & service type — opened it for editing instead of creating a duplicate.");
    } catch {
      // fall back silently if the fetch fails; the user can still find and edit it manually
    }
  }
  const [selected,     setSelected]    = useState<Set<string>>(new Set());
  const [deleting,     setDeleting]    = useState(false);

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(prev =>
    prev.size === sessions.length ? new Set() : new Set(sessions.map((s: any) => s.id))
  );
  const clearSelected = () => setSelected(new Set());

  const deleteSelected = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} session${selected.size>1?"s":""}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.post("/attendance/sessions/bulk-delete", { ids: Array.from(selected) });
      clearSelected();
      qc.invalidateQueries({ queryKey: ["sessions"] });
    } catch (e: any) {
      alert(e.response?.data?.message ?? "Delete failed");
    } finally { setDeleting(false); }
  };

  const deleteSingle = async (id: string) => {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    try {
      await api.delete(`/attendance/sessions/${id}`);
      qc.invalidateQueries({ queryKey: ["sessions"] });
    } catch (e: any) {
      alert(e.response?.data?.message ?? "Delete failed");
    }
  };
  const [hydrated,     setHydrated]    = useState(false);

  // Hydrate serviceType from URL (deep-link support, e.g. from Dashboard)
  useEffect(() => {
    setServiceType(searchParams.get("serviceType") || "");
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const p = new URLSearchParams();
    if (serviceType) p.set("serviceType", serviceType);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType, hydrated]);

  const { data: result, isLoading } = useQuery<{ data: AttendanceSession[]; pagination: any }>({
    queryKey: ["sessions", month, year, serviceType],
    queryFn:  () => {
      const p = new URLSearchParams({ month: String(month), year: String(year), limit: "50" });
      if (serviceType) p.set("serviceType", serviceType);
      return api.get(`/attendance/sessions?${p}`).then(r => r.data);
    },
    enabled: hydrated,
  });

  const { data: summary } = useQuery<AttendanceSummary>({
    queryKey: ["attendance-summary", month, year],
    queryFn:  () => api.get(`/attendance/summary?month=${month}&year=${year}`).then(r => r.data),
  });

  const sessions = result?.data ?? [];
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  // Service type with the highest single-session attendance (for the "Highest Count" card)
  const highestServiceType = summary?.highestAttendance?.service;

  return (
    <div className="space-y-5">
      {/* Header + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Attendance</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {summary ? `${summary.totalSessions} sessions · avg ${summary.overallAvg} per service` : "Service records"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#145C14]">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#145C14]">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={serviceType} onChange={e => setServiceType(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#145C14]">
            <option value="">All Service Types</option>
            {SERVICE_TYPES.map(t => <option key={t} value={t}>{formatServiceType(t)}</option>)}
          </select>
          <button onClick={() => setShowLog(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition shadow-sm">
            <Plus size={15} /> Log Session
          </button>
        </div>
      </div>

      {/* Summary cards — clickable filters */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => setServiceType("")}
            className={cn("bg-white dark:bg-gray-800 rounded-xl border shadow-sm px-4 py-3 text-center transition-all hover:shadow-md",
              serviceType === "" ? "border-[#145C14] ring-2 ring-[#145C14]/20" : "border-gray-100 dark:border-gray-700")}>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalSessions}</p>
            <p className="text-xs font-bold text-gray-400 mt-0.5">Total Sessions</p>
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.overallAvg}</p>
            <p className="text-xs font-bold text-gray-400 mt-0.5">Avg Attendance</p>
          </div>

          <button
            onClick={() => highestServiceType && setServiceType(highestServiceType)}
            disabled={!highestServiceType}
            className={cn("bg-white dark:bg-gray-800 rounded-xl border shadow-sm px-4 py-3 text-center transition-all hover:shadow-md disabled:cursor-default",
              highestServiceType && serviceType === highestServiceType ? "border-[#145C14] ring-2 ring-[#145C14]/20" : "border-gray-100 dark:border-gray-700")}>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.highestAttendance?.count ?? 0}</p>
            <p className="text-xs font-bold text-gray-400 mt-0.5">Highest Count</p>
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(summary.byServiceType).length}</p>
            <p className="text-xs font-bold text-gray-400 mt-0.5">Service Types</p>
          </div>
        </div>
      )}

      {serviceType && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <p className="text-sm text-blue-700 font-medium">Filtered by: {formatServiceType(serviceType)}</p>
          <button onClick={() => setServiceType("")} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition">Clear filter</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Calendar size={36} className="mb-3 text-gray-200" />
            <p className="font-semibold text-sm">No sessions for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/40">
                  <th className="px-4 py-3 w-8">
                      <button onClick={toggleAll} className="text-gray-400 hover:text-[#145C14] transition">
                        {selected.size === sessions.length && sessions.length > 0
                          ? <CheckSquare size={14} className="text-[#145C14]"/>
                          : <Square size={14}/>}
                      </button>
                    </th>
                    {["Date","Service Type","Preacher","Men","Women","Children","Total","SS",""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map(s => (
                  <tr key={s.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/30 transition-colors ${selected.has(s.id)?"bg-red-50/40 dark:bg-red-900/10":""}`}>
                    <td className="px-4 py-3 w-8">
                      <button onClick={()=>toggleSelect(s.id)} className="text-gray-400 hover:text-[#145C14] transition">
                        {selected.has(s.id)
                          ? <CheckSquare size={14} className="text-[#145C14]"/>
                          : <Square size={14}/>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(s.serviceDate)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setServiceType(s.serviceType)}
                        className="bg-[#145C14]/8 text-[#145C14] dark:text-green-400 text-[11px] font-bold px-2.5 py-1 rounded-full hover:bg-[#145C14]/15 transition">
                        {formatServiceType(s.serviceType)}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.preacher || "—"}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium text-center">{s.menCount}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium text-center">{s.womenCount}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium text-center">{s.childrenCount}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white text-center">{s.totalCount}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">{s.sundaySchoolCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>setEditingSession(s)} title="Edit session"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 transition">
                          <Pencil size={13}/>
                        </button>
                        <button onClick={()=>deleteSingle(s.id)} title="Delete session"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dupNotice && (
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-2.5">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">⚠️ {dupNotice}</p>
          <button onClick={() => setDupNotice("")} className="text-xs font-bold text-amber-600 hover:text-amber-800 transition">Dismiss</button>
        </div>
      )}

      {showLog && <LogSessionModal onClose={() => setShowLog(false)} onDuplicateFound={handleDuplicateFound} />}
      {editingSession && <LogSessionModal session={editingSession} onClose={() => setEditingSession(null)} />}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
    }>
      <AttendancePageContent />
    </Suspense>
  );
}
