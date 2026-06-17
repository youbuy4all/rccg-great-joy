"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, X, Receipt, TrendingUp, TrendingDown, Wallet, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { cn, formatCurrency, formatDate, formatCategory, MONTHS } from "@/lib/utils";
import type { Transaction, FinanceSummary, Paginated } from "@/types";

// Exact Prisma IncomeCategory enum values — must match schema.prisma exactly
const INCOME_CATS = [
  "TITHE","MINISTERS_TITHE","SUNDAY_LOVE_OFFERING","THANKSGIVING","CRM",
  "CHILDREN_TEENS_OFFERING","TRUST_FRUIT","FIRST_BORN_REDEMPTION","GOSPEL_FUND",
  "HOUSE_FELLOWSHIP_OFFERING","BUILDING_FUND","WELFARE","SPECIAL_DONATION",
  "PARTNERSHIP_SEED","CONVENTION_LEVY","RUN","CSR","OTHER_INCOME",
] as const;

// Exact Prisma ExpenseCategory enum values
const EXPENSE_CATS = [
  "FUEL","WELFARE_PAYMENT","RENT","SOUND_EQUIPMENT","SALARY_STIPEND",
  "MEDIA","DECORATION","TRANSPORTATION","INTERNET","MAINTENANCE",
  "PRINTING","STATIONERY","REFRESHMENT","TITHE_REMITTANCE","OTHER_EXPENSE",
] as const;

const PAYMENT_METHODS = ["CASH","BANK_TRANSFER","POS","CHEQUE","ONLINE"] as const;

const schema = z.object({
  type:            z.enum(["INCOME","EXPENSE"]),
  incomeCategory:  z.string().optional(),
  expenseCategory: z.string().optional(),
  paymentMethod:   z.enum(PAYMENT_METHODS).default("CASH"),
  amount:          z.coerce.number().positive("Amount must be positive"),
  transactionDate: z.string().min(1,"Date required"),
  description:     z.string().optional(),
});
type Form = z.infer<typeof schema>;

const inp = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent placeholder-gray-400 transition";

