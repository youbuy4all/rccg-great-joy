"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const schema = z.object({ email: z.string().email("Enter a valid email address") });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [apiErr, setApiErr] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setApiErr("");
    try {
      await api.post("/auth/forgot-password", data);
      setSent(true);
    } catch (e: any) {
      setApiErr(e?.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  const inp = cn(
    "w-full px-4 py-3 rounded-xl border bg-gray-50 text-sm font-medium text-gray-800",
    "focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent",
    "placeholder-gray-400 transition"
  );

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
            <h1 className="font-serif font-bold text-gray-900 text-2xl">Forgot Password</h1>
            <p className="text-gray-400 text-sm font-medium mt-1">We'll email you a reset link</p>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                <MailCheck size={24} className="text-[#145C14]" />
              </div>
              <p className="text-gray-700 font-medium text-sm">
                If an account exists with that email, a reset link is on its way. Check your inbox (and spam folder).
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="user@greatjoyparish.org"
                  autoComplete="email"
                  className={cn(inp, errors.email && "border-red-400 bg-red-50")}
                />
                {errors.email && <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>}
              </div>

              {apiErr && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                  {apiErr}
                </div>
              )}

              <button type="submit" disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-[#145C14] text-white font-bold text-sm hover:bg-[#0A3D0A] active:scale-[.99] transition shadow-lg shadow-green-900/25 disabled:opacity-70 flex items-center justify-center gap-2">
                {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : "Send Reset Link"}
              </button>
            </form>
          )}

          <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-bold text-gray-500 hover:text-[#145C14] transition">
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
