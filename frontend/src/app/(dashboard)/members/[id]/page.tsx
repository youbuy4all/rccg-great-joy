"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Phone, Mail, MapPin, Calendar, Users,
  Home as HomeIcon, Layers, CheckCircle, XCircle, HandCoins,
  CalendarCheck, TrendingUp, Pencil,
} from "lucide-react";
import api from "@/lib/api";
import { cn, formatCurrency, formatDate, getInitials, formatCategory } from "@/lib/utils";

interface MemberDetail {
  id: string; memberId: string; firstName: string; lastName: string; otherNames?: string;
  phone: string; phone2?: string; email?: string; gender: string; dateOfBirth?: string;
  weddingAnniversary?: string; profilePhoto?: string; address?: string; status: string;
  workerStatus: string; baptismStatus: string; baptismDate?: string;
  foundationSchool: boolean; isFirstTimer: boolean; isNewConvert: boolean;
  zone?: string; joinedDate: string;
  department?:      { id: string; name: string };
  houseFellowship?: { id: string; name: string };
  user?: { id: string; email: string; role: string; lastLoginAt?: string };
}

interface AttendanceData {
  records: { id: string; present: boolean; session: { serviceDate: string; serviceType: string; preacher?: string } }[];
  summary: { present: number; absent: number; total: number; rate: number };
}

interface GivingData {
  transactions: { id: string; reference: string; incomeCategory: string; amount: number; transactionDate: string; paymentMethod: string }[];
  summary: Record<string, number>;
  total: number;
}

const STATUS_COLORS: Record<string,string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", INACTIVE: "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
  VISITOR: "bg-blue-100 text-blue-700", NEW_CONVERT: "bg-yellow-100 text-yellow-700",
  TRANSFERRED_IN: "bg-purple-100 text-purple-700", TRANSFERRED_OUT: "bg-red-100 text-red-600",
};