function AddTxModal({ onClose, onSuccess }: { onClose:()=>void; onSuccess:()=>void }) {
  const [apiErr, setApiErr] = useState("");
  const { register, handleSubmit, watch, formState:{errors} } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { type:"INCOME", paymentMethod:"CASH", transactionDate:new Date().toISOString().split("T")[0] },
  });
  const txType = watch("type");

  const create = useMutation({
    mutationFn: (d:Form) => api.post("/finance/transactions", d),
    onSuccess:  () => { onSuccess(); onClose(); },
    onError:    (e:any) => setApiErr(e?.response?.data?.message || "Failed to save transaction"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Add Transaction</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit(d => create.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["INCOME","EXPENSE"] as const).map(t => (
                <label key={t} className="cursor-pointer">
                  <input {...register("type")} type="radio" value={t} className="sr-only" />
                  <div className={cn("py-2.5 rounded-xl text-sm font-bold text-center border-2 transition",
                    txType===t ? t==="INCOME"?"border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700":"border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600"
                               : "border-gray-200 dark:border-gray-600 text-gray-500")}>{t}</div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Category *</label>
            {txType==="INCOME" ? (
              <select {...register("incomeCategory")} className={inp}>
                <option value="">Select category</option>
                {INCOME_CATS.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
              </select>
            ) : (
              <select {...register("expenseCategory")} className={inp}>
                <option value="">Select category</option>
                {EXPENSE_CATS.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Amount (₦) *</label>
              <input {...register("amount")} type="number" min="0" step="0.01" placeholder="0.00" className={cn(inp, errors.amount && "border-red-400")} />
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Date *</label>
              <input {...register("transactionDate")} type="date" className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Payment Method</label>
            <select {...register("paymentMethod")} className={inp}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{formatCategory(m)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
            <textarea {...register("description")} rows={2} placeholder="Optional notes…" className={cn(inp,"resize-none")} />
          </div>
          {apiErr && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">{apiErr}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70 flex items-center justify-center gap-2">
              {create.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const now = new Date();
  const [month,setMonth] = useState(now.getMonth()+1);
  const [year,setYear]   = useState(now.getFullYear());
  const [typeFilter,setTypeFilter] = useState("");
  const [showAdd,setShowAdd] = useState(false);
  const [page,setPage] = useState(1);
  const [activeTab,setActiveTab] = useState<"transactions"|"remittance">("transactions");
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey:["transactions"] });
    qc.invalidateQueries({ queryKey:["finance-summary"] });
    qc.invalidateQueries({ queryKey:["remittance"] });
  };
  const { data:summary } = useQuery<FinanceSummary>({ queryKey:["finance-summary",month,year], queryFn:()=>api.get(`/finance/summary?month=${month}&year=${year}`).then(r=>r.data) });
  const { data:result, isLoading } = useQuery<Paginated<Transaction>>({
    queryKey:["transactions",month,year,typeFilter,page],
    queryFn:()=>{
      const p=new URLSearchParams({ month:String(month),year:String(year),page:String(page),limit:"20" });
      if(typeFilter) p.set("type",typeFilter);
      return api.get(`/finance/transactions?${p}`).then(r=>r.data);
    },
    placeholderData:prev=>prev, enabled:activeTab==="transactions",
  });
  const { data:remittance, isLoading:rLoading, refetch:refetchRemittance } = useQuery<any>({ queryKey:["remittance",month,year], queryFn:()=>api.get(`/finance/remittance?month=${month}&year=${year}`).then(r=>r.data), enabled:activeTab==="remittance" });
  const markRemitted = useMutation({ mutationFn:(cat:string)=>api.post("/finance/remittance/mark",{month,year,categories:[cat]}), onSuccess:()=>refetchRemittance() });
  const transactions=result?.data??[], pagination=result?.pagination;
  const years = Array.from({length:5},(_,i)=>now.getFullYear()-i);
  const selCls = "px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#145C14]";
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Finance</h2><p className="text-gray-400 text-sm mt-0.5">{MONTHS[month-1]} {year}</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={month} onChange={e=>{setMonth(Number(e.target.value));setPage(1);}} className={selCls}>{MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select>
          <select value={year} onChange={e=>{setYear(Number(e.target.value));setPage(1);}} className={selCls}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
          <button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition shadow-sm"><Plus size={15}/> Add</button>
        </div>
      </div>
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {label:"Total Income",value:summary.totalIncome,icon:<TrendingUp size={20} className="text-green-600"/>,bg:"bg-green-50 dark:bg-green-900/20",fg:"text-gray-900 dark:text-white"},
            {label:"Total Expenses",value:summary.totalExpenses,icon:<TrendingDown size={20} className="text-red-500"/>,bg:"bg-red-50 dark:bg-red-900/20",fg:"text-gray-900 dark:text-white"},
            {label:"Net Surplus",value:summary.netSurplus,icon:<Wallet size={20} className={summary.netSurplus>=0?"text-[#145C14]":"text-red-500"}/>,bg:summary.netSurplus>=0?"bg-[#145C14]/10":"bg-red-50",fg:summary.netSurplus>=0?"text-[#145C14] dark:text-green-400":"text-red-600"},
          ].map(s=>(
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",s.bg)}>{s.icon}</div>
              <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{s.label}</p><p className={cn("text-xl font-bold",s.fg)}>{formatCurrency(s.value)}</p></div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 w-fit">
        {[{key:"transactions",label:"Transactions"},{key:"remittance",label:"Remittance"}].map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key as any)} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition",activeTab===t.key?"bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm":"text-gray-500 hover:text-gray-700")}>{t.label}</button>
        ))}
      </div>
      {activeTab==="transactions" && (
        <>
          <select value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1);}} className={selCls}>
            <option value="">All Types</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option>
          </select>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {isLoading ? <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300"/></div>
            : transactions.length===0 ? <div className="flex flex-col items-center py-16 text-gray-400"><Receipt size={36} className="mb-3 text-gray-200"/><p className="font-semibold text-sm">No transactions for this period</p></div>
            : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/60">{["Ref","Date","Type","Category","Amount","Method","Description"].map(h=><th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      {transactions.map(tx=>(
                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">{tx.reference}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(tx.transactionDate)}</td>
                          <td className="px-4 py-3"><span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",tx.type==="INCOME"?"bg-green-100 text-green-700":"bg-red-100 text-red-600")}>{tx.type}</span></td>
                          <td className="px-4 py-3 text-gray-700 text-xs">{formatCategory(tx.incomeCategory||tx.expenseCategory||"")}</td>
                          <td className={cn("px-4 py-3 font-bold whitespace-nowrap",tx.type==="INCOME"?"text-green-600":"text-red-500")}>{tx.type==="INCOME"?"+":"-"}{formatCurrency(tx.amount)}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{formatCategory(tx.paymentMethod||"")}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{tx.description||"—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pagination && pagination.totalPages>1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400">{pagination.total} transactions</p>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>setPage(p=>p-1)} disabled={!pagination.hasPrev} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-white disabled:opacity-40 transition">Prev</button>
                      <span className="text-xs font-bold text-gray-600">{page}/{pagination.totalPages}</span>
                      <button onClick={()=>setPage(p=>p+1)} disabled={!pagination.hasNext} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-white disabled:opacity-40 transition">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
      {activeTab==="remittance" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {rLoading ? <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300"/></div>
          : !remittance ? <p className="text-center text-gray-400 py-16 text-sm">No remittance data for this period</p>
          : (
            <>
              <div className="grid grid-cols-3 gap-4 p-5 border-b border-gray-100 dark:border-gray-700">
                {[{label:"Total Due",value:remittance.totalDue,cls:"text-gray-900"},{label:"Total Remitted",value:remittance.totalRemitted,cls:"text-green-600"},{label:"Outstanding",value:remittance.outstanding,cls:remittance.outstanding>0?"text-red-600":"text-[#145C14]"}].map(s=>(
                  <div key={s.label} className="text-center"><p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{s.label}</p><p className={cn("font-bold text-xl mt-1",s.cls)}>{formatCurrency(s.value)}</p></div>
                ))}
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50/60">{["Category","Collected","Remittance Due","Status"].map(h=><th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(remittance.breakdown??{}).map(([cat,data]:any)=>(
                    <tr key={cat} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">{formatCategory(cat)}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(data.total)}</td>
                      <td className="px-4 py-3 text-blue-600 font-bold">{formatCurrency(data.remittance)}</td>
                      <td className="px-4 py-3">{data.remitted?<span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Remitted</span>:data.remittance>0?<button onClick={()=>markRemitted.mutate(cat)} disabled={markRemitted.isPending} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition disabled:opacity-50"><RefreshCw size={10}/> Mark Remitted</button>:<span className="text-[10px] text-gray-400">N/A</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
      {showAdd && <AddTxModal onClose={()=>setShowAdd(false)} onSuccess={invalidate}/>}
    </div>
  );
}
