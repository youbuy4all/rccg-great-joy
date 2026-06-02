"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users, HandCoins, Heart, Target,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDate, formatCategory } from "@/lib/utils";
import type { MemberStats, FinanceSummary, AttendanceSummary, Transaction } from "@/types";

const now   = new Date();
const month = now.getMonth() + 1;
const year  = now.getFullYear();

function StatCard({
  icon: Icon, label, value, sub, trend, color = "#145C14"
}: {
  icon: any; label: string; value: string;
  sub?: string; trend?: number; color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: color + "15" }}>
          <Icon size={22} color={color} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-serif font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 font-medium mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { data: memberStats } = useQuery<MemberStats>({
    queryKey: ["member-stats"],
    queryFn:  () => api.get("/members/stats").then(r => r.data),
  });

  const { data: finance } = useQuery<FinanceSummary>({
    queryKey: ["finance-summary", month, year],
    queryFn:  () => api.get(`/finance/summary?month=${month}&year=${year}`).then(r => r.data),
  });

  const { data: attendance } = useQuery<AttendanceSummary>({
    queryKey: ["attendance-summary", month, year],
    queryFn:  () => api.get(`/attendance/summary?month=${month}&year=${year}`).then(r => r.data),
  });

  const { data: transactions } = useQuery<{ data: Transaction[] }>({
    queryKey: ["recent-transactions"],
    queryFn:  () => api.get("/finance/transactions?limit=6").then(r => r.data),
  });

  return (
    <div className="p-6 space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#0A3D0A] via-[#145C14] to-[#1E7B1E] rounded-2xl p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-20 top-0 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute right-8 bottom-0 w-24 h-24 rounded-full bg-white/7" />
        <div className="relative">
          <div className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">
            RCCG Rivers Province 12
          </div>
          <div className="font-serif text-3xl font-bold mb-2">Great Joy Parish</div>
          <div className="text-white/65 text-sm font-medium">
            {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
        <div className="absolute right-12 top-1/2 -translate-y-1/2 text-right">
          <div className="font-serif text-4xl font-bold">
            {formatCurrency(finance?.totalIncome || 0)}
          </div>
          <div className="text-white/60 text-sm font-medium">Total Income — {new Date().toLocaleString("en-NG", { month: "long" })}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Users} label="Total Members"
          value={String(memberStats?.total || 0)}
          sub={`${memberStats?.newThisMonth || 0} new this month`}
          trend={4.8}
        />
        <StatCard
          icon={HandCoins} label="Total Tithe"
          value={formatCurrency(finance?.incomeBreakdown?.find(b => b.category === "TITHE")?.amount || 0)}
          sub={new Date().toLocaleString("en-NG", { month: "long", year: "numeric" })}
          trend={7.2}
          color="#1E7B1E"
        />
        <StatCard
          icon={Heart} label="Sunday Attendance"
          value={String(attendance?.byServiceType?.SUNDAY_MORNING?.avg || 0)}
          sub="Average this month"
          trend={2.1}
          color="#4A8F4A"
        />
        <StatCard
          icon={Target} label="Net Surplus"
          value={formatCurrency(finance?.netSurplus || 0)}
          sub="After expenses"
          color="#7A5C1A"
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Finance summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
          <h2 className="font-serif font-bold text-gray-900 text-lg mb-4">Finance Overview</h2>
          <div className="space-y-3">
            {[
              { label: "Total Income",    value: finance?.totalIncome   || 0, positive: true },
              { label: "Total Expenses",  value: finance?.totalExpenses || 0, positive: false },
              { label: "Net Surplus",     value: finance?.netSurplus    || 0, positive: true },
              { label: "Remitted to HQ",  value: finance?.totalRemitted || 0, positive: false },
              { label: "Parish Retained", value: finance?.parishRetained|| 0, positive: true },
            ].map(({ label, value, positive }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${positive ? "bg-green-50" : "bg-red-50"}`}>
                    {positive
                      ? <ArrowUpRight size={13} className="text-green-600" />
                      : <ArrowDownRight size={13} className="text-red-500" />
                    }
                  </div>
                  <span className="text-gray-600 text-sm font-semibold">{label}</span>
                </div>
                <span className={`text-sm font-bold ${positive ? "text-green-700" : "text-red-600"}`}>
                  {formatCurrency(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
          <h2 className="font-serif font-bold text-gray-900 text-lg mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            {transactions?.data?.length ? (
              transactions.data.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === "INCOME" ? "bg-green-50" : "bg-red-50"}`}>
                      {t.type === "INCOME"
                        ? <ArrowUpRight size={14} className="text-green-600" />
                        : <ArrowDownRight size={14} className="text-red-500" />
                      }
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">
                        {formatCategory(t.incomeCategory || t.expenseCategory || t.type)}
                      </div>
                      <div className="text-xs text-gray-400 font-medium">{formatDate(t.transactionDate)}</div>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${t.type === "INCOME" ? "text-green-700" : "text-red-600"}`}>
                    {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">No transactions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
