"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

// ─── Schema (mirrors AddMemberModal) ─────────────────────────────────────────
const schema = z.object({
  firstName:         z.string().min(1, "Required"),
  lastName:          z.string().min(1, "Required"),
  otherNames:        z.string().optional(),
  phone:             z.string().min(10, "Enter a valid phone number"),
  phone2:            z.string().optional(),
  email:             z.string().email("Invalid email").optional().or(z.literal("")),
  gender:            z.enum(["MALE", "FEMALE"]),
  dateOfBirth:       z.string().optional(),
  address:           z.string().optional(),
  status:            z.string().default("ACTIVE"),
  workerStatus:      z.string().default("NONE"),
  ageGroup:          z.string().default("ADULT"),
  baptismStatus:     z.string().default("NOT_BAPTISED"),
  baptismDate:       z.string().optional(),
  foundationSchool:  z.boolean().default(false),
  isFirstTimer:      z.boolean().default(false),
  isNewConvert:      z.boolean().default(false),
  convertDate:       z.string().optional(),
  zone:              z.string().optional(),
  area:              z.string().optional(),
  houseFellowshipId: z.string().optional(),
  departmentId:      z.string().optional(),
  joinedDate:        z.string().optional(),
  notes:             z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toDateInput = (d?: string) => (d ? d.split("T")[0] : "");

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 " +
  "focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent placeholder-gray-400 transition";

const Field = ({
  label, error, children,
}: {
  label: string; error?: string; children: React.ReactNode;
}) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-2 border-t border-gray-100">
      {title}
    </h3>
    {children}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EditMemberPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();

  // Fetch existing member
  const { data: member, isLoading } = useQuery<any>({
    queryKey: ["member", id],
    queryFn:  () => api.get(`/members/${id}`).then(r => r.data),
    enabled:  !!id,
  });

  // Fetch departments & fellowships for dropdowns
  const { data: departments } = useQuery<any[]>({
    queryKey: ["departments"],
    queryFn:  () => api.get("/departments").then(r => r.data),
  });
  const { data: fellowships } = useQuery<any[]>({
    queryKey: ["fellowships"],
    queryFn:  () => api.get("/house-fellowship").then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Pre-fill form once member data arrives
  useEffect(() => {
    if (!member) return;
    reset({
      firstName:         member.firstName         ?? "",
      lastName:          member.lastName          ?? "",
      otherNames:        member.otherNames        ?? "",
      phone:             member.phone             ?? "",
      phone2:            member.phone2            ?? "",
      email:             member.email             ?? "",
      gender:            member.gender            ?? "MALE",
      dateOfBirth:       toDateInput(member.dateOfBirth),
      address:           member.address           ?? "",
      status:            member.status            ?? "ACTIVE",
      workerStatus:      member.workerStatus      ?? "NONE",
      ageGroup:          member.ageGroup          ?? "ADULT",
      baptismStatus:     member.baptismStatus     ?? "NOT_BAPTISED",
      baptismDate:       toDateInput(member.baptismDate),
      foundationSchool:  member.foundationSchool  ?? false,
      isFirstTimer:      member.isFirstTimer      ?? false,
      isNewConvert:      member.isNewConvert       ?? false,
      convertDate:       toDateInput(member.convertDate),
      zone:              member.zone              ?? "",
      area:              member.area              ?? "",
      houseFellowshipId: member.houseFellowship?.id ?? member.houseFellowshipId ?? "",
      departmentId:      member.department?.id    ?? member.departmentId        ?? "",
      joinedDate:        toDateInput(member.joinedDate),
      notes:             member.notes             ?? "",
    });
  }, [member, reset]);

  // Submit mutation
  const update = useMutation({
    mutationFn: (data: FormData) => {
      const clean: Record<string, any> = {};
      Object.entries(data).forEach(([k, v]) => {
        if (v === "" || v === null || v === undefined) return;
        clean[k] = v;
      });
      return api.patch(`/members/${id}`, clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member", id] });
      qc.invalidateQueries({ queryKey: ["members"] });
      router.push(`/members/${id}`);
    },
  });

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#145C14]" />
          <p className="text-sm font-semibold text-gray-500">Loading member…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.push(`/members/${id}`)}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#145C14] transition mb-2"
          >
            <ArrowLeft size={16} />
            Back to Profile
          </button>
          <h1 className="font-serif font-bold text-gray-900 text-2xl">Edit Member</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {member?.firstName} {member?.lastName}
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit(d => update.mutate(d))} className="space-y-8">

        {/* Personal Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <Section title="Personal Information">
            <div className="grid grid-cols-3 gap-4">
              <Field label="First Name *" error={errors.firstName?.message}>
                <input {...register("firstName")} placeholder="First name" className={inputCls} />
              </Field>
              <Field label="Last Name *" error={errors.lastName?.message}>
                <input {...register("lastName")} placeholder="Last name" className={inputCls} />
              </Field>
              <Field label="Other Names">
                <input {...register("otherNames")} placeholder="Middle name" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone Number *" error={errors.phone?.message}>
                <input {...register("phone")} placeholder="08012345678" className={inputCls} />
              </Field>
              <Field label="Phone 2">
                <input {...register("phone2")} placeholder="Alternative number" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email Address" error={errors.email?.message}>
                <input {...register("email")} type="email" placeholder="email@example.com" className={inputCls} />
              </Field>
              <Field label="Gender *" error={errors.gender?.message}>
                <select {...register("gender")} className={inputCls}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date of Birth">
                <input {...register("dateOfBirth")} type="date" className={inputCls} />
              </Field>
              <Field label="Date Joined">
                <input {...register("joinedDate")} type="date" className={inputCls} />
              </Field>
            </div>
            <Field label="Home Address">
              <input {...register("address")} placeholder="Street, City" className={inputCls} />
            </Field>
          </Section>
        </div>

        {/* RCCG Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <Section title="RCCG Details">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Member Status">
                <select {...register("status")} className={inputCls}>
                  <option value="ACTIVE">Active</option>
                  <option value="VISITOR">Visitor</option>
                  <option value="NEW_CONVERT">New Convert</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TRANSFERRED_IN">Transferred In</option>
                </select>
              </Field>
              <Field label="Worker Status">
                <select {...register("workerStatus")} className={inputCls}>
                  <option value="NONE">None</option>
                  <option value="WORKER_IN_TRAINING">Worker in Training</option>
                  <option value="WORKER">Worker</option>
                  <option value="MINISTER">Minister</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="PASTOR">Pastor</option>
                </select>
              </Field>
              <Field label="Age Group">
                <select {...register("ageGroup")} className={inputCls}>
                  <option value="ADULT">Adult</option>
                  <option value="YOUTH">Youth (18–25)</option>
                  <option value="TEENAGER">Teenager (12–17)</option>
                  <option value="CHILD">Child (6–11)</option>
                  <option value="TODDLER">Toddler (0–5)</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Baptism Status">
                <select {...register("baptismStatus")} className={inputCls}>
                  <option value="NOT_BAPTISED">Not Baptised</option>
                  <option value="BAPTISED">Baptised</option>
                </select>
              </Field>
              <Field label="Baptism Date">
                <input {...register("baptismDate")} type="date" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Zone">
                <input {...register("zone")} placeholder="e.g. Zone A" className={inputCls} />
              </Field>
              <Field label="Area">
                <input {...register("area")} placeholder="e.g. Rivers Area" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department">
                <select {...register("departmentId")} className={inputCls}>
                  <option value="">— Select Department —</option>
                  {departments?.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="House Fellowship">
                <select {...register("houseFellowshipId")} className={inputCls}>
                  <option value="">— Select House Fellowship —</option>
                  {fellowships?.map(hf => (
                    <option key={hf.id} value={hf.id}>{hf.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex gap-6 pt-2">
              {[
                { name: "foundationSchool" as const, label: "Completed Foundation School" },
                { name: "isFirstTimer"     as const, label: "First Timer" },
                { name: "isNewConvert"     as const, label: "New Convert" },
              ].map(({ name, label }) => (
                <label key={name} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" {...register(name)} className="w-4 h-4 rounded accent-[#145C14]" />
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </Section>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <Section title="Notes">
            <Field label="Notes">
              <textarea
                {...register("notes")}
                rows={4}
                placeholder="Any additional notes about this member…"
                className={cn(inputCls, "resize-none")}
              />
            </Field>
          </Section>
        </div>

        {/* Error banner */}
        {update.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            {(update.error as any)?.response?.data?.message || "Failed to save changes. Please try again."}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pb-8">
          <button
            type="button"
            onClick={() => router.push(`/members/${id}`)}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={update.isPending}
            className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition shadow-lg shadow-green-900/20 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {update.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
              : <><Save size={15} /> Save Changes</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
