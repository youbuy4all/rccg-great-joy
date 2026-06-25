"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Phone, Mail, MapPin, Calendar, Users,
  Home as HomeIcon, Layers, CheckCircle, XCircle, HandCoins,
  CalendarCheck, TrendingUp, Edit2, X,
} from "lucide-react";
import api from "@/lib/api";
import { cn, formatCurrency, formatDate, getInitials, formatCategory } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MemberDetail {
  id: string; memberId: string; firstName: string; lastName: string; otherNames?: string;
  phone: string; phone2?: string; email?: string; gender: string; dateOfBirth?: string;
  weddingAnniversary?: string; address?: string; status: string;
  workerStatus: string; baptismStatus: string; baptismDate?: string;
  foundationSchool: boolean; isFirstTimer: boolean; isNewConvert: boolean;
  zone?: string; area?: string; joinedDate: string; notes?: string;
  department?:      { id: string; name: string };
  houseFellowship?: { id: string; name: string };
  user?: { id: string; email: string; role: string; lastLoginAt?: string };
}

const STATUS_COLORS: Record<string,string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  INACTIVE: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  VISITOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  NEW_CONVERT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  TRANSFERRED_IN: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  TRANSFERRED_OUT: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

const WORKER_COLORS: Record<string,string> = {
  WORKER_IN_TRAINING: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
  WORKER: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
  DEPARTMENT_HEAD: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  PASTOR: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
};

