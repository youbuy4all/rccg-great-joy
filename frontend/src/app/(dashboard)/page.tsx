"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, TrendingDown, CalendarCheck, Loader2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { cn, formatCurrency, formatDate, formatServiceType, formatCategory, MONTHS } from "@/lib/utils";
import type { MemberStats, FinanceSummary, Transaction, AttendanceSession } from "@/types";

const now   = new Date();
const MONTH = now.getMonth() + 1;
const YEAR  = now.getFullYear();

// ─── Clickable KPI card ───────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, darkColor, href }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string; darkColor: string; href: string;
}) {
  return (
    <Link href={href} className="group block">
      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex gap-4 items-start",
        "transition-all hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 hover:-translate-y-0.5"
      )}>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", color, darkColor)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 leading-none">{value}</p>
          {sub && <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        <ArrowUpRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-[#145C14] transition flex-shrink-0 mt-1"/>
      </div>
    </Link>
  );
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
        <h2 className="font-serif font-bold text-gray-900 dark:text-white text-xl">
          {MONTHS[MONTH - 1]} {YEAR} Overview
        </h2>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Parish performance at a glance</p>
      </div>

      {/* KPI cards — each one navigates to the relevant filtered page */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          href="/members"
          icon={<Users size={20} className="text-[#145C14]"/>}
          label="Total Members"
          value={loading ? "—" : (memberStats?.total ?? 0).toLocaleString()}
          sub={memberStats ? `${memberStats.active} active · ${memberStats.newThisMonth} new` : undefined}
          color="bg-green-50" darkColor="dark:bg-green-900/20"
        />
        <StatCard
          href="/finance"
          icon={<TrendingUp size={20} className="text-blue-600"/>}
          label="Monthly Income"
          value={loading ? "—" : formatCurrency(finance?.totalIncome ?? 0)}
          sub={`${MONTHS[MONTH - 1]} ${YEAR}`}
          color="bg-blue-50" darkColor="dark:bg-blue-900/20"
        />
        <StatCard
          href="/finance"
          icon={<TrendingDown size={20} className="text-orange-500"/>}
          label="Monthly Expenses"
          value={loading ? "—" : formatCurrency(finance?.totalExpenses ?? 0)}
          sub={finance ? `Surplus: ${formatCurrency(finance.netSurplus)}` : undefined}
          color="bg-orange-50" darkColor="dark:bg-orange-900/20"
        />
        <StatCard
          href="/members?workerStatus=ANY"
          icon={<CalendarCheck size={20} className="text-purple-600"/>}
          label="Workers"
          value={loading ? "—" : (memberStats?.workers ?? 0).toLocaleString()}
          sub={memberStats ? `${memberStats.men} men · ${memberStats.women} women` : undefined}
          color="bg-purple-50" darkColor="dark:bg-purple-900/20"
        />
      </div>

      {/* Finance health bar */}
      {finance && finance.totalIncome > 0 && (
        <Link href="/finance">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Finance Health — {MONTHS[MONTH - 1]}
              </p>
              <span className={cn(
                "text-xs font-bold px-2.5 py-1 rounded-full",
                finance.netSurplus >= 0
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
              )}>
                {finance.netSurplus >= 0 ? "Surplus" : "Deficit"} {formatCurrency(Math.abs(finance.netSurplus))}
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#145C14] to-[#1e7e1e] rounded-full transition-all"
                style={{ width: `${Math.min(100, (finance.totalIncome / (finance.totalIncome + finance.totalExpenses)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium text-gray-400 dark:text-gray-500">
              <span>Income: {formatCurrency(finance.totalIncome)}</span>
              <span>Expenses: {formatCurrency(finance.totalExpenses)}</span>
            </div>
          </div>
        </Link>
      )}

      {/* Two column: recent tx + recent sessions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-gray-700">
            <p className="font-bold text-gray-800 dark:text-white text-sm">Recent Transactions</p>
            <Link href="/finance" className="text-xs font-bold text-[#145C14] dark:text-green-400 flex items-center gap-1 hover:underline">
              View all <ArrowUpRight size={12}/>
            </Link>
          </div>
          {tLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300"/></div>
          ) : !transactions?.data?.length ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">No transactions recorded yet</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {transactions.data.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0",
                    tx.type === "INCOME"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                  )}>{tx.type}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {formatCategory(tx.incomeCategory || tx.expenseCategory || tx.type)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(tx.transactionDate)}</p>
                  </div>
                  <span className={cn(
                    "text-sm font-bold flex-shrink-0",
                    tx.type === "INCOME" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
                  )}>
                    {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Attendance */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-gray-700">
            <p className="font-bold text-gray-800 dark:text-white text-sm">Recent Attendance</p>
            <Link href="/attendance" className="text-xs font-bold text-[#145C14] dark:text-green-400 flex items-center gap-1 hover:underline">
              View all <ArrowUpRight size={12}/>
            </Link>
          </div>
          {sLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300"/></div>
          ) : !sessions?.data?.length ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">No sessions recorded yet</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {sessions.data.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 rounded-xl bg-[#145C14]/10 dark:bg-[#145C14]/20 flex items-center justify-center flex-shrink-0">
                    <CalendarCheck size={16} className="text-[#145C14] dark:text-green-400"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {formatServiceType(s.serviceType)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(s.serviceDate)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{s.totalCount}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">total</p>
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
          { href:"/members",           label:"Members",      cls:"bg-green-50  dark:bg-green-900/20  text-green-700  dark:text-green-400"  },
          { href:"/attendance",         label:"Attendance",   cls:"bg-blue-50   dark:bg-blue-900/20   text-blue-700   dark:text-blue-400"   },
          { href:"/finance",            label:"Finance",      cls:"bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400" },
          { href:"/departments",        label:"Departments",  cls:"bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400" },
          { href:"/house-fellowship",   label:"Fellowship",   cls:"bg-teal-50   dark:bg-teal-900/20   text-teal-700   dark:text-teal-400"   },
          { href:"/returns",            label:"Returns",      cls:"bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400" },
        ].map(q => (
          <Link key={q.href} href={q.href}
            className={cn("rounded-xl py-3 text-center text-xs font-bold transition hover:scale-[1.02] border border-transparent hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm", q.cls)}>
            {q.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