const WORKER_COLORS: Record<string,string> = {
  WORKER_IN_TRAINING: "bg-sky-100 text-sky-700", WORKER: "bg-indigo-100 text-indigo-700",
  DEPARTMENT_HEAD: "bg-orange-100 text-orange-700", PASTOR: "bg-purple-100 text-purple-700",
};

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "attendance" | "giving">("overview");

  const { data: member, isLoading } = useQuery<MemberDetail>({
    queryKey: ["member", id],
    queryFn:  () => api.get(`/members/${id}`).then(r => r.data),
  });

  const { data: attendance } = useQuery<AttendanceData>({
    queryKey: ["member-attendance", id],
    queryFn:  () => api.get(`/members/${id}/attendance`).then(r => r.data),
    enabled:  tab === "attendance",
  });

  const { data: giving } = useQuery<GivingData>({
    queryKey: ["member-giving", id],
    queryFn:  () => api.get(`/members/${id}/giving`).then(r => r.data),
    enabled:  tab === "giving",
  });

  if (isLoading) {
    return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-gray-300" /></div>;
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center py-24 text-gray-400">
        <Users size={36} className="mb-3 text-gray-200" />
        <p className="font-semibold text-sm">Member not found</p>
        <button onClick={() => router.push("/members")} className="mt-3 text-sm font-bold text-[#145C14] dark:text-green-400 hover:underline">
          Back to Members
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back link + Edit button */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/members")}
          className="flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 transition">
          <ArrowLeft size={15} /> Back to Members
        </button>
        <button onClick={() => router.push(`/members/${id}/edit`)}
          className="flex items-center gap-1.5 text-sm font-bold px-3.5 py-2 rounded-xl bg-[#145C14] text-white hover:bg-[#0A3D0A] transition shadow-sm">
          <Pencil size={13} /> Edit Member
        </button>
      </div>

      {/* Profile header card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#145C14]/10 flex items-center justify-center text-[#145C14] dark:text-green-400 font-bold text-xl flex-shrink-0">
            {getInitials(member.firstName, member.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif font-bold text-gray-900 dark:text-white text-xl">{member.firstName} {member.lastName}</h1>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_COLORS[member.status] ?? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400")}>
                {member.status.replace(/_/g," ")}
              </span>
              {member.workerStatus !== "NONE" && (
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", WORKER_COLORS[member.workerStatus])}>
                  {member.workerStatus.replace(/_/g," ")}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm font-mono mt-1">{member.memberId}</p>

            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400"><Phone size={13} className="text-gray-400" /> {member.phone}</span>
              {member.email && <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400"><Mail size={13} className="text-gray-400" /> {member.email}</span>}
              {member.address && <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400"><MapPin size={13} className="text-gray-400" /> {member.address}</span>}
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400"><Calendar size={13} className="text-gray-400" /> Joined {formatDate(member.joinedDate)}</span>
            </div>
          </div>
        </div>

        {/* Cross-module links: Department & House Fellowship */}
        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-gray-50">
          {member.department ? (
            <Link href={`/departments?id=${member.department.id}`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 text-sm font-bold hover:bg-purple-100 transition">
              <Layers size={14} /> {member.department.name}
            </Link>
          ) : (
            <span className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-400 text-sm font-medium">
              <Layers size={14} /> No department
            </span>
          )}
          {member.houseFellowship ? (
            <Link href={`/house-fellowship?id=${member.houseFellowship.id}`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm font-bold hover:bg-teal-100 transition">
              <HomeIcon size={14} /> {member.houseFellowship.name}
            </Link>
          ) : (
            <span className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-400 text-sm font-medium">
              <HomeIcon size={14} /> No house fellowship
            </span>
          )}
          <span className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium">
            {member.baptismStatus === "BAPTISED"
              ? <CheckCircle size={14} className="text-green-500" />
              : <XCircle size={14} className="text-gray-300" />}
            {member.baptismStatus === "BAPTISED" ? `Baptised${member.baptismDate ? " " + formatDate(member.baptismDate) : ""}` : "Not Baptised"}
          </span>
          {member.foundationSchool && (
            <span className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-bold">
              <CheckCircle size={14} /> Foundation School
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit">
        {[
          { key: "overview",   label: "Overview"   },
          { key: "attendance", label: "Attendance" },
          { key: "giving",     label: "Giving"     },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition",
              tab === t.key ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Personal Details</p>
            <div className="space-y-2.5 text-sm">
              {[
                ["Gender", member.gender === "MALE" ? "Male" : "Female"],
                ["Date of Birth", member.dateOfBirth ? formatDate(member.dateOfBirth) : "—"],
                ["Zone", member.zone || "—"],
                ["Phone (alt)", member.phone2 || "—"],
                ["New Convert", member.isNewConvert ? "Yes" : "No"],
                ["First Timer", member.isFirstTimer ? "Yes" : "No"],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-400">{k}</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {member.user && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">System Access</p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Email</span><span className="font-semibold text-gray-800 dark:text-gray-200">{member.user.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Role</span><span className="font-semibold text-gray-800 dark:text-gray-200">{member.user.role}</span></div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Login</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{member.user.lastLoginAt ? formatDate(member.user.lastLoginAt) : "Never"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance tab */}
      {tab === "attendance" && (
        <div className="space-y-4">
          {attendance && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Present",       value: attendance.summary.present, cls: "text-green-600 dark:text-green-400" },
                { label: "Absent",        value: attendance.summary.absent,  cls: "text-red-500"    },
                { label: "Total Sessions",value: attendance.summary.total,   cls: "text-gray-900 dark:text-white"    },
                { label: "Attendance Rate",value: `${attendance.summary.rate}%`, cls: "text-[#145C14] dark:text-green-400" },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-3 py-3 text-center">
                  <p className={cn("text-xl font-bold", s.cls)}>{s.value}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {!attendance ? (
              <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
            ) : attendance.records.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400">
                <CalendarCheck size={28} className="mb-2 text-gray-200" />
                <p className="text-sm font-medium">No attendance records yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {attendance.records.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", r.present ? "bg-green-500" : "bg-red-400")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCategory(r.session.serviceType)}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.session.serviceDate)} {r.session.preacher && `· ${r.session.preacher}`}</p>
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

      {/* Giving tab */}
      {tab === "giving" && (
        <div className="space-y-4">
          {giving && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Giving (All Time)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(giving.total)}</p>
              </div>
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {!giving ? (
              <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
            ) : giving.transactions.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400">
                <HandCoins size={28} className="mb-2 text-gray-200" />
                <p className="text-sm font-medium">No giving records yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {giving.transactions.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCategory(t.incomeCategory)}</p>
                      <p className="text-xs text-gray-400">{formatDate(t.transactionDate)} · {t.reference}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
