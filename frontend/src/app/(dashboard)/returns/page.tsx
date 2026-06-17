"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, RefreshCw, Eye, X, CheckCircle, Clock, AlertCircle, Calendar } from "lucide-react";
import api from "@/lib/api";
import { cn, MONTHS } from "@/lib/utils";

type ReturnStatus = "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED" | "QUERIED";

interface MonthlyReturn {
  id:                    string;
  month:                 number;
  year:                  number;
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

// Compute derived fields from raw schema fields
function computeTotals(r: MonthlyReturn) {
  const totalIncome =
    Number(r.totalTithe) +
    Number(r.totalMinistersTithe) +
    Number(r.totalSundayOffering) +
    Number(r.totalThanksgiving) +
    Number(r.totalCRM) +
    Number(r.totalChildrenOffering) +
    Number(r.totalTrustFruit) +
    Number(r.totalFirstBorn) +
    Number(r.totalGospelFund) +
    Number(r.totalHFOffering) +
    Number(r.totalBuildingFund) +
    Number(r.totalRUN) +
    Number(r.totalCSR);
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
  ACKNOWLEDGED: { label: "Acknowledged", cls: "bg-green-100 text-green-700",   icon: <CheckCircle size={11} />  },
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-serif font-bold text-gray-900 text-lg">
              {MONTHS[ret.month - 1]} {ret.year} Return
            </h2>
            <div className="mt-1"><StatusBadge status={ret.status} /></div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Income",    value: formatCurrency(t.totalIncome),    cls: "text-green-600" },
              { label: "Total Expenses",  value: formatCurrency(t.totalExpenses),  cls: "text-red-500"   },
              { label: "Net Surplus",     value: formatCurrency(t.netSurplus),     cls: t.netSurplus >= 0 ? "text-[#145C14]" : "text-red-500" },
              { label: "Remittance",      value: formatCurrency(t.totalRemittance),cls: "text-blue-600"  },
              { label: "Parish Retained", value: formatCurrency(t.parishRetained), cls: "text-gray-900"  },
              { label: "Active Members",  value: String(ret.totalActiveMembers),   cls: "text-gray-900"  },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{s.label}</p>
                <p className={cn("font-bold mt-0.5", s.cls)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Income breakdown */}
          {incomeBreakdown.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Income Breakdown</p>
              <div className="space-y-1.5">
                {incomeBreakdown.map(b => (
                  <div key={b.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{b.label}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(b.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Attendance</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Avg Sunday",   value: ret.avgSundayAttendance   },
                { label: "Avg Midweek",  value: ret.avgMidweekAttendance  },
                { label: "New Converts", value: ret.newConverts            },
                { label: "Water Baptism",value: ret.waterBaptism           },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{s.label}</span>
                  <span className="font-bold text-gray-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {ret.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
              {ret.notes}
            </div>
          )}
          {ret.submittedAt && (
            <p className="text-xs text-gray-400">
              Submitted: {new Date(ret.submittedAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="px-6 pb-6 flex-shrink-0">
          <button onClick={onClose}
            className="w-full py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReturnsPage() {
  const now  = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [selected, setSelected] = useState<MonthlyReturn | null>(null);
  const qc = useQueryClient();

  const { data: returns, isLoading } = useQuery<MonthlyReturn[]>({
    queryKey: ["returns", year],
    queryFn:  () => api.get(`/returns?year=${year}`).then(r => r.data),
  });

  const generate = useMutation({
    mutationFn: (payload: { month: number; year: number }) =>
      api.post("/returns/generate", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["returns"] }),
  });

  const submit = useMutation({
    mutationFn: (id: string) => api.post(`/returns/${id}/submit`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["returns"] }),
  });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const returnsByMonth = new Map((returns ?? []).map(r => [r.month, r]));

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
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {["Month","Status","Total Income","Expenses","Net Surplus","Remittance","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MONTHS.map((monthName, idx) => {
                  const m   = idx + 1;
                  const ret = returnsByMonth.get(m);
                  const t   = ret ? computeTotals(ret) : null;
                  const isPast = year < now.getFullYear() ||
                    (year === now.getFullYear() && m <= now.getMonth() + 1);

                  return (
                    <tr key={m} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800 flex items-center gap-2">
                        <Calendar size={13} className="text-gray-300 flex-shrink-0" />
                        {monthName}
                      </td>
                      <td className="px-4 py-3">
                        {ret
                          ? <StatusBadge status={ret.status} />
                          : <span className="text-[11px] font-medium text-gray-400">Not generated</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {t ? formatCurrency(t.totalIncome) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {t ? formatCurrency(t.totalExpenses) : "—"}
                      </td>
                      <td className={cn("px-4 py-3 font-semibold",
                        t ? (t.netSurplus >= 0 ? "text-[#145C14]" : "text-red-500") : "text-gray-400"
                      )}>
                        {t ? formatCurrency(t.netSurplus) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {t ? formatCurrency(t.totalRemittance) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {!ret && isPast && (
                            <button onClick={() => generate.mutate({ month: m, year })}
                              disabled={generate.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition disabled:opacity-50">
                              {generate.isPending
                                ? <Loader2 size={11} className="animate-spin" />
                                : <RefreshCw size={11} />}
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
                            <button onClick={() => submit.mutate(ret.id)}
                              disabled={submit.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#145C14]/10 text-[#145C14] text-xs font-bold hover:bg-[#145C14]/20 transition disabled:opacity-50">
                              {submit.isPending
                                ? <Loader2 size={11} className="animate-spin" />
                                : <Send size={11} />}
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

      {selected && <DetailModal ret={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
