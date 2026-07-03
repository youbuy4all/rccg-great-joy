"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, RefreshCw, Eye, X, CheckCircle, Clock, AlertCircle, Calendar, Printer, Pencil, Lock } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { cn, MONTHS } from "@/lib/utils";

type ReturnStatus = "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED" | "QUERIED";

interface MonthlyReturn {
  id:                    string;
  month:                 number;
  year:                  number;
  fromDate?:             string;
  toDate?:               string;
  status:                ReturnStatus;
  submittedAt?:          string;
  acknowledgedAt?:       string;
  totalTithe:            number;
  totalMinistersTithe:   number;
  totalSundayOffering:   number;
  totalThanksgiving:     number;
  totalCRM:              number;
  totalChildrenOffering: number;
  totalTrustFruit:       number;
  totalFirstBorn:        number;
  totalGospelFund:       number;
  totalHFOffering:       number;
  totalBuildingFund:     number;
  totalRUN:              number;
  totalCSR:              number;
  totalExpenses:         number;
  totalRemittance:       number;
  avgSundayAttendance:   number;
  avgMidweekAttendance:  number;
  newConverts:           number;
  waterBaptism:          number;
  totalActiveMembers:    number;
  notes?:                string;
}

function computeTotals(r: MonthlyReturn) {
  const totalIncome =
    Number(r.totalTithe) + Number(r.totalMinistersTithe) + Number(r.totalSundayOffering) +
    Number(r.totalThanksgiving) + Number(r.totalCRM) + Number(r.totalChildrenOffering) +
    Number(r.totalTrustFruit) + Number(r.totalFirstBorn) + Number(r.totalGospelFund) +
    Number(r.totalHFOffering) + Number(r.totalBuildingFund) + Number(r.totalRUN) + Number(r.totalCSR);
  const totalExpenses   = Number(r.totalExpenses);
  const totalRemittance = Number(r.totalRemittance);
  const netSurplus      = totalIncome - totalExpenses;
  const parishRetained  = totalIncome - totalRemittance;
  return { totalIncome, totalExpenses, totalRemittance, netSurplus, parishRetained };
}

