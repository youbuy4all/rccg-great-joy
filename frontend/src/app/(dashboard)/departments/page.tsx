"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, Loader2, X, Users, Layers, ChevronRight, Search, UserMinus, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { cn, getInitials } from "@/lib/utils";

interface Department {
  id: string; name: string; description?: string;
  memberCount: number; isActive: boolean;
  hod?: { id: string; firstName: string; lastName: string };
}
interface DeptMember {
  id: string; memberId: string; firstName: string; lastName: string;
  phone: string; gender: string; workerStatus: string; status: string;
}
interface SearchMember {
  id: string; firstName: string; lastName: string; phone: string; memberId: string;
}

const inp = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 transition";

const schema = z.object({
  name:        z.string().min(2, "Department name required"),
  description: z.string().optional(),
});
type Form = z.infer<typeof schema>;

const WORKER_COLORS: Record<string,string> = {
  WORKER_IN_TRAINING: "bg-sky-100 text-sky-700",
  WORKER:             "bg-indigo-100 text-indigo-700",
  DEPARTMENT_HEAD:    "bg-orange-100 text-orange-700",
  PASTOR:             "bg-purple-100 text-purple-700",
};

type FilterKey = "all" | "withMembers" | "withHod";

function AddDeptModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiErr, setApiErr] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });
  const create = useMutation({
    mutationFn: (d: Form) => api.post("/departments", d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["departments"] }); onClose(); },
    onError:    (e: any) => setApiErr(e?.response?.data?.message || "Failed to create department"),
  });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Add Department</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition"><X size={14}/></button>
        </div>
        <form onSubmit={handleSubmit(d => create.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Department Name *</label>
            <input {...register("name")} placeholder="e.g. Choir" className={cn(inp, errors.name && "border-red-400")}/>
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
            <textarea {...register("description")} rows={3} placeholder="What does this department do?" className={cn(inp,"resize-none")}/>
          </div>
          {apiErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{apiErr}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition">Cancel</button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70 flex items-center justify-center gap-2">
              {create.isPending ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditDeptModal({ dept, onClose }: { dept: Department; onClose: () => void }) {
  const qc = useQueryClient();
  const [apiErr, setApiErr] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: dept.name, description: dept.description || "" },
  });
  const update = useMutation({
    mutationFn: (d: Form) => api.patch(`/departments/${dept.id}`, d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["departments"] }); onClose(); },
    onError:    (e: any) => setApiErr(e?.response?.data?.message || "Failed to update department"),
  });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Edit Department</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition"><X size={14}/></button>
        </div>
        <form onSubmit={handleSubmit(d => update.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Department Name *</label>
            <input {...register("name")} className={cn(inp, errors.name && "border-red-400")}/>
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
            <textarea {...register("description")} rows={3} className={cn(inp,"resize-none")}/>
          </div>
          {apiErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{apiErr}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition">Cancel</button>
            <button type="submit" disabled={update.isPending} className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70 flex items-center justify-center gap-2">
              {update.isPending ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberPanel({ deptId, onAdded }: { deptId: string; onAdded: () => void }) {
  const [search, setSearch] = useState("");
  const { data: results = [] } = useQuery<SearchMember[]>({
    queryKey: ["member-search", search],
    queryFn:  () => api.get(`/members?search=${encodeURIComponent(search)}&limit=10`).then(r => r.data.data),
    enabled:  search.length >= 2,
  });
  const assign = useMutation({
    mutationFn: (memberId: string) => api.post(`/departments/${deptId}/members`, { memberId }),
    onSuccess:  () => { setSearch(""); onAdded(); },
  });
  return (
    <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 bg-gray-50/40 dark:bg-gray-700/30">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Add Member to Department</p>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members by name or phone…"
          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#145C14] placeholder-gray-400 dark:placeholder-gray-500"/>
      </div>
      {search.length >= 2 && results.length > 0 && (
        <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm overflow-hidden max-h-48 overflow-y-auto">
          {results.map(m => (
            <button key={m.id} onClick={() => assign.mutate(m.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#145C14]/5 transition-colors text-left border-b border-gray-50 last:border-0">
              <div className="w-7 h-7 rounded-full bg-[#145C14]/10 flex items-center justify-center text-[#145C14] text-xs font-bold flex-shrink-0">
                {getInitials(m.firstName, m.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{m.firstName} {m.lastName}</p>
                <p className="text-xs text-gray-400">{m.memberId} · {m.phone}</p>
              </div>
              <span className="text-xs font-bold text-[#145C14] flex-shrink-0">Add +</span>
            </button>
          ))}
        </div>
      )}
      {search.length >= 2 && results.length === 0 && (
        <p className="mt-2 text-xs text-gray-400 text-center py-2">No members found</p>
      )}
    </div>
  );
}

function DepartmentsPageContent() {
  const router       = useRouter();
  const pathname      = usePathname();
  const searchParams  = useSearchParams();

  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [showAdd,       setShowAdd]      = useState(false);
  const [showEdit,      setShowEdit]     = useState(false);
  const [memberSearch,  setMemberSearch] = useState("");
  const [filter,        setFilter]       = useState<FilterKey>("all");
  const [hydrated,      setHydrated]     = useState(false);
  const qc = useQueryClient();

  // Hydrate selected department from URL (deep-link from Member profile page)
  useEffect(() => {
    setSelectedId(searchParams.get("id") || null);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn:  () => api.get("/departments").then(r => r.data),
  });

  const selected = departments.find(d => d.id === selectedId) || null;

  const selectDept = (d: Department | null) => {
    setSelectedId(d?.id ?? null);
    setMemberSearch("");
    const qs = d ? `?id=${d.id}` : "";
    router.replace(`${pathname}${qs}`, { scroll: false });
  };

  const { data: members = [], isLoading: mLoading, refetch: refetchMembers } = useQuery<DeptMember[]>({
    queryKey: ["dept-members", selected?.id],
    queryFn:  () => api.get(`/departments/${selected!.id}/members`).then(r => r.data),
    enabled:  !!selected,
  });

  const remove = useMutation({
    mutationFn: (memberId: string) => api.delete(`/departments/${selected!.id}/members`, { data: { memberId } }),
    onSuccess:  () => { refetchMembers(); qc.invalidateQueries({ queryKey: ["departments"] }); },
  });

  const deleteDept = useMutation({
    mutationFn: (id: string) => api.delete(`/departments/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["departments"] }); selectDept(null); },
  });

  const totalMembers = departments.reduce((s, d) => s + d.memberCount, 0);
  const withHodCount = departments.filter(d => d.hod).length;

  const filteredDepartments = departments.filter(d => {
    if (filter === "withMembers") return d.memberCount > 0;
    if (filter === "withHod")     return !!d.hod;
    return true;
  });

  const filtered = members.filter(m =>
    `${m.firstName} ${m.lastName} ${m.phone}`.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Departments</h2>
          <p className="text-gray-400 text-sm mt-0.5">{departments.length} departments · {totalMembers} members assigned</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition shadow-sm">
          <Plus size={15}/> Add Department
        </button>
      </div>

      {/* Stats — clickable, filter the department list below */}
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => setFilter("all")} className={cn(
          "bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-4 text-center transition-all hover:shadow-md",
          filter === "all" ? "border-[#145C14] ring-2 ring-[#145C14]/20" : "border-gray-100 dark:border-gray-700"
        )}>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{departments.length}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">Total Departments</p>
        </button>
        <button onClick={() => setFilter("withMembers")} className={cn(
          "bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-4 text-center transition-all hover:shadow-md",
          filter === "withMembers" ? "border-[#145C14] ring-2 ring-[#145C14]/20" : "border-gray-100 dark:border-gray-700"
        )}>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalMembers}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">Members Assigned</p>
        </button>
        <button onClick={() => setFilter("withHod")} className={cn(
          "bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-4 text-center transition-all hover:shadow-md",
          filter === "withHod" ? "border-[#145C14] ring-2 ring-[#145C14]/20" : "border-gray-100 dark:border-gray-700"
        )}>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{withHodCount}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">With HOD</p>
        </button>
      </div>

      {filter !== "all" && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <p className="text-sm text-blue-700 font-medium">
            Showing departments {filter === "withMembers" ? "with members assigned" : "with an HOD"}
          </p>
          <button onClick={() => setFilter("all")} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition">Clear filter</button>
        </div>
      )}

      <div className="flex gap-4 min-h-[60vh]">
        <div className={cn("flex flex-col gap-3", selected ? "hidden md:flex md:w-72 flex-shrink-0" : "w-full")}>
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300"/></div>
          ) : filteredDepartments.length === 0 ? (
            <div className="flex flex-col items-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <Layers size={36} className="text-gray-200 mb-3"/>
              <p className="font-semibold text-gray-400 text-sm">No departments match this filter</p>
            </div>
          ) : filteredDepartments.map(d => (
            <button key={d.id} onClick={() => selectDept(d)}
              className={cn(
                "w-full text-left bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-4 transition-all hover:shadow-md",
                selected?.id === d.id ? "border-[#145C14] ring-2 ring-[#145C14]/20" : "border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:border-gray-600"
              )}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#145C14]/10 flex items-center justify-center flex-shrink-0">
                  <Layers size={18} className="text-[#145C14]"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{d.name}</p>
                  {d.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{d.description}</p>}
                </div>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1"/>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <Users size={11}/> {d.memberCount} members
                </span>
                {d.hod && (
                  <span className="text-xs text-gray-400 truncate">
                    HOD: {d.hod.firstName} {d.hod.lastName}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/40">
              <div className="flex items-center gap-2">
                <button onClick={() => selectDept(null)} className="md:hidden text-gray-400 hover:text-gray-600 dark:text-gray-400 transition">
                  <ChevronRight size={14} className="rotate-180"/>
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 dark:text-white">{selected.name}</p>
                    <button onClick={() => setShowEdit(true)} title="Edit department"
                      className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition">
                      <Edit2 size={11}/>
                    </button>
                    <button
                      onClick={() => { if (confirm(`Remove "${selected.name}"? Members keep their history; the department will no longer appear in lists.`)) deleteDept.mutate(selected.id); }}
                      disabled={deleteDept.isPending}
                      title="Delete department"
                      className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50">
                      <Trash2 size={11}/>
                    </button>
                  </div>
                  {selected.hod && <p className="text-xs text-gray-400 mt-0.5">HOD: {selected.hod.firstName} {selected.hod.lastName}</p>}
                </div>
              </div>
              <span className="bg-[#145C14]/10 text-[#145C14] text-xs font-bold px-2.5 py-1 rounded-full">{members.length} members</span>
            </div>

            {selected.description && (
              <div className="px-5 py-3 border-b border-gray-50 bg-blue-50/40">
                <p className="text-xs text-gray-600 dark:text-gray-400">{selected.description}</p>
              </div>
            )}

            <div className="px-5 py-3 border-b border-gray-50">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search members in this department…"
                  className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#145C14] placeholder-gray-400 dark:placeholder-gray-500"/>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {mLoading ? (
                <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300"/></div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-gray-400">
                  <Users size={28} className="mb-2 text-gray-200"/>
                  <p className="text-sm font-medium">{memberSearch ? "No members match your search" : "No members in this department yet"}</p>
                  {!memberSearch && <p className="text-xs mt-1">Use the form below to add members</p>}
                </div>
              ) : filtered.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/30 transition-colors group">
                  <Link href={`/members/${m.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#145C14]/10 flex items-center justify-center text-[#145C14] text-xs font-bold flex-shrink-0">
                      {getInitials(m.firstName, m.lastName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate hover:text-[#145C14] transition">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-gray-400">{m.memberId} · {m.phone}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {m.workerStatus !== "NONE" && (
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", WORKER_COLORS[m.workerStatus] || "bg-gray-100 text-gray-600")}>
                        {m.workerStatus.replace(/_/g," ")}
                      </span>
                    )}
                    <button onClick={() => remove.mutate(m.id)} disabled={remove.isPending} title="Remove from department"
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-all disabled:opacity-30">
                      <UserMinus size={12}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <AddMemberPanel deptId={selected.id} onAdded={() => { refetchMembers(); qc.invalidateQueries({ queryKey: ["departments"] }); }} />
          </div>
        )}
      </div>

      {showAdd && <AddDeptModal onClose={() => setShowAdd(false)}/>}
      {showEdit && selected && <EditDeptModal dept={selected} onClose={() => setShowEdit(false)}/>}
    </div>
  );
}

export default function DepartmentsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
    }>
      <DepartmentsPageContent />
    </Suspense>
  );
}
