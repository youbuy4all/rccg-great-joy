"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Layers, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import type { Department } from "@/types";

const schema = z.object({
  name:        z.string().min(2, "Name is required"),
  description: z.string().optional(),
  budget:      z.coerce.number().min(0).default(0),
  hodId:       z.string().optional(),
});
type Form = z.infer<typeof schema>;

const inp = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent placeholder-gray-400 transition";

function AddDeptModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiErr, setApiErr] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const create = useMutation({
    mutationFn: (d: Form) => api.post("/departments", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); onClose(); },
    onError: (e: any) => setApiErr(e?.response?.data?.message || "Failed to create department"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-serif font-bold text-gray-900 text-lg">Add Department</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={handleSubmit(d => create.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Department Name *</label>
            <input {...register("name")} placeholder="e.g. Choir" className={cn(inp, errors.name && "border-red-400")} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea {...register("description")} rows={2} placeholder="Brief description…" className={cn(inp, "resize-none")} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Annual Budget (₦)</label>
            <input {...register("budget")} type="number" min="0" placeholder="0" className={inp} />
          </div>
          {apiErr && <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-xl p-3">{apiErr}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={create.isPending}
              className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70 flex items-center justify-center gap-2">
              {create.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeptCard({ d }: { d: Department }) {
  const pct = Math.min(100, d.budgetUsedPct);
  const danger = pct >= 90;
  const warn   = pct >= 70 && pct < 90;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-gray-900">{d.name}</h3>
          {d.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{d.description}</p>}
        </div>
        <span className="bg-[#145C14]/10 text-[#145C14] text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0">
          {d.memberCount} members
        </span>
      </div>

      {d.hod && (
        <p className="text-xs text-gray-500 font-medium">
          HOD: <span className="text-gray-800 font-semibold">{d.hod.firstName} {d.hod.lastName}</span>
        </p>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-xs font-medium text-gray-500">
          <span>Budget: {formatCurrency(d.budget)}</span>
          <span className={cn(danger ? "text-red-600" : warn ? "text-orange-500" : "text-gray-500")}>
            {pct}% used
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", danger ? "bg-red-500" : warn ? "bg-orange-400" : "bg-[#145C14]")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>Spent: {formatCurrency(d.spent)}</span>
          <span>Left: {formatCurrency(d.remaining)}</span>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const [showAdd, setShowAdd] = useState(false);

  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn:  () => api.get("/departments").then(r => r.data),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif font-bold text-gray-900 text-lg">Departments</h2>
          <p className="text-gray-400 text-sm mt-0.5">{departments?.length ?? 0} active departments</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition shadow-sm">
          <Plus size={15} /> Add Department
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : !departments?.length ? (
        <div className="flex flex-col items-center py-16 bg-white rounded-2xl border border-gray-100">
          <Layers size={36} className="text-gray-200 mb-3" />
          <p className="font-semibold text-gray-400 text-sm">No departments yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Department" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {departments.map(d => <DeptCard key={d.id} d={d} />)}
        </div>
      )}

      {showAdd && <AddDeptModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
