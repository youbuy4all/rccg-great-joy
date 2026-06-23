"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Download, BarChart2 } from "lucide-react";
import api from "@/lib/api";
import { cn, formatCurrency, formatCategory, formatServiceType, MONTHS } from "@/lib/utils";
import type { FinanceSummary, AttendanceSummary, MemberStats } from "@/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/40">
        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function BreakdownBar({ label, value, total, colorCls }: { label: string; value: number; total: number; colorCls: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400 font-medium">{label}</span>
        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(value)}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", colorCls)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-gray-400 text-right">{pct.toFixed(1)}%</p>
    </div>
  );
}

export default function ReportsPage() {
  const now   = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { data: finance,    isLoading: fLoad } = useQuery<FinanceSummary>({
    queryKey: ["finance-summary",    month, year],
    queryFn:  () => api.get(`/finance/summary?month=${month}&year=${year}`).then(r => r.data),
  });

  const { data: attendance, isLoading: aLoad } = useQuery<AttendanceSummary>({
    queryKey: ["attendance-summary", month, year],
    queryFn:  () => api.get(`/attendance/summary?month=${month}&year=${year}`).then(r => r.data),
  });

  const { data: members } = useQuery<MemberStats>({
    queryKey: ["member-stats"],
    queryFn:  () => api.get("/members/stats").then(r => r.data),
  });

  const handlePrint = () => window.print();

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Reports</h2>
          <p className="text-gray-400 text-sm mt-0.5">{MONTHS[month - 1]} {year} parish summary</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#145C14]">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#145C14]">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition no-print">
            <Download size={14} /> Print
          </button>
        </div>
      </div>

      {/* Membership snapshot */}
      {members && (
        <Section title="Membership Snapshot">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: "Total",       value: members.total       },
              { label: "Active",      value: members.active      },
              { label: "Workers",     value: members.workers     },
              { label: "Men",         value: members.men         },
              { label: "Women",       value: members.women       },
              { label: "New Converts",value: members.newConverts },
            ].map(s => (
              <div key={s.label} className="text-center bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value.toLocaleString()}</p>
                <p className="text-[11px] font-bold text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Finance overview */}
      <Section title="Finance Overview">
        {fLoad ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
        ) : !finance ? (
          <p className="text-center text-gray-400 text-sm py-8">No finance data for this period</p>
        ) : (
          <div className="space-y-5">
            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Income",         value: finance.totalIncome,    cls: "text-green-600 dark:text-green-400"      },
                { label: "Expenses",       value: finance.totalExpenses,  cls: "text-red-500"        },
                { label: "Net Surplus",    value: finance.netSurplus,     cls: finance.netSurplus >= 0 ? "text-[#145C14] dark:text-green-400" : "text-red-500" },
                { label: "Remitted",       value: finance.totalRemitted,  cls: "text-blue-600"       },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <p className={cn("text-xl font-bold", s.cls)}>{formatCurrency(s.value)}</p>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Income breakdown */}
              {finance.incomeBreakdown?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Income by Category</p>
                  {finance.incomeBreakdown
                    .sort((a: any, b: any) => b.amount - a.amount)
                    .map((b: any) => (
                      <BreakdownBar
                        key={b.category}
                        label={formatCategory(b.category)}
                        value={b.amount}
                        total={finance.totalIncome}
                        colorCls="bg-green-500"
                      />
                    ))}
                </div>
              )}
              {/* Expense breakdown */}
              {finance.expenseBreakdown?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Expense by Category</p>
                  {finance.expenseBreakdown
                    .sort((a: any, b: any) => b.amount - a.amount)
                    .map((b: any) => (
                      <BreakdownBar
                        key={b.category}
                        label={formatCategory(b.category)}
                        value={b.amount}
                        total={finance.totalExpenses}
                        colorCls="bg-red-400"
                      />
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* Attendance overview */}
      <Section title="Attendance Overview">
        {aLoad ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
        ) : !attendance ? (
          <p className="text-center text-gray-400 text-sm py-8">No attendance data for this period</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{attendance.totalSessions}</p>
                <p className="text-[11px] font-bold text-gray-400 mt-0.5">Total Sessions</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{attendance.overallAvg}</p>
                <p className="text-[11px] font-bold text-gray-400 mt-0.5">Average Count</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{attendance.highestAttendance?.count ?? 0}</p>
                <p className="text-[11px] font-bold text-gray-400 mt-0.5">Peak Attendance</p>
              </div>
            </div>

            {/* By service type */}
            {Object.keys(attendance.byServiceType).length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      {["Service Type","Sessions","Total Attendance","Average"].map(h => (
                        <th key={h} className="text-left py-2.5 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(attendance.byServiceType)
                      .sort(([, a]: any, [, b]: any) => b.avg - a.avg)
                      .map(([type, data]: [string, any]) => (
                        <tr key={type} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors">
                          <td className="py-3 px-3">
                            <span className="bg-[#145C14]/8 text-[#145C14] dark:text-green-400 text-[11px] font-bold px-2.5 py-1 rounded-full">
                              {formatServiceType(type)}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-gray-700 dark:text-gray-300">{data.count}</td>
                          <td className="py-3 px-3 font-semibold text-gray-700 dark:text-gray-300">{data.total.toLocaleString()}</td>
                          <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">{data.avg}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
