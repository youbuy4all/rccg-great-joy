"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, Loader2, X, Users, MapPin, Calendar, ChevronRight, Home, Search } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { cn, getInitials } from "@/lib/utils";

interface HouseFellowship {
  id: string; name: string; zone?: string; address?: string;
  meetingDay?: string; meetingTime?: string; memberCount: number;
}
interface HFMember {
  id: string; memberId: string; firstName: string; lastName: string;
  phone: string; gender: string; workerStatus: string; status: string;
}

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const inp  = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent placeholder-gray-400 transition";

const schema = z.object({
  name:        z.string().min(2, "Name required"),
  zone:        z.string().optional(),
  address:     z.string().optional(),
  meetingDay:  z.string().optional(),
  meetingTime: z.string().optional(),
});
type Form = z.infer<typeof schema>;

function AddHFModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [err2, setErr2] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });
  const create = useMutation({
    mutationFn: (d: Form) => api.post("/house-fellowship", d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["hfs"] }); onClose(); },
    onError:    (e: any) => setErr2(e?.response?.data?.message || "Failed to create"),
  });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-serif font-bold text-gray-900 text-lg">Add House Fellowship</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><X size={14}/></button>
        </div>
        <form onSubmit={handleSubmit(d => create.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Fellowship Name *</label>
            <input {...register("name")} placeholder="e.g. Favour House Fellowship" className={cn(inp, errors.name && "border-red-400")} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Zone</label>
              <input {...register("zone")} placeholder="e.g. Zone A" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Meeting Day</label>
              <select {...register("meetingDay")} className={inp}>
                <option value="">Select day</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Meeting Time</label>
            <input {...register("meetingTime")} type="time" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
            <textarea {...register("address")} rows={2} placeholder="Meeting venue address…" className={cn(inp, "resize-none")} />
          </div>
          {err2 && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{err2}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70 flex items-center justify-center gap-2">
              {create.isPending ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const WORKER_COLORS: Record<string,string> = {
  WORKER_IN_TRAINING: "bg-sky-100 text-sky-700",
  WORKER:             "bg-indigo-100 text-indigo-700",
  DEPARTMENT_HEAD:    "bg-orange-100 text-orange-700",
  PASTOR:             "bg-purple-100 text-purple-700",
};

function HouseFellowshipPageContent() {
  const router       = useRouter();
  const pathname      = usePathname();
  const searchParams  = useSearchParams();

  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [showAdd,        setShowAdd]      = useState(false);
  const [memberSearch,   setMemberSearch] = useState("");
  const [zoneFilter,     setZoneFilter]   = useState("");
  const [hydrated,       setHydrated]     = useState(false);

  // Hydrate selected HF from URL (deep-link from Member profile)
  useEffect(() => {
    setSelectedId(searchParams.get("id") || null);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: hfs = [], isLoading } = useQuery<HouseFellowship[]>({
    queryKey: ["hfs"],
    queryFn:  () => api.get("/house-fellowship").then(r => r.data),
  });

  const selected = hfs.find(h => h.id === selectedId) || null;

  const selectHF = (hf: HouseFellowship | null) => {
    setSelectedId(hf?.id ?? null);
    setMemberSearch("");
    const qs = hf ? `?id=${hf.id}` : "";
    router.replace(`${pathname}${qs}`, { scroll: false });
  };

  const { data: members = [], isLoading: mLoading } = useQuery<HFMember[]>({
    queryKey: ["hf-members", selected?.id],
    queryFn:  () => api.get(`/house-fellowship/${selected!.id}/members`).then(r => r.data),
    enabled:  !!selected,
  });

  const totalMembers = hfs.reduce((sum, hf) => sum + hf.memberCount, 0);
  const zones = [...new Set(hfs.map(h => h.zone).filter(Boolean))] as string[];

  const filteredHfs = hfs.filter(h => !zoneFilter || h.zone === zoneFilter);
  const filtered = members.filter(m =>
    `${m.firstName} ${m.lastName} ${m.phone}`.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif font-bold text-gray-900 text-lg">House Fellowships</h2>
          <p className="text-gray-400 text-sm mt-0.5">{hfs.length} fellowships · {totalMembers} members</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition shadow-sm">
          <Plus size={15}/> Add Fellowship
        </button>
      </div>

      {/* Stats — Total resets zone filter, Zones cycles through available zones */}
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => setZoneFilter("")} className={cn(
          "bg-white rounded-2xl border shadow-sm p-4 text-center transition-all hover:shadow-md",
          zoneFilter === "" ? "border-[#145C14] ring-2 ring-[#145C14]/20" : "border-gray-100"
        )}>
          <p className="text-2xl font-bold text-gray-900">{hfs.length}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">Total Fellowships</p>
        </button>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalMembers}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">Total Members</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 text-center">Filter by Zone</p>
          <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}
            className="w-full text-sm font-bold text-gray-700 text-center bg-transparent outline-none cursor-pointer">
            <option value="">All Zones ({zones.length})</option>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
      </div>

      {zoneFilter && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <p className="text-sm text-blue-700 font-medium">Showing fellowships in {zoneFilter}</p>
          <button onClick={() => setZoneFilter("")} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition">Clear filter</button>
        </div>
      )}

      <div className="flex gap-4 min-h-[60vh]">
        <div className={cn("flex flex-col gap-3", selected ? "hidden md:flex md:w-72 flex-shrink-0" : "w-full")}>
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300"/></div>
          ) : filteredHfs.length === 0 ? (
            <div className="flex flex-col items-center py-16 bg-white rounded-2xl border border-gray-100">
              <Home size={36} className="text-gray-200 mb-3"/>
              <p className="font-semibold text-gray-400 text-sm">No house fellowships match this filter</p>
            </div>
          ) : filteredHfs.map(hf => (
            <button key={hf.id} onClick={() => selectHF(hf)}
              className={cn(
                "w-full text-left bg-white rounded-2xl border shadow-sm p-4 transition-all hover:shadow-md",
                selected?.id === hf.id ? "border-[#145C14] ring-2 ring-[#145C14]/20" : "border-gray-100 hover:border-gray-200"
              )}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#145C14]/10 flex items-center justify-center flex-shrink-0">
                  <Home size={18} className="text-[#145C14]"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{hf.name}</p>
                  {hf.zone && <p className="text-xs text-gray-400 font-medium mt-0.5">{hf.zone}</p>}
                </div>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1"/>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1 text-gray-500 font-medium"><Users size={11}/> {hf.memberCount} members</span>
                {hf.meetingDay && <span className="flex items-center gap-1 text-gray-500 font-medium"><Calendar size={11}/> {hf.meetingDay} {hf.meetingTime && `· ${hf.meetingTime}`}</span>}
                {hf.address && <span className="flex items-center gap-1 text-gray-400"><MapPin size={11}/> <span className="truncate max-w-[120px]">{hf.address}</span></span>}
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <div>
                <div className="flex items-center gap-2">
                  <button onClick={() => selectHF(null)} className="md:hidden text-gray-400 hover:text-gray-600 transition">
                    <ChevronRight size={14} className="rotate-180"/>
                  </button>
                  <p className="font-bold text-gray-900">{selected.name}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selected.zone && `${selected.zone} · `}
                  {selected.meetingDay && `Meets ${selected.meetingDay}`}
                  {selected.meetingTime && ` at ${selected.meetingTime}`}
                </p>
              </div>
              <span className="bg-[#145C14]/10 text-[#145C14] text-xs font-bold px-2.5 py-1 rounded-full">{members.length} members</span>
            </div>

            <div className="px-5 py-3 border-b border-gray-50">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search members…"
                  className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#145C14] placeholder-gray-400"/>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {mLoading ? (
                <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300"/></div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-gray-400">
                  <Users size={28} className="mb-2 text-gray-200"/>
                  <p className="text-sm font-medium">{memberSearch ? "No members match your search" : "No members in this fellowship"}</p>
                </div>
              ) : filtered.map(m => (
                <Link key={m.id} href={`/members/${m.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#145C14]/10 flex items-center justify-center text-[#145C14] text-xs font-bold flex-shrink-0">
                    {getInitials(m.firstName, m.lastName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate hover:text-[#145C14] transition">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-gray-400">{m.phone}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {m.workerStatus !== "NONE" && (
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", WORKER_COLORS[m.workerStatus] || "bg-gray-100 text-gray-600")}>
                        {m.workerStatus.replace(/_/g," ")}
                      </span>
                    )}
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", m.gender === "MALE" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600")}>
                      {m.gender === "MALE" ? "M" : "F"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {selected.address && (
              <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/40">
                <p className="text-xs text-gray-400 flex items-center gap-1.5"><MapPin size={11}/> {selected.address}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd && <AddHFModal onClose={() => setShowAdd(false)}/>}
    </div>
  );
}

export default function HouseFellowshipPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
    }>
      <HouseFellowshipPageContent />
    </Suspense>
  );
}
