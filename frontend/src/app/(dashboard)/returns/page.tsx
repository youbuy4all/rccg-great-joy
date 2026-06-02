"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Send, CheckCircle, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, getMonthName, cn } from "@/lib/utils";
import type { MonthlyReturn } from "@/types";

const now = new Date();

export default function ReturnsPage() {
  const qc = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());

  const { data: returns } = useQuery<MonthlyReturn[]>({
    queryKey: ["returns"],
    queryFn:  () => api.get("/returns").then(r => r.data),
  });

  const { data: preview, isLoading: previewing } = useQuery({
    queryKey: ["returns-calculate", selectedMonth, selectedYear],
    queryFn:  () => api.get(`/returns/calculate?month=${selectedMonth}&year=${selectedYear}`).then(r => r.data),
  });

  const generate = useMutation({
    mutationFn: () => api.post("/returns/generate", { month: selectedMonth, year: selectedYear }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["returns"] }),
  });

  const submit = useMutation({
    mutationFn: (id: string) => api.post(`/returns/${id}/submit`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["returns"] }),
  });

  const currentReturn = returns?.find(r => r.month === selectedMonth && r.year === selectedYear);

  const STATUS_STYLES: Record<string, string> = {
    DRAFT:        "bg-yellow-100 text-yellow-700",
    SUBMITTED:    "bg-green-100 text-green-700",
    ACKNOWLEDGED: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="font-serif font-bold text-gray-900 text-2xl">Monthly Returns</h1>
        <p className="text-gray-400 text-sm font-medium mt-0.5">RCCG Rivers Province 12 Returns</p>
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100 flex items-center gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Month</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14]">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i+1} value={i+1}>{getMonthName(i+1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14]">
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {currentReturn && (
            <span className={cn("text-xs font-bold px-3 py-1.5 rounded-full", STATUS_STYLES[currentReturn.status])}>
              {currentReturn.status}
            </span>
          )}
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending || currentReturn?.status === "SUBMITTED"}
            className="flex items-center gap-2 bg-[#145C14] hover:bg-[#0A3D0A] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={generate.isPending ? "animate-spin" : ""} />
            {currentReturn ? "Recalculate" : "Generate Return"}
          </button>
          {currentReturn && currentReturn.status === "DRAFT" && (
            <button
              onClick={() => submit.mutate(currentReturn.id)}
              disabled={submit.isPending}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-50"
            >
              <Send size={14} /> Submit to Area Office
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Financial returns */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
          <h2 className="font-serif font-bold text-gray-900 text-lg mb-4">Financial Returns</h2>
          {previewing ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-0">
              {[
                ["Total Tithe",            preview?.totalTithe            || 0],
                ["Ministers Tithe",        preview?.totalMinistersTithe   || 0],
                ["Sunday Love Offering",   preview?.totalSundayOffering   || 0],
                ["Thanksgiving",           preview?.totalThanksgiving     || 0],
                ["Building Fund",          preview?.totalBuildingFund     || 0],
                ["Total Expenses",         preview?.totalExpenses         || 0],
                ["Total Remittance Due",   preview?.totalRemittance       || 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm font-semibold text-gray-500">{label}</span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(Number(value))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* Attendance returns */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
            <h2 className="font-serif font-bold text-gray-900 text-lg mb-4">Attendance Returns</h2>
            {[
              ["Sunday Service (Avg)",   preview?.avgSundayAttendance  || 0],
              ["Midweek (Avg)",          preview?.avgMidweekAttendance || 0],
              ["Faith Clinic (Avg)",     preview?.avgFaithClinic       || 0],
              ["Youth Service (Avg)",    preview?.avgYouthService      || 0],
              ["House Fellowship (Avg)", preview?.avgHouseFellowship   || 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-semibold text-gray-500">{label}</span>
                <span className="text-sm font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>

          {/* Membership returns */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
            <h2 className="font-serif font-bold text-gray-900 text-lg mb-4">Membership Returns</h2>
            {[
              ["New Converts",       preview?.newConverts       || 0],
              ["Water Baptism",      preview?.waterBaptism      || 0],
              ["Workers in Training",preview?.workersInTraining || 0],
              ["Foundation School",  preview?.foundationSchool  || 0],
              ["Total Active Members",preview?.totalActiveMembers|| 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-semibold text-gray-500">{label}</span>
                <span className="text-sm font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Returns history */}
      {returns && returns.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
          <h2 className="font-serif font-bold text-gray-900 text-lg mb-4">Returns History</h2>
          <div className="space-y-2">
            {returns.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-gray-400" />
                  <span className="text-sm font-bold text-gray-700">
                    {getMonthName(r.month)} {r.year}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(r.totalRemittance)}</span>
                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", STATUS_STYLES[r.status])}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
