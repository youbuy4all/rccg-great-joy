"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const schema = z.object({
  password:        z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path:    ["confirmPassword"],
});
type Form = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const token  = useSearchParams().get("token");
  const [showPw, setShowPw] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setApiErr("");
    if (!token) { setApiErr("This reset link is missing its token. Please request a new one."); return; }
    try {
      await api.post("/auth/reset-password", { token, newPassword: data.password });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (e: any) {
      setApiErr(e?.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  const inp = cn(
    "w-full px-4 py-3 rounded-xl border bg-gray-50 text-sm font-medium text-gray-800",
    "focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent",
    "placeholder-gray-400 transition"
  );

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-700 font-medium text-sm mb-4">
          This reset link is invalid or missing its token.
        </p>
        <Link href="/forgot-password" className="text-sm font-bold text-[#145C14] hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={24} className="text-[#145C14]" />
        </div>
        <p className="text-gray-700 font-medium text-sm">Password reset! Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">New Password</label>
        <div className="relative">
          <input
            {...register("password")}
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            className={cn(inp, "pr-11", errors.password && "border-red-400 bg-red-50")}
          />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-xs text-red-600 font-medium">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Confirm New Password</label>
        <input
          {...register("confirmPassword")}
          type={showPw ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="new-password"
          className={cn(inp, errors.confirmPassword && "border-red-400 bg-red-50")}
        />
        {errors.confirmPassword && <p className="mt-1 text-xs text-red-600 font-medium">{errors.confirmPassword.message}</p>}
      </div>

      {apiErr && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {apiErr}
        </div>
      )}

      <button type="submit" disabled={isSubmitting}
        className="w-full py-3.5 rounded-xl bg-[#145C14] text-white font-bold text-sm hover:bg-[#0A3D0A] active:scale-[.99] transition shadow-lg shadow-green-900/25 disabled:opacity-70 flex items-center justify-center gap-2">
        {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Resetting…</> : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A3D0A] via-[#145C14] to-[#1e7e1e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#145C14]/10 mb-4 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="RCCG" className="w-12 h-12 object-cover rounded-xl"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <h1 className="font-serif font-bold text-gray-900 text-2xl">Reset Password</h1>
            <p className="text-gray-400 text-sm font-medium mt-1">Choose a new password below</p>
          </div>
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
