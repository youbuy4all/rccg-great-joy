"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Settings, User, X, Plus, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import type { IncomeConfig } from "@/types";

const configSchema = z.object({
  category:          z.string().min(1, "Category required"),
  remittancePercent: z.coerce.number().min(0).max(100),
  isActive:          z.boolean().default(true),
});
type ConfigForm = z.infer<typeof configSchema>;

// Exact Prisma IncomeCategory enum values
const INCOME_CATS = [
  "TITHE","MINISTERS_TITHE","SUNDAY_LOVE_OFFERING","THANKSGIVING","CRM",
  "CHILDREN_TEENS_OFFERING","TRUST_FRUIT","FIRST_BORN_REDEMPTION","GOSPEL_FUND",
  "HOUSE_FELLOWSHIP_OFFERING","BUILDING_FUND","WELFARE","SPECIAL_DONATION",
  "PARTNERSHIP_SEED","CONVENTION_LEVY","RUN","CSR","OTHER_INCOME",
];

const inp = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 transition";

function ConfigModal({ existing, onClose }: { existing?: IncomeConfig; onClose: () => void }) {
  const qc = useQueryClient();
  const [apiErr, setApiErr] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: existing
      ? { category: existing.category, remittancePercent: existing.remittancePercent, isActive: existing.isActive }
      : { isActive: true },
  });

  const save = useMutation({
    mutationFn: (d: ConfigForm) => existing
      ? api.patch(`/finance/income-configs/${existing.id}`, d)
      : api.post("/finance/income-configs", d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["income-configs"] }); onClose(); },
    onError:    (e: any) => setApiErr(e?.response?.data?.message || "Save failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-serif font-bold text-gray-900 dark:text-white">{existing ? "Edit" : "Add"} Income Config</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={handleSubmit(d => save.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Category</label>
            <select {...register("category")} disabled={!!existing} className={cn(inp, errors.category && "border-red-400", existing && "opacity-60 cursor-not-allowed")}>
              <option value="">Select…</option>
              {INCOME_CATS.map(c => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Remittance % to Province</label>
            <input {...register("remittancePercent")} type="number" min="0" max="100" step="0.1" placeholder="e.g. 100" className={inp} />
            <p className="text-xs text-gray-400 mt-1">Percentage of this income type sent to Province</p>
          </div>
          <div className="flex items-center gap-3">
            <input {...register("isActive")} type="checkbox" id="isActive" className="w-4 h-4 rounded accent-[#145C14]" />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
          </div>
          {apiErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{apiErr}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition">Cancel</button>
            <button type="submit" disabled={save.isPending}
              className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70 flex items-center justify-center gap-2">
              {save.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const user     = useAuthStore(s => s.user);
  const [modal,  setModal]  = useState<"add" | IncomeConfig | null>(null);

  const { data: configs, isLoading } = useQuery<IncomeConfig[]>({
    queryKey: ["income-configs"],
    queryFn:  () => api.get("/finance/income-configs").then(r => r.data),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Settings</h2>
        <p className="text-gray-400 text-sm mt-0.5">Parish configuration and account management</p>
      </div>

      {/* Current user card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <User size={16} className="text-gray-400" />
          <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">Signed In As</p>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#145C14]/10 flex items-center justify-center text-[#145C14] font-bold text-lg">
              {user.firstName?.[0] ?? "?"}{user.lastName?.[0] ?? ""}
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white">{user.firstName} {user.lastName}</p>
              <p className="text-gray-400 text-sm">{user.email}</p>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#145C14]/10 text-[#145C14]">
                {user.role?.replace(/_/g," ") ?? "USER"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Parish info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Settings size={16} className="text-gray-400" />
          <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">Parish Information</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: "Parish Name",  value: "RCCG Great Joy Parish"    },
            { label: "Province",     value: "Rivers Province 12"        },
            { label: "Location",     value: "Port Harcourt, Rivers State"},
            { label: "Denomination", value: "RCCG (Redeemed Christian Church of God)" },
          ].map(r => (
            <div key={r.label} className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{r.label}</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{r.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Income remittance configs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">Income Remittance Configuration</p>
            <p className="text-xs text-gray-400 mt-0.5">Percentage of each income type remitted to Province</p>
          </div>
          <button onClick={() => setModal("add")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#145C14]/10 text-[#145C14] text-xs font-bold hover:bg-[#145C14]/20 transition">
            <Plus size={13} /> Add
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
        ) : !configs?.length ? (
          <p className="text-center text-gray-400 text-sm py-10">No configurations yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {configs.map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", c.isActive ? "bg-green-500" : "bg-gray-300")} />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{c.category.replace(/_/g," ")}</p>
                    <p className="text-xs text-gray-400">{c.isActive ? "Active" : "Inactive"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{c.remittancePercent}%</p>
                    <p className="text-[11px] text-gray-400">remittance</p>
                  </div>
                  <button onClick={() => setModal(c)}
                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    <Pencil size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal === "add" && <ConfigModal onClose={() => setModal(null)} />}
      {modal && modal !== "add" && typeof modal === "object" && (
        <ConfigModal existing={modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
