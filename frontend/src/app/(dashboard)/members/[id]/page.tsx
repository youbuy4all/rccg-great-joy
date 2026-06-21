"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, Shield,
  BookOpen, Home, Briefcase, Edit2, Loader2, CheckCircle, XCircle,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Member {
  id: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  phone: string;
  phone2?: string;
  email?: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth?: string;
  address?: string;
  status: string;
  workerStatus: string;
  baptismStatus: string;
  baptismDate?: string;
  foundationSchool: boolean;
  isFirstTimer: boolean;
  isNewConvert: boolean;
  convertDate?: string;
  zone?: string;
  area?: string;
  joinedDate?: string;
  notes?: string;
  department?: { id: string; name: string };
  houseFellowship?: { id: string; name: string };
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : "—";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:         "bg-green-100 text-green-800",
  INACTIVE:       "bg-gray-100 text-gray-600",
  VISITOR:        "bg-blue-100 text-blue-800",
  NEW_CONVERT:    "bg-yellow-100 text-yellow-800",
  TRANSFERRED_IN: "bg-purple-100 text-purple-800",
};

const WORKER_COLORS: Record<string, string> = {
  NONE:               "bg-gray-100 text-gray-500",
  WORKER_IN_TRAINING: "bg-amber-100 text-amber-800",
  WORKER:             "bg-blue-100 text-blue-800",
  DEPARTMENT_HEAD:    "bg-indigo-100 text-indigo-800",
  PASTOR:             "bg-[#145C14]/10 text-[#145C14]",
};

const fmtStatus  = (s: string) => s.replace(/_/g, " ");
const initials   = (m: Member) =>
  `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase();

// ─── Sub-components ───────────────────────────────────────────────────────────
const Card = ({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50">
      <div className="w-7 h-7 rounded-lg bg-[#145C14]/10 flex items-center justify-center">
        <Icon size={14} className="text-[#145C14]" />
      </div>
      <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const Row = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="flex justify-between items-start py-2.5 border-b border-gray-50 last:border-0">
    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-36 shrink-0">{label}</span>
    <span className="text-sm font-semibold text-gray-800 text-right">{value || "—"}</span>
  </div>
);

const Badge = ({ label, colorCls }: { label: string; colorCls: string }) => (
  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold", colorCls)}>
    {fmtStatus(label)}
  </span>
);

const BoolBadge = ({ value, label }: { value: boolean; label: string }) => (
  <div className="flex items-center gap-2">
    {value
      ? <CheckCircle size={15} className="text-[#145C14]" />
      : <XCircle size={15} className="text-gray-300" />}
    <span className={cn("text-sm font-semibold", value ? "text-gray-800" : "text-gray-400")}>{label}</span>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const { data: member, isLoading, isError } = useQuery<Member>({
    queryKey: ["member", id],
    queryFn:  () => api.get(`/members/${id}`).then(r => r.data),
    enabled:  !!id,
  });

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#145C14]" />
          <p className="text-sm font-semibold text-gray-500">Loading member profile…</p>
        </div>
      </div>
    );
  }

  // ── Error / not found ──
  if (isError || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-red-400" />
          </div>
          <h2 className="font-bold text-gray-800 text-lg mb-1">Member not found</h2>
          <p className="text-gray-400 text-sm mb-6">This member may have been removed or the link is invalid.</p>
          <button
            onClick={() => router.push("/members")}
            className="px-5 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition"
          >
            Back to Members
          </button>
        </div>
      </div>
    );
  }

  const fullName = [member.firstName, member.otherNames, member.lastName].filter(Boolean).join(" ");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* ── Back nav ── */}
      <button
        onClick={() => router.push("/members")}
        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#145C14] transition"
      >
        <ArrowLeft size={16} />
        Back to Members
      </button>

      {/* ── Profile header ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-[#145C14] flex items-center justify-center shrink-0">
            <span className="text-white text-2xl font-bold font-serif">{initials(member)}</span>
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <h1 className="font-serif font-bold text-gray-900 text-2xl leading-tight">{fullName}</h1>
            <p className="text-gray-400 text-sm mt-0.5 mb-3">{member.email || "No email on record"}</p>
            <div className="flex flex-wrap gap-2">
              <Badge label={member.status}       colorCls={STATUS_COLORS[member.status]  ?? "bg-gray-100 text-gray-600"} />
              <Badge label={member.workerStatus} colorCls={WORKER_COLORS[member.workerStatus] ?? "bg-gray-100 text-gray-500"} />
              {member.gender === "MALE"
                ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">Male</span>
                : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-800">Female</span>
              }
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={() => router.push(`/members/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:border-[#145C14] hover:text-[#145C14] transition shrink-0"
          >
            <Edit2 size={14} />
            Edit
          </button>
        </div>

        {/* Quick stats strip */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-50">
          {[
            { label: "Date Joined",  value: fmt(member.joinedDate) },
            { label: "Date of Birth",value: fmt(member.dateOfBirth) },
            { label: "Phone",        value: member.phone },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm font-bold text-gray-800">{value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two column layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Personal Info */}
        <Card title="Personal Info" icon={User}>
          <div className="space-y-0">
            <Row label="Full Name"  value={fullName} />
            <Row label="Phone"      value={member.phone} />
            <Row label="Alt. Phone" value={member.phone2} />
            <Row label="Email"      value={member.email} />
            <Row label="Gender"     value={member.gender === "MALE" ? "Male" : "Female"} />
            <Row label="Birthday"   value={fmt(member.dateOfBirth)} />
            <Row label="Address"    value={member.address} />
          </div>
        </Card>

        {/* RCCG Details */}
        <Card title="RCCG Details" icon={Shield}>
          <div className="space-y-0">
            <Row label="Status"
              value={<Badge label={member.status} colorCls={STATUS_COLORS[member.status] ?? "bg-gray-100 text-gray-600"} />}
            />
            <Row label="Worker Status"
              value={<Badge label={member.workerStatus} colorCls={WORKER_COLORS[member.workerStatus] ?? "bg-gray-100 text-gray-500"} />}
            />
            <Row label="Baptism"
              value={
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                  member.baptismStatus === "BAPTISED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                )}>
                  {fmtStatus(member.baptismStatus)}
                </span>
              }
            />
            <Row label="Baptism Date" value={fmt(member.baptismDate)} />
            <Row label="Zone"         value={member.zone} />
            <Row label="Area"         value={member.area} />
            <Row label="Date Joined"  value={fmt(member.joinedDate)} />
          </div>
        </Card>

        {/* Ministry */}
        <Card title="Ministry & Fellowship" icon={Home}>
          <div className="space-y-0">
            <Row label="Department"
              value={member.department?.name}
            />
            <Row label="House Fellowship"
              value={member.houseFellowship?.name}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
            <BoolBadge value={member.foundationSchool} label="Completed Foundation School" />
            <BoolBadge value={member.isFirstTimer}     label="First Timer" />
            <BoolBadge value={member.isNewConvert}     label="New Convert" />
          </div>
        </Card>

        {/* Notes */}
        <Card title="Notes" icon={BookOpen}>
          {member.notes ? (
            <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
              {member.notes}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">No notes added for this member.</p>
          )}
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-400 font-medium">
              Record created {fmt(member.createdAt)}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
