"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, FileText, Send, RefreshCw, Eye, X, CheckCircle, Clock, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { cn, formatCurrency, MONTHS } from "@/lib/utils";
import type { MonthlyReturn } from "@/types";

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  DRAFT:        { label: "Draft",        cls: "bg-gray-100 text-gray-600",    icon: <Clock size={11} />       },
  SUBMITTED:    { label: "Submitted",    cls: "bg-blue-100 text-blue-700",    icon: <Send size={11} />        },
  ACKNOWLEDGED: { label: "Acknowledged", cls: "bg-green-100 text-green-700",  icon: <CheckCircle size={11} /> },
  QUERIED:      { label: "Queried",      cls: "bg-orange-100 text-orange-700",icon: <AlertCircle size={11} /> },
};

function ReturnDetailModal({ ret, onClose }: { ret: MonthlyReturn; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-serif font-bold text-gray-900 text-lg">
              {MONTHS[ret.month - 1]} {ret.year} Return
            </h2>
            <StatusBadge status={ret.status} />
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
            <X size={14} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Income",     value: formatCurrency(ret.totalIncome)      },
              { label: "Total Expenses",   value: formatCurrency(ret.totalExpenses)    },
              { label: "Net Surplus",      value: formatCurrency(ret.netSurplus)       },
              { label: "Total Remitted",   value: formatCurrency(ret.totalRemitted)    },
              { label: "Parish Retained",  value: formatCurrency(ret.parishRetained)   },
              { label: "Avg Attendance",   value: String(ret.avgAttendance ?? 0)       },
            ].map(r => (
              <div key={r.label} className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{r.label}</p>
                <p className="font-bold text-gray-900 mt-0.5">{r.value}</p>
              </div>
            ))}
          </div>

          {ret.incomeBreakdown && ret.incomeBreakdown.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Income Breakdown</p>
              <div className="space-y-1.5">
                {ret.incomeBreakdown.map((b: any) => (
                  <div key={b.category} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{b.category.replace(/_/g," ")}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ret.submittedAt && (
            <p className="text-xs text-gray-400">Submitted: {new Date(ret.submittedAt).toLocaleString()}</p>
          )}
        </div>
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Close</button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full", cfg.cls)}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function ReturnsPage() {
  const now  = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [selected, setSelected] = useState<MonthlyReturn | null>(null);
  const qc = useQueryClient();

  const { data: returns, isLoading } = useQuery<MonthlyReturn[]>({
    queryKey: ["returns", year],
    queryFn:  () => api.get(`/returns?year=${year}`).then(r => r.data),
  });

  const generate = useMutation({
    mutationFn: (payload: { month: number; year: number }) => api.post("/returns/generate", payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["returns"] }),
  });

  const submit = useMutation({
    mutationFn: (id: string) => api.post(`/returns/${id}/submit`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["returns"] }),
  });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  // Build a map of month → return
  const returnsByMonth = new Map(returns?.map(r => [r.month, r]) ?? []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif font-bold text-gray-900 text-lg">Monthly Returns</h2>
          <p className="text-gray-400 text-sm mt-0.5">Remittance records submitted to Province</p>
        </div>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#145C14]">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {["Month","Status","Total Income","Total Expenses","Net Surplus","Remitted","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MONTHS.map((monthName, idx) => {
                  const m   = idx + 1;
                  const ret = returnsByMonth.get(m);
                  const isPast = m < now.getMonth() + 1 || year < now.getFullYear();

                  return (
                    <tr key={m} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">{monthName}</td>
                      <td className="px-4 py-3">
                        {ret ? <StatusBadge status={ret.status} /> : (
                          <span className="text-[11px] font-medium text-gray-400">Not generated</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{ret ? formatCurrency(ret.totalIncome)    : "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{ret ? formatCurrency(ret.totalExpenses)  : "—"}</td>
                      <td className={cn("px-4 py-3 font-semibold",
                        ret ? (ret.netSurplus >= 0 ? "text-[#145C14]" : "text-red-500") : "text-gray-400"
                      )}>
                        {ret ? formatCurrency(ret.netSurplus) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{ret ? formatCurrency(ret.totalRemitted) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {!ret && isPast && (
                            <button
                              onClick={() => generate.mutate({ month: m, year })}
                              disabled={generate.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition disabled:opacity-50">
                              {generate.isPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                              Generate
                            </button>
                          )}
                          {ret && (
                            <button onClick={() => setSelected(ret)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition">
                              <Eye size={11} /> View
                            </button>
                          )}
                          {ret && ret.status === "DRAFT" && (
                            <button
                              onClick={() => submit.mutate(ret.id)}
                              disabled={submit.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#145C14]/10 text-[#145C14] text-xs font-bold hover:bg-[#145C14]/20 transition disabled:opacity-50">
                              {submit.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                              Submit
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

      {selected && <ReturnDetailModal ret={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