// ─── Edit schema ──────────────────────────────────────────────────────────────
const editSchema = z.object({
  firstName:         z.string().min(1, "Required"),
  lastName:          z.string().min(1, "Required"),
  otherNames:        z.string().optional(),
  phone:             z.string().min(7, "Required"),
  phone2:            z.string().optional(),
  email:             z.string().email().optional().or(z.literal("")),
  gender:            z.enum(["MALE", "FEMALE"]),
  dateOfBirth:       z.string().optional(),
  address:           z.string().optional(),
  status:            z.string(),
  workerStatus:      z.string(),
  baptismStatus:     z.string(),
  baptismDate:       z.string().optional(),
  foundationSchool:  z.boolean().optional(),
  isNewConvert:      z.boolean().optional(),
  isFirstTimer:      z.boolean().optional(),
  zone:              z.string().optional(),
  area:              z.string().optional(),
  joinedDate:        z.string().optional(),
  departmentId:      z.string().optional(),
  houseFellowshipId: z.string().optional(),
  notes:             z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

const inp = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 transition";

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditMemberModal({ member, onClose, onSaved }: {
  member: MemberDetail; onClose: () => void; onSaved: () => void;
}) {
  const [apiErr, setApiErr] = useState("");

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["departments"],
    queryFn:  () => api.get("/departments").then(r => r.data),
  });
  const { data: fellowships = [] } = useQuery<any[]>({
    queryKey: ["hfs"],
    queryFn:  () => api.get("/house-fellowship").then(r => r.data),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName:         member.firstName,
      lastName:          member.lastName,
      otherNames:        member.otherNames || "",
      phone:             member.phone,
      phone2:            member.phone2 || "",
      email:             member.email || "",
      gender:            member.gender as "MALE" | "FEMALE",
      dateOfBirth:       member.dateOfBirth ? member.dateOfBirth.split("T")[0] : "",
      address:           member.address || "",
      status:            member.status,
      workerStatus:      member.workerStatus,
      baptismStatus:     member.baptismStatus,
      baptismDate:       member.baptismDate ? member.baptismDate.split("T")[0] : "",
      foundationSchool:  member.foundationSchool,
      isNewConvert:      member.isNewConvert,
      isFirstTimer:      member.isFirstTimer,
      zone:              member.zone || "",
      area:              member.area || "",
      joinedDate:        member.joinedDate ? member.joinedDate.split("T")[0] : "",
      departmentId:      member.department?.id || "",
      houseFellowshipId: member.houseFellowship?.id || "",
      notes:             member.notes || "",
    },
  });

  const save = useMutation({
    mutationFn: (d: EditForm) => {
      const payload: any = { ...d };
      if (!payload.departmentId)      delete payload.departmentId;
      if (!payload.houseFellowshipId) delete payload.houseFellowshipId;
      if (!payload.dateOfBirth)       delete payload.dateOfBirth;
      if (!payload.baptismDate)       delete payload.baptismDate;
      if (!payload.joinedDate)        delete payload.joinedDate;
      return api.patch(`/members/${member.id}`, payload);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError:   (e: any) => setApiErr(e?.response?.data?.message || "Failed to save changes"),
  });

  const field = (label: string, name: keyof EditForm, opts?: any) => (
    <div>
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      <input {...register(name)} {...opts} className={cn(inp, (errors as any)[name] && "border-red-400")} />
      {(errors as any)[name] && <p className="mt-1 text-xs text-red-600">{(errors as any)[name]?.message}</p>}
    </div>
  );

  const sel = (label: string, name: keyof EditForm, children: React.ReactNode) => (
    <div>
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      <select {...register(name)} className={inp}>{children}</select>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 rounded-t-2xl">
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Edit Member — {member.firstName} {member.lastName}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition"><X size={14}/></button>
        </div>

        <form onSubmit={handleSubmit(d => save.mutate(d))} className="p-6 space-y-5">
          {/* Personal */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Personal Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {field("First Name *", "firstName")}
              {field("Last Name *",  "lastName")}
              {field("Other Names",  "otherNames")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {field("Phone Number *", "phone",  { type:"tel" })}
              {field("Phone 2",        "phone2", { type:"tel" })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {field("Email", "email", { type:"email" })}
              {sel("Gender *", "gender", <>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </>)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {field("Date of Birth", "dateOfBirth", { type:"date" })}
              {field("Date Joined",   "joinedDate",  { type:"date" })}
            </div>
            <div className="mt-3">
              {field("Home Address", "address", { placeholder:"Street, City" })}
            </div>
          </div>

          {/* Church Status */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Church Status</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sel("Member Status", "status", <>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="VISITOR">Visitor</option>
                <option value="NEW_CONVERT">New Convert</option>
                <option value="TRANSFERRED_IN">Transferred In</option>
                <option value="TRANSFERRED_OUT">Transferred Out</option>
              </>)}
              {sel("Worker Status", "workerStatus", <>
                <option value="NONE">None</option>
                <option value="WORKER_IN_TRAINING">Worker in Training</option>
                <option value="WORKER">Worker</option>
                <option value="DEPARTMENT_HEAD">Department Head (HOD)</option>
                <option value="PASTOR">Pastor</option>
              </>)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {sel("Baptism Status", "baptismStatus", <>
                <option value="NOT_BAPTISED">Not Baptised</option>
                <option value="BAPTISED">Baptised</option>
              </>)}
              {field("Baptism Date", "baptismDate", { type:"date" })}
            </div>
          </div>

          {/* Church Placement */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Church Placement</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sel("Department", "departmentId", <>
                <option value="">— None —</option>
                {departments.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </>)}
              {sel("House Fellowship", "houseFellowshipId", <>
                <option value="">— None —</option>
                {fellowships.map((h:any) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </>)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {field("Zone", "zone", { placeholder:"e.g. Ark Of God" })}
              {field("Area", "area", { placeholder:"e.g. Glory Chapel" })}
            </div>
          </div>

          {/* Flags */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Other Details</p>
            <div className="flex flex-wrap gap-5">
              {[
                ["foundationSchool", "Completed Foundation School"],
                ["isNewConvert",     "New Convert"],
                ["isFirstTimer",     "First Timer"],
              ].map(([name, label]) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer">
                  <input {...register(name as keyof EditForm)} type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-[#145C14] focus:ring-[#145C14]" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Notes</label>
              <textarea {...register("notes")} rows={2} placeholder="Any additional notes…"
                className={cn(inp, "resize-none")} />
            </div>
          </div>

          {apiErr && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">{apiErr}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
            <button type="submit" disabled={save.isPending}
              className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70 flex items-center justify-center gap-2">
              {save.isPending ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const [tab,      setTab]      = useState<"overview"|"attendance"|"giving">("overview");
  const [showEdit, setShowEdit] = useState(false);

  const { data: member, isLoading, refetch } = useQuery<MemberDetail>({
    queryKey: ["member", id],
    queryFn:  () => api.get(`/members/${id}`).then(r => r.data),
  });

  const { data: attendance } = useQuery<any>({
    queryKey: ["member-attendance", id],
    queryFn:  () => api.get(`/members/${id}/attendance`).then(r => r.data),
    enabled:  tab === "attendance",
  });

  const { data: giving } = useQuery<any>({
    queryKey: ["member-giving", id],
    queryFn:  () => api.get(`/members/${id}/giving`).then(r => r.data),
    enabled:  tab === "giving",
  });

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-gray-300"/></div>;
  if (!member) return (
    <div className="flex flex-col items-center py-24 text-gray-400 dark:text-gray-500">
      <Users size={36} className="mb-3 text-gray-200 dark:text-gray-700"/>
      <p className="font-semibold text-sm">Member not found</p>
      <button onClick={() => router.push("/members")} className="mt-3 text-sm font-bold text-[#145C14] dark:text-green-400 hover:underline">Back to Members</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => router.push("/members")}
        className="flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
        <ArrowLeft size={15}/> Back to Members
      </button>

      {/* Profile card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#145C14]/10 dark:bg-[#145C14]/20 flex items-center justify-center text-[#145C14] dark:text-green-400 font-bold text-xl flex-shrink-0">
            {getInitials(member.firstName, member.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif font-bold text-gray-900 dark:text-white text-xl">{member.firstName} {member.lastName}{member.otherNames ? ` ${member.otherNames}` : ""}</h1>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_COLORS[member.status] ?? "bg-gray-100 text-gray-500")}>
                {member.status.replace(/_/g," ")}
              </span>
              {member.workerStatus !== "NONE" && (
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", WORKER_COLORS[member.workerStatus])}>
                  {member.workerStatus.replace(/_/g," ")}
                </span>
              )}
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-sm font-mono mt-1">{member.memberId}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><Phone size={13} className="text-gray-400 dark:text-gray-500"/> {member.phone}</span>
              {member.email && <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><Mail size={13} className="text-gray-400 dark:text-gray-500"/> {member.email}</span>}
              {member.address && <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><MapPin size={13} className="text-gray-400 dark:text-gray-500"/> {member.address}</span>}
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><Calendar size={13} className="text-gray-400 dark:text-gray-500"/> Joined {formatDate(member.joinedDate)}</span>
            </div>
          </div>
          {/* Edit button */}
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145C14]/10 dark:bg-[#145C14]/20 text-[#145C14] dark:text-green-400 text-sm font-bold hover:bg-[#145C14]/20 dark:hover:bg-[#145C14]/30 transition flex-shrink-0">
            <Edit2 size={14}/> Edit Member
          </button>
        </div>

        {/* Cross-module links */}
        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-gray-50 dark:border-gray-700">
          {member.department ? (
            <Link href={`/departments?id=${member.department.id}`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">
              <Layers size={14}/> {member.department.name}
            </Link>
          ) : (
            <span className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-medium">
              <Layers size={14}/> No department
            </span>
          )}
          {member.houseFellowship ? (
            <Link href={`/house-fellowship?id=${member.houseFellowship.id}`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-sm font-bold hover:bg-teal-100 dark:hover:bg-teal-900/50 transition">
              <HomeIcon size={14}/> {member.houseFellowship.name}
            </Link>
          ) : (
            <span className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-medium">
              <HomeIcon size={14}/> No house fellowship
            </span>
          )}
          <span className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium">
            {member.baptismStatus === "BAPTISED"
              ? <CheckCircle size={14} className="text-green-500"/>
              : <XCircle    size={14} className="text-gray-300 dark:text-gray-600"/>}
            {member.baptismStatus === "BAPTISED" ? `Baptised${member.baptismDate ? " " + formatDate(member.baptismDate) : ""}` : "Not Baptised"}
          </span>
          {member.foundationSchool && (
            <span className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-bold">
              <CheckCircle size={14}/> Foundation School
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 w-fit">
        {[{key:"overview",label:"Overview"},{key:"attendance",label:"Attendance"},{key:"giving",label:"Giving"}].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition",
              tab===t.key ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Personal Details</p>
            <div className="space-y-2.5 text-sm">
              {[
                ["Gender",       member.gender === "MALE" ? "Male" : "Female"],
                ["Date of Birth",member.dateOfBirth ? formatDate(member.dateOfBirth) : "—"],
                ["Zone",         member.zone || "—"],
                ["Area",         member.area || "—"],
                ["Phone (alt)",  member.phone2 || "—"],
                ["New Convert",  member.isNewConvert ? "Yes" : "No"],
                ["First Timer",  member.isFirstTimer ? "Yes" : "No"],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-400 dark:text-gray-500">{k}</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {member.user && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">System Access</p>
              <div className="space-y-2.5 text-sm">
                {[
                  ["Email",      member.user.email],
                  ["Role",       member.user.role],
                  ["Last Login", member.user.lastLoginAt ? formatDate(member.user.lastLoginAt) : "Never"],
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-400 dark:text-gray-500">{k}</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {member.notes && (
            <div className="sm:col-span-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-300">
              {member.notes}
            </div>
          )}
        </div>
      )}

      {/* Attendance */}
      {tab === "attendance" && (
        <div className="space-y-4">
          {attendance && (
            <div className="grid grid-cols-4 gap-3">
              {[
                {label:"Present",        value:attendance.summary?.present,  cls:"text-green-600 dark:text-green-400"},
                {label:"Absent",         value:attendance.summary?.absent,   cls:"text-red-500 dark:text-red-400"},
                {label:"Total Sessions", value:attendance.summary?.total,    cls:"text-gray-900 dark:text-white"},
                {label:"Attendance Rate",value:`${attendance.summary?.rate ?? 0}%`, cls:"text-[#145C14] dark:text-green-400"},
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-3 py-3 text-center">
                  <p className={cn("text-xl font-bold", s.cls)}>{s.value}</p>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {!attendance ? (
              <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300"/></div>
            ) : !attendance.records?.length ? (
              <div className="flex flex-col items-center py-12 text-gray-400 dark:text-gray-500">
                <CalendarCheck size={28} className="mb-2 text-gray-200 dark:text-gray-700"/>
                <p className="text-sm font-medium">No attendance records yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {attendance.records.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", r.present ? "bg-green-500" : "bg-red-400")}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCategory(r.session.serviceType)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(r.session.serviceDate)}{r.session.preacher ? ` · ${r.session.preacher}` : ""}</p>
                    </div>
                    <span className={cn("text-xs font-bold", r.present ? "text-green-600 dark:text-green-400" : "text-red-400")}>
                      {r.present ? "Present" : "Absent"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Giving */}
      {tab === "giving" && (
        <div className="space-y-4">
          {giving && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={20} className="text-green-600 dark:text-green-400"/>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Giving (All Time)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(giving.total ?? 0)}</p>
              </div>
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {!giving ? (
              <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300"/></div>
            ) : !giving.transactions?.length ? (
              <div className="flex flex-col items-center py-12 text-gray-400 dark:text-gray-500">
                <HandCoins size={28} className="mb-2 text-gray-200 dark:text-gray-700"/>
                <p className="text-sm font-medium">No giving records yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {giving.transactions.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCategory(t.incomeCategory)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(t.transactionDate)} · {t.reference}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <EditMemberModal
          member={member}
          onClose={() => setShowEdit(false)}
          onSaved={() => { refetch(); qc.invalidateQueries({ queryKey: ["members"] }); }}
        />
      )}
    </div>
  );
}