function formatCurrency(n: number) {
  return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_CONFIG: Record<ReturnStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  DRAFT:        { label: "Draft",        cls: "bg-gray-100 text-gray-600",     icon: <Clock size={11} />        },
  SUBMITTED:    { label: "Submitted",    cls: "bg-blue-100 text-blue-700",     icon: <Send size={11} />         },
  ACKNOWLEDGED: { label: "Acknowledged", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",   icon: <CheckCircle size={11} />  },
  QUERIED:      { label: "Queried",      cls: "bg-orange-100 text-orange-700", icon: <AlertCircle size={11} />  },
};

function StatusBadge({ status }: { status: ReturnStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full", cfg.cls)}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function DetailModal({ ret, onClose }: { ret: MonthlyReturn; onClose: () => void }) {
  const t = computeTotals(ret);
  const incomeBreakdown = [
    { label: "Tithe",                value: Number(ret.totalTithe)            },
    { label: "Ministers' Tithe",     value: Number(ret.totalMinistersTithe)   },
    { label: "Sunday Offering",      value: Number(ret.totalSundayOffering)   },
    { label: "Thanksgiving",         value: Number(ret.totalThanksgiving)     },
    { label: "CRM",                  value: Number(ret.totalCRM)              },
    { label: "Children Offering",    value: Number(ret.totalChildrenOffering) },
    { label: "Trust Fruit",          value: Number(ret.totalTrustFruit)       },
    { label: "First Born Redemption",value: Number(ret.totalFirstBorn)        },
    { label: "Gospel Fund",          value: Number(ret.totalGospelFund)       },
    { label: "HF Offering",          value: Number(ret.totalHFOffering)       },
    { label: "Building Fund",        value: Number(ret.totalBuildingFund)     },
    { label: "RUN",                  value: Number(ret.totalRUN)              },
    { label: "CSR",                  value: Number(ret.totalCSR)              },
  ].filter(b => b.value > 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">{MONTHS[ret.month - 1]} {ret.year} Return</h2>
            {ret.fromDate && ret.toDate && (
              <p className="text-xs text-gray-400 mt-0.5">
                Covers {new Date(ret.fromDate).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})} – {new Date(ret.toDate).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
              </p>
            )}
            <div className="mt-1"><StatusBadge status={ret.status} /></div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition"><X size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Income",    value: formatCurrency(t.totalIncome),    cls: "text-green-600 dark:text-green-400" },
              { label: "Total Expenses",  value: formatCurrency(t.totalExpenses),  cls: "text-red-500"   },
              { label: "Net Surplus",     value: formatCurrency(t.netSurplus),     cls: t.netSurplus >= 0 ? "text-[#145C14] dark:text-green-400" : "text-red-500" },
              { label: "Remittance",      value: formatCurrency(t.totalRemittance),cls: "text-blue-600"  },
              { label: "Parish Retained", value: formatCurrency(t.parishRetained), cls: "text-gray-900 dark:text-white"  },
              { label: "Active Members",  value: String(ret.totalActiveMembers),   cls: "text-gray-900 dark:text-white"  },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{s.label}</p>
                <p className={cn("font-bold mt-0.5", s.cls)}>{s.value}</p>
              </div>
            ))}
          </div>
          {incomeBreakdown.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Income Breakdown</p>
              <div className="space-y-1.5">
                {incomeBreakdown.map(b => (
                  <div key={b.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{b.label}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(b.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Attendance</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Avg Sunday",   value: ret.avgSundayAttendance   },
                { label: "Avg Midweek",  value: ret.avgMidweekAttendance  },
                { label: "New Converts", value: ret.newConverts            },
                { label: "Water Baptism",value: ret.waterBaptism           },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          {ret.notes && <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">{ret.notes}</div>}
          {ret.submittedAt && <p className="text-xs text-gray-400">Submitted: {new Date(ret.submittedAt).toLocaleString()}</p>}
        </div>
        <div className="px-6 pb-6 flex-shrink-0">
          <button onClick={onClose} className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition">Close</button>
        </div>
      </div>
    </div>
  );
}

function EditReturnModal({ ret, onClose, onSaved }: { ret: MonthlyReturn; onClose: () => void; onSaved: (r: MonthlyReturn) => void }) {
  const [form, setForm] = useState({
    avgSundayAttendance:  ret.avgSundayAttendance,
    avgMidweekAttendance: ret.avgMidweekAttendance,
    newConverts:          ret.newConverts,
    waterBaptism:         ret.waterBaptism,
    totalActiveMembers:   ret.totalActiveMembers,
    notes:                ret.notes || "",
  });
  const [apiErr, setApiErr] = useState("");

  const update = useMutation({
    mutationFn: () => api.patch(`/returns/${ret.id}`, form).then(r => r.data as MonthlyReturn),
    onSuccess:  (fresh) => { onSaved(fresh); onClose(); },
    onError:    (e: any) => setApiErr(e?.response?.data?.message || "Failed to update return"),
  });

  const numInput = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent transition";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Edit {MONTHS[ret.month - 1]} {ret.year} Return</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition"><X size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Monetary totals (tithes, offerings, remittance) are pulled directly from transactions. To correct those, use <span className="font-bold">Recalc</span> with the right date range instead of editing here. This form covers the manually-entered figures below.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Avg Sunday Attendance</label>
              <input type="number" min="0" value={form.avgSundayAttendance}
                onChange={e => setForm(f => ({ ...f, avgSundayAttendance: Number(e.target.value) }))} className={numInput} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Avg Midweek Attendance</label>
              <input type="number" min="0" value={form.avgMidweekAttendance}
                onChange={e => setForm(f => ({ ...f, avgMidweekAttendance: Number(e.target.value) }))} className={numInput} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">New Converts</label>
              <input type="number" min="0" value={form.newConverts}
                onChange={e => setForm(f => ({ ...f, newConverts: Number(e.target.value) }))} className={numInput} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Water Baptism</label>
              <input type="number" min="0" value={form.waterBaptism}
                onChange={e => setForm(f => ({ ...f, waterBaptism: Number(e.target.value) }))} className={numInput} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Total Active Members</label>
            <input type="number" min="0" value={form.totalActiveMembers}
              onChange={e => setForm(f => ({ ...f, totalActiveMembers: Number(e.target.value) }))} className={numInput} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea rows={3} value={form.notes} placeholder="Any notes about this return…"
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={cn(numInput, "resize-none")} />
          </div>
          {apiErr && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">{apiErr}</p>}
        </div>
        <div className="p-6 pt-0 flex gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
          <button onClick={() => update.mutate()} disabled={update.isPending}
            className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70 flex items-center justify-center gap-2">
            {update.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

type FilterKey = "all" | "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED" | "QUERIED";

export default function ReturnsPage() {
  const now  = new Date();
  const [year, setYear]         = useState(now.getFullYear());
  const [selected, setSelected] = useState<MonthlyReturn | null>(null);
  const [editingReturn, setEditingReturn] = useState<MonthlyReturn | null>(null);
  const [filter, setFilter]     = useState<FilterKey>("all");
  const qc = useQueryClient();

  const { data: returns, isLoading } = useQuery<MonthlyReturn[]>({
    queryKey: ["returns", year],
    queryFn:  () => api.get(`/returns?year=${year}`).then(r => r.data),
  });

  // ── Generate modal state ──────────────────────
  const [genTarget, setGenTarget] = useState<{ month: number; year: number } | null>(null);
  const [genFrom,   setGenFrom]   = useState("");
  const [genTo,     setGenTo]     = useState("");

  function openGenerate(month: number, yr: number) {
    // Pre-fill: 3rd week = ~15th of this month to ~14th of next month
    const pad = (n: number) => String(n).padStart(2, "0");
    const nextM = month === 12 ? 1 : month + 1;
    const nextY = month === 12 ? yr + 1 : yr;
    setGenFrom(`${yr}-${pad(month)}-15`);
    setGenTo(`${nextY}-${pad(nextM)}-14`);
    setGenTarget({ month, year: yr });
  }

  const generate = useMutation({
    mutationFn: (payload: { month: number; year: number; fromDate?: string; toDate?: string }) =>
      api.post("/returns/generate", payload).then(r => r.data as MonthlyReturn),
    onSuccess: (fresh) => {
      // Immediately replace the stale record in the cache — no waiting for a refetch
      qc.setQueryData<MonthlyReturn[]>(["returns", year], old => {
        if (!old) return [fresh];
        const exists = old.findIndex(r => r.month === fresh.month && r.year === fresh.year);
        if (exists >= 0) {
          const updated = [...old];
          updated[exists] = fresh;
          return updated;
        }
        return [...old, fresh];
      });
      // Also keep the "selected" view in sync if it was showing this return
      setSelected(prev => prev?.month === fresh.month && prev?.year === fresh.year ? fresh : prev);
      setGenTarget(null);
    },
  });

  const submit = useMutation({
    mutationFn: (id: string) => api.post(`/returns/${id}/submit`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["returns"] }),
  });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const returnsByMonth = new Map((returns ?? []).map(r => [r.month, r]));

  const counts = {
    DRAFT:        (returns ?? []).filter(r => r.status === "DRAFT").length,
    SUBMITTED:    (returns ?? []).filter(r => r.status === "SUBMITTED").length,
    ACKNOWLEDGED: (returns ?? []).filter(r => r.status === "ACKNOWLEDGED").length,
    QUERIED:      (returns ?? []).filter(r => r.status === "QUERIED").length,
  };
  const ytdRemittance = (returns ?? []).reduce((s, r) => s + Number(r.totalRemittance), 0);

  const visibleMonths = MONTHS.map((_, idx) => idx + 1).filter(m => {
    if (filter === "all") return true;
    const ret = returnsByMonth.get(m);
    return ret?.status === filter;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Monthly Returns</h2>
          <p className="text-gray-400 text-sm mt-0.5">Remittance records submitted to Province</p>
        </div>
        <select value={year} onChange={e => { setYear(Number(e.target.value)); setFilter("all"); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#145C14]">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Status summary — clickable, filters the table below */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button onClick={() => setFilter("all")} className={cn(
          "bg-white dark:bg-gray-800 rounded-xl border shadow-sm px-3 py-3 text-center transition-all hover:shadow-md",
          filter === "all" ? "border-[#145C14] ring-2 ring-[#145C14]/20" : "border-gray-100 dark:border-gray-700"
        )}>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{(returns ?? []).length}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">All Records</p>
        </button>
        <button onClick={() => setFilter("DRAFT")} className={cn(
          "bg-white dark:bg-gray-800 rounded-xl border shadow-sm px-3 py-3 text-center transition-all hover:shadow-md",
          filter === "DRAFT" ? "border-gray-400 ring-2 ring-gray-200" : "border-gray-100 dark:border-gray-700"
        )}>
          <p className="text-xl font-bold text-gray-600 dark:text-gray-400">{counts.DRAFT}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Draft</p>
        </button>
        <button onClick={() => setFilter("SUBMITTED")} className={cn(
          "bg-white dark:bg-gray-800 rounded-xl border shadow-sm px-3 py-3 text-center transition-all hover:shadow-md",
          filter === "SUBMITTED" ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-100 dark:border-gray-700"
        )}>
          <p className="text-xl font-bold text-blue-600">{counts.SUBMITTED}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Submitted</p>
        </button>
        <button onClick={() => setFilter("ACKNOWLEDGED")} className={cn(
          "bg-white dark:bg-gray-800 rounded-xl border shadow-sm px-3 py-3 text-center transition-all hover:shadow-md",
          filter === "ACKNOWLEDGED" ? "border-green-400 ring-2 ring-green-200" : "border-gray-100 dark:border-gray-700"
        )}>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{counts.ACKNOWLEDGED}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Acknowledged</p>
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-3 py-3 text-center">
          <p className="text-sm font-bold text-[#145C14] dark:text-green-400">{formatCurrency(ytdRemittance)}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">YTD Remittance</p>
        </div>
      </div>

      {filter !== "all" && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <p className="text-sm text-blue-700 font-medium">Showing {STATUS_CONFIG[filter].label.toLowerCase()} returns only</p>
          <button onClick={() => setFilter("all")} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition">Clear filter</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/40">
                  {["Month","Status","Total Income","Expenses","Net Surplus","Remittance","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleMonths.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No returns match this filter for {year}</td></tr>
                ) : visibleMonths.map(m => {
                  const monthName = MONTHS[m - 1];
                  const ret = returnsByMonth.get(m);
                  const t   = ret ? computeTotals(ret) : null;
                  const isPast = year < now.getFullYear() || (year === now.getFullYear() && m <= now.getMonth() + 1);

                  return (
                    <tr key={m} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-gray-300 flex-shrink-0" />
                          <div>
                            <div>{monthName}</div>
                            {ret?.fromDate && ret?.toDate && (
                              <div className="text-[10px] font-medium text-gray-400 mt-0.5">
                                {new Date(ret.fromDate).toLocaleDateString("en-GB",{day:"numeric",month:"short"})} – {new Date(ret.toDate).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{ret ? <StatusBadge status={ret.status} /> : <span className="text-[11px] font-medium text-gray-400">Not generated</span>}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{t ? formatCurrency(t.totalIncome) : "—"}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{t ? formatCurrency(t.totalExpenses) : "—"}</td>
                      <td className={cn("px-4 py-3 font-semibold", t ? (t.netSurplus >= 0 ? "text-[#145C14] dark:text-green-400" : "text-red-500") : "text-gray-400")}>
                        {t ? formatCurrency(t.netSurplus) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{t ? formatCurrency(t.totalRemittance) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {!ret && isPast && (
                            <button onClick={() => openGenerate(m, year)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                              <RefreshCw size={11} /> Generate
                            </button>
                          )}
                          {ret && (
                            <button onClick={() => setSelected(ret)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition">
                              <Eye size={11} /> View
                            </button>
                          )}
                          {ret && (ret.status === "DRAFT" || ret.status === "QUERIED") && (
                            <button onClick={() => setEditingReturn(ret)} title="Edit return"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                              <Pencil size={11} /> Edit
                            </button>
                          )}
                          {ret && (ret.status === "SUBMITTED" || ret.status === "ACKNOWLEDGED") && (
                            <span title="This return has been submitted and can no longer be edited"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-gray-300 dark:text-gray-600 text-xs font-bold cursor-not-allowed">
                              <Lock size={11} /> Locked
                            </span>
                          )}
                          {ret && ret.status === "DRAFT" && (
                            <button onClick={() => openGenerate(m, year)} title="Recalculate with different date range"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-bold hover:bg-amber-100 transition">
                              <RefreshCw size={11} /> Recalc
                            </button>
                          )}
                          {ret && (
                            <Link href={`/returns/${ret.id}/print`}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-600 text-xs font-bold hover:bg-purple-100 transition">
                              <Printer size={11} /> Print
                            </Link>
                          )}
                          {ret && ret.status === "DRAFT" && (
                            <button onClick={() => submit.mutate(ret.id)} disabled={submit.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#145C14]/10 text-[#145C14] dark:text-green-400 text-xs font-bold hover:bg-[#145C14]/20 transition disabled:opacity-50">
                              {submit.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Submit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && <DetailModal ret={selected} onClose={() => setSelected(null)} />}
      {editingReturn && (
        <EditReturnModal
          ret={editingReturn}
          onClose={() => setEditingReturn(null)}
          onSaved={(fresh) => {
            qc.setQueryData<MonthlyReturn[]>(["returns", year], old =>
              old ? old.map(r => r.id === fresh.id ? fresh : r) : [fresh]
            );
            setSelected(prev => prev?.id === fresh.id ? fresh : prev);
          }}
        />
      )}

      {/* ── Generate / Recalculate Modal ─────────────────────────────── */}
      {genTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-sm">
                  Generate {MONTHS[genTarget.month - 1]} {genTarget.year} Return
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Select the transaction date range to include</p>
              </div>
              <button onClick={() => setGenTarget(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">RCCG 3rd-week reporting cycle</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                  Pre-filled to the typical 3rd-week period (15th → 14th of next month). Adjust to match the exact dates used this month.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1.5">From Date</label>
                  <input type="date" value={genFrom} onChange={e => setGenFrom(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#145C14]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1.5">To Date</label>
                  <input type="date" value={genTo} onChange={e => setGenTo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#145C14]" />
                </div>
              </div>

              {genFrom && genTo && (
                <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                  Will include all transactions from <span className="font-bold text-gray-700 dark:text-gray-200">{genFrom}</span> to <span className="font-bold text-gray-700 dark:text-gray-200">{genTo}</span> inclusive.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
              <button onClick={() => setGenTarget(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Cancel
              </button>
              <button
                onClick={() => generate.mutate({ month: genTarget.month, year: genTarget.year, fromDate: genFrom, toDate: genTo })}
                disabled={!genFrom || !genTo || generate.isPending}
                className="px-5 py-2 text-xs font-bold text-white bg-[#145C14] rounded-xl hover:bg-[#0f4a0f] transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {generate.isPending
                  ? <><Loader2 size={12} className="animate-spin" /> Generating…</>
                  : <><RefreshCw size={12} /> Generate Return</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
