"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, User } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const schema = z.object({
  firstName:        z.string().min(1, "Required"),
  lastName:         z.string().min(1, "Required"),
  otherNames:       z.string().optional(),
  phone:            z.string().min(10, "Enter a valid phone number"),
  phone2:           z.string().optional(),
  email:            z.string().email("Invalid email").optional().or(z.literal("")),
  gender:           z.enum(["MALE","FEMALE"]),
  dateOfBirth:      z.string().optional(),
  address:          z.string().optional(),
  status:           z.string().default("ACTIVE"),
  workerStatus:     z.string().default("NONE"),
  ageGroup:         z.string().default("ADULT"),
  baptismStatus:    z.string().default("NOT_BAPTISED"),
  baptismDate:      z.string().optional(),
  foundationSchool: z.boolean().default(false),
  isFirstTimer:     z.boolean().default(false),
  isNewConvert:     z.boolean().default(false),
  convertDate:      z.string().optional(),
  zone:             z.string().optional(),
  area:             z.string().optional(),
  houseFellowshipId:z.string().optional(),
  departmentId:     z.string().optional(),
  joinedDate:       z.string().optional(),
  notes:            z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
}

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
  </div>
);

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 transition";

export function AddMemberModal({ onClose }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 3;

  const { data: departments } = useQuery<any[]>({
    queryKey: ["departments"],
    queryFn:  () => api.get("/departments").then(r => r.data),
  });
  const { data: fellowships } = useQuery<any[]>({
    queryKey: ["fellowships"],
    queryFn:  () => api.get("/house-fellowship").then(r => r.data),
  });

  const STEP_FIELDS: Record<number, (keyof FormData)[]> = {
    1: ["firstName", "lastName", "phone", "gender"],
    2: [],
    3: [],
  };

  const [dupWarning, setDupWarning] = useState("");

  const { register, handleSubmit, watch, trigger, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      gender: "MALE", status: "ACTIVE", workerStatus: "NONE", ageGroup: "ADULT",
      baptismStatus: "NOT_BAPTISED", foundationSchool: false,
      isFirstTimer: false, isNewConvert: false,
      joinedDate: new Date().toISOString().split("T")[0],
    },
  });

  const cleanData = (data: FormData) => {
    const clean: Record<string, any> = {};
    Object.entries(data).forEach(([key, val]) => {
      if (val === "" || val === null || val === undefined) return;
      clean[key] = val;
    });
    return clean;
  };

  const create = useMutation({
    mutationFn: (data: FormData & { force?: boolean }) => api.post("/members", cleanData(data as any)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["member-stats"] });
      onClose();
    },
    onError: (e: any) => {
      if (e?.response?.status === 409) setDupWarning(e.response.data?.message || "A member with this phone number already exists.");
    },
  });

  const onSubmit = (data: FormData) => { setDupWarning(""); create.mutate(data); };
  const saveAnyway = () => create.mutate({ ...getValues(), force: true });

  const stepTitles = ["Personal Info", "RCCG Details", "Additional Info"];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="font-serif font-bold text-gray-900 dark:text-white text-xl">Add New Member</h2>
            <p className="text-gray-400 text-sm mt-0.5">Step {step} of {TOTAL_STEPS} — {stepTitles[step - 1]}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition">
            <X size={15} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={cn(
                "h-1.5 flex-1 rounded-full transition-all",
                i < step ? "bg-[#145C14]" : "bg-gray-100 dark:bg-gray-700"
              )} />
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">

            {/* ── STEP 1: Personal Info ── */}
            {step === 1 && (
              <>
                <div className="flex items-center justify-center mb-2">
                  <div className="w-16 h-16 rounded-full bg-[#145C14]/10 flex items-center justify-center">
                    <User size={28} className="text-[#145C14] dark:text-green-400" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="First Name *" error={errors.firstName?.message}>
                    <input {...register("firstName")} placeholder="e.g. Adeyemi" className={inputCls} />
                  </Field>
                  <Field label="Last Name *" error={errors.lastName?.message}>
                    <input {...register("lastName")} placeholder="e.g. Folake" className={inputCls} />
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
              </>
            )}

            {/* ── STEP 2: RCCG Details ── */}
            {step === 2 && (
              <>
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
                    { name: "isFirstTimer"      as const, label: "First Timer" },
                    { name: "isNewConvert"       as const, label: "New Convert" },
                  ].map(({ name, label }) => (
                    <label key={name} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" {...register(name)}
                        className="w-4 h-4 rounded accent-[#145C14]" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {/* ── STEP 3: Additional Info ── */}
            {step === 3 && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-2">
                  <div className="text-sm font-bold text-green-800 mb-1">Almost done!</div>
                  <div className="text-xs text-green-700 dark:text-green-400 font-medium">
                    Review the information and add any notes before saving.
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Summary</div>
                  {[
                    ["Name",   `${watch("firstName") || "—"} ${watch("lastName") || ""}`],
                    ["Phone",  watch("phone") || "—"],
                    ["Gender", watch("gender") || "—"],
                    ["Status", watch("status") || "—"],
                    ["Zone",   watch("zone") || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">{k}</span>
                      <span className="text-gray-900 dark:text-white font-bold">{v}</span>
                    </div>
                  ))}
                </div>
                <Field label="Notes">
                  <textarea {...register("notes")} rows={4} placeholder="Any additional notes about this member…"
                    className={cn(inputCls, "resize-none")} />
                </Field>
                {create.error && (create.error as any)?.response?.status !== 409 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                    {(create.error as any)?.response?.data?.message || "Failed to save member. Please try again."}
                  </div>
                )}
                {dupWarning && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl space-y-2">
                    <p className="text-sm text-amber-800 dark:text-amber-400">⚠️ {dupWarning}</p>
                    <button type="button" onClick={saveAnyway} disabled={create.isPending}
                      className="w-full py-2 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition disabled:opacity-70">
                      {create.isPending ? "Saving…" : "Yes, Save Anyway — Not a Duplicate"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            {step > 1 && (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition">
                Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button type="button" onClick={async () => {
                const fields = STEP_FIELDS[step];
                const valid  = fields.length === 0 || await trigger(fields);
                if (valid) setStep(s => s + 1);
              }}
                className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition shadow-lg shadow-green-900/20">
                Continue
              </button>
            ) : (
              <button type="submit" disabled={create.isPending}
                className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition shadow-lg shadow-green-900/20 disabled:opacity-70 flex items-center justify-center gap-2">
                {create.isPending ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : "Save Member"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
