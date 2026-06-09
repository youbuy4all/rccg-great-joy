"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, TrendingDown, CalendarCheck, Loader2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { formatCurrency, formatDate, formatServiceType, formatCategory, MONTHS } from "@/lib/utils";
import type { MemberStats, FinanceSummary, Transaction, AttendanceSession } from "@/types";
import { cn } from "@/lib/utils";

const now   = new Date();
const MONTH = now.getMonth() + 1;
const YEAR  = now.getFullYear();

// ─── helpers ──────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4 items-start">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs font-medium text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function Badge({ type }: { type: string }) {
  const cls = type === "INCOME"
    ? "bg-green-100 text-green-700"
    : type === "EXPENSE"
    ? "bg-red-100 text-red-700"
    : "bg-blue-100 text-blue-700";
  return <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cls)}>{type}</span>;
}

export default function DashboardPage() {
  const { data: memberStats, isLoading: mLoading } = useQuery<MemberStats>({
    queryKey: ["member-stats"],
    queryFn:  () => api.get("/members/stats").then(r => r.data),
  });

  const { data: finance, isLoading: fLoading } = useQuery<FinanceSummary>({
    queryKey: ["finance-summary", MONTH, YEAR],
    queryFn:  () => api.get(`/finance/summary?month=${MONTH}&year=${YEAR}`).then(r => r.data),
  });

  const { data: transactions, isLoading: tLoading } = useQuery<{ data: Transaction[] }>({
    queryKey: ["transactions-recent"],
    queryFn:  () => api.get("/finance/transactions?limit=6").then(r => r.data),
  });

  const { data: sessions, isLoading: sLoading } = useQuery<{ data: AttendanceSession[] }>({
    queryKey: ["sessions-recent"],
    queryFn:  () => api.get("/attendance/sessions?limit=5").then(r => r.data),
  });

  const loading = mLoading || fLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-serif font-bold text-gray-900 text-xl">
          {MONTHS[MONTH - 1]} {YEAR} Overview
        </h2>
        <p className="text-gray-400 text-sm mt-0.5">Parish performance at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} className="text-[#145C14]" />}
          label="Total Members"
          value={loading ? "—" : (memberStats?.total ?? 0).toLocaleString()}
          sub={memberStats ? `${memberStats.active} active · ${memberStats.newThisMonth} new` : undefined}
          color="bg-green-50"
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-blue-600" />}
          label="Monthly Income"
          value={loading ? "—" : formatCurrency(finance?.totalIncome ?? 0)}
          sub="This month"
          color="bg-blue-50"
        />
        <StatCard
          icon={<TrendingDown size={20} className="text-orange-500" />}
          label="Monthly Expenses"
          value={loading ? "—" : formatCurrency(finance?.totalExpenses ?? 0)}
          sub={finance ? `Surplus: ${formatCurrency(finance.netSurplus)}` : undefined}
          color="bg-orange-50"
        />
        <StatCard
          icon={<CalendarCheck size={20} className="text-purple-600" />}
          label="Workers"
          value={loading ? "—" : (memberStats?.workers ?? 0).toLocaleString()}
          sub={memberStats ? `${memberStats.men} men · ${memberStats.women} women` : undefined}
          color="bg-purple-50"
        />
      </div>

      {/* Finance health bar */}
      {finance && finance.totalIncome > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-700">Finance Health — {MONTHS[MONTH - 1]}</p>
            <span className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full",
              finance.netSurplus >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              {finance.netSurplus >= 0 ? "Surplus" : "Deficit"} {formatCurrency(Math.abs(finance.netSurplus))}
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#145C14] to-[#1e7e1e] rounded-full transition-all"
              style={{ width: `${Math.min(100, (finance.totalIncome / (finance.totalIncome + finance.totalExpenses)) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs font-medium text-gray-400">
            <span>Income: {formatCurrency(finance.totalIncome)}</span>
            <span>Expenses: {formatCurrency(finance.totalExpenses)}</span>
          </div>
        </div>
      )}

      {/* Two-column: recent transactions + recent sessions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <p className="font-bold text-gray-800 text-sm">Recent Transactions</p>
            <Link href="/finance" className="text-xs font-bold text-[#145C14] flex items-center gap-1 hover:underline">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          {tLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : !transactions?.data?.length ? (
            <p className="text-center text-gray-400 text-sm py-8">No transactions recorded yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.data.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                  <Badge type={tx.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {formatCategory(tx.incomeCategory || tx.expenseCategory || tx.type)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(tx.transactionDate)}</p>
                  </div>
                  <span className={cn(
                    "text-sm font-bold flex-shrink-0",
                    tx.type === "INCOME" ? "text-green-600" : "text-red-500"
                  )}>
                    {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <p className="font-bold text-gray-800 text-sm">Recent Attendance</p>
            <Link href="/attendance" className="text-xs font-bold text-[#145C14] flex items-center gap-1 hover:underline">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          {sLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : !sessions?.data?.length ? (
            <p className="text-center text-gray-400 text-sm py-8">No sessions recorded yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {sessions.data.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 rounded-xl bg-[#145C14]/8 flex items-center justify-center flex-shrink-0">
                    <CalendarCheck size={16} className="text-[#145C14]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {formatServiceType(s.serviceType)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(s.serviceDate)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{s.totalCount}</p>
                    <p className="text-[10px] text-gray-400">total</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { href: "/members",     label: "Members",     bg: "bg-green-50",  tc: "text-green-700"  },
          { href: "/attendance",  label: "Attendance",  bg: "bg-blue-50",   tc: "text-blue-700"   },
          { href: "/finance",     label: "Finance",     bg: "bg-yellow-50", tc: "text-yellow-700" },
          { href: "/departments", label: "Departments", bg: "bg-purple-50", tc: "text-purple-700" },
          { href: "/returns",     label: "Returns",     bg: "bg-orange-50", tc: "text-orange-700" },
          { href: "/reports",     label: "Reports",     bg: "bg-pink-50",   tc: "text-pink-700"   },
        ].map(q => (
          <Link key={q.href} href={q.href}
            className={cn("rounded-xl py-3 text-center text-xs font-bold transition hover:scale-[1.02] border border-transparent hover:border-gray-200 hover:bg-white hover:shadow-sm", q.bg, q.tc)}>
            {q.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
