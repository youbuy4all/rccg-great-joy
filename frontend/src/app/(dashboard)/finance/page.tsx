"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet, Send } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDate, formatCategory, cn } from "@/lib/utils";
import type { FinanceSummary, Transaction, Paginated } from "@/types";

const now   = new Date();
const month = now.getMonth() + 1;
const year  = now.getFullYear();

const INCOME_CATS = [
  "TITHE","MINISTERS_TITHE","SUNDAY_LOVE_OFFERING","THANKSGIVING","CRM",
  "CHILDREN_TEENS_OFFERING","TRUST_FRUIT","FIRST_BORN_REDEMPTION","GOSPEL_FUND",
  "HOUSE_FELLOWSHIP_OFFERING","BUILDING_FUND","WELFARE","SPECIAL_DONATION",
  "PARTNERSHIP_SEED","CONVENTION_LEVY","RUN","CSR","OTHER_INCOME",
];
const EXPENSE_CATS = [
  "FUEL","WELFARE_PAYMENT","RENT","SOUND_EQUIPMENT","SALARY_STIPEND","MEDIA",
  "DECORATION","TRANSPORTATION","INTERNET","MAINTENANCE","PRINTING",
  "STATIONERY","REFRESHMENT","TITHE_REMITTANCE","OTHER_EXPENSE",
];
const PAYMENT_METHODS = ["CASH","BANK_TRANSFER","POS","CHEQUE","ONLINE"];

export default function FinancePage() {
  const qc = useQueryClient();
  const [tab, setTab]         = useState<"overview"|"transactions">("overview");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]        = useState({
    type: "INCOME", incomeCategory: "TITHE", expenseCategory: "FUEL",
    amount: "", description: "", paymentMethod: "CASH",
    transactionDate: new Date().toISOString().split("T")[0],
  });

  const { data: summary } = useQuery<FinanceSummary>({
    queryKey: ["finance-summary", month, year],
    queryFn:  () => api.get(`/finance/summary?month=${month}&year=${year}`).then(r => r.data),
  });

  const { data: transactions, isLoading } = useQuery<Paginated<Transaction>>({
    queryKey: ["transactions"],
    queryFn:  () => api.get("/finance/transactions?limit=20").then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post("/finance/transactions", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      setShowForm(false);
      setForm({ type:"INCOME", incomeCategory:"TITHE", expenseCategory:"FUEL", amount:"", description:"", paymentMethod:"CASH", transactionDate: new Date().toISOString().split("T")[0] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      type:            form.type,
      amount:          parseFloat(form.amount),
      description:     form.description,
      paymentMethod:   form.paymentMethod,
      transactionDate: form.transactionDate,
    };
    if (form.type === "INCOME")  payload.incomeCategory  = form.incomeCategory;
    if (form.type === "EXPENSE") payload.expenseCategory = form.expenseCategory;
    create.mutate(payload);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-bold text-gray-900 text-2xl">Finance Module</h1>
          <p className="text-gray-400 text-sm font-medium mt-0.5">
            {new Date().toLocaleString("en-NG", { month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#145C14] hover:bg-[#0A3D0A] text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-green-900/20 transition"
        >
          <Plus size={15} /> Record Transaction
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:"Total Income",   value: summary?.totalIncome   || 0, icon: TrendingUp,   color:"#145C14", positive: true },
          { label:"Total Expenses", value: summary?.totalExpenses || 0, icon: TrendingDown,  color:"#B52B2B", positive: false },
          { label:"Net Surplus",    value: summary?.netSurplus    || 0, icon: Wallet,        color:"#145C14", positive: true },
          { label:"Remitted to HQ", value: summary?.totalRemitted || 0, icon: Send,          color:"#7A5C1A", positive: false },
        ].map(({ label, value, icon: Icon, color, positive }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: color + "15" }}>
              <Icon size={20} color={color} />
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</div>
            <div className={`text-xl font-serif font-bold ${positive ? "text-gray-900" : "text-gray-900"}`}>
              {formatCurrency(value)}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-green-100 rounded-xl p-1 w-fit shadow-sm">
        {(["overview","transactions"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-bold capitalize transition",
              tab === t ? "bg-[#145C14] text-white shadow" : "text-gray-500 hover:text-gray-700"
            )}
          >{t}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
            <h3 className="font-serif font-bold text-gray-900 text-lg mb-4">Income Breakdown</h3>
            <div className="space-y-3">
              {summary?.incomeBreakdown?.length ? summary.incomeBreakdown.map(b => (
                <div key={b.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight size={14} className="text-green-500" />
                    <span className="text-sm font-semibold text-gray-600">{formatCategory(b.category)}</span>
                  </div>
                  <span className="text-sm font-bold text-green-700">{formatCurrency(b.amount)}</span>
                </div>
              )) : <p className="text-gray-400 text-sm">No income recorded this month</p>}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
            <h3 className="font-serif font-bold text-gray-900 text-lg mb-4">Expense Breakdown</h3>
            <div className="space-y-3">
              {summary?.expenseBreakdown?.length ? summary.expenseBreakdown.map(b => (
                <div key={b.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight size={14} className="text-red-400" />
                    <span className="text-sm font-semibold text-gray-600">{formatCategory(b.category)}</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">{formatCurrency(b.amount)}</span>
                </div>
              )) : <p className="text-gray-400 text-sm">No expenses recorded this month</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "transactions" && (
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F0F7F0] border-b border-green-100">
                {["Reference","Type","Description","Method","Date","Amount"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : transactions?.data.map((t, i) => (
                <tr key={t.id} className={cn("border-b border-gray-50", i % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                  <td className="px-5 py-4 text-xs font-bold text-gray-400">{t.reference}</td>
                  <td className="px-5 py-4">
                    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full",
                      t.type === "INCOME" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    )}>{t.type}</span>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-gray-700 max-w-[200px] truncate">{t.description}</td>
                  <td className="px-5 py-4 text-sm text-gray-500 font-medium">{t.paymentMethod.replace(/_/g," ")}</td>
                  <td className="px-5 py-4 text-sm text-gray-400 font-medium">{formatDate(t.transactionDate)}</td>
                  <td className={cn("px-5 py-4 text-sm font-bold",
                    t.type === "INCOME" ? "text-green-700" : "text-red-600"
                  )}>
                    {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-serif font-bold text-gray-900 text-xl mb-5">Record Transaction</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Type</label>
                <div className="flex gap-2">
                  {["INCOME","EXPENSE"].map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={cn("flex-1 py-2 rounded-xl text-sm font-bold border transition",
                        form.type === t ? "bg-[#145C14] text-white border-[#145C14]" : "bg-white text-gray-500 border-gray-200"
                      )}
                    >{t}</button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Category</label>
                <select
                  value={form.type === "INCOME" ? form.incomeCategory : form.expenseCategory}
                  onChange={e => setForm(f => form.type === "INCOME"
                    ? { ...f, incomeCategory: e.target.value }
                    : { ...f, expenseCategory: e.target.value }
                  )}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14]"
                >
                  {(form.type === "INCOME" ? INCOME_CATS : EXPENSE_CATS).map(c => (
                    <option key={c} value={c}>{formatCategory(c)}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Amount (₦)</label>
                <input
                  type="number" required min="1"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
                <input
                  type="text" required
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Tithe - John Oladele"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14]"
                />
              </div>

              {/* Payment Method + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14]"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Date</label>
                  <input
                    type="date" required
                    value={form.transactionDate}
                    onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={create.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70">
                  {create.isPending ? "Saving…" : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
