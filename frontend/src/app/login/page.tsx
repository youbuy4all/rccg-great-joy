"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const schema = z.object({
  email:    z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router  = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [showPw, setShowPw] = useState(false);
  const [apiErr, setApiErr] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setApiErr("");
    try {
      // Tokens are now set as httpOnly cookies by the server response.
      // The body only contains the user profile.
      const res  = await api.post("/auth/login", data);
      const { user } = res.data;
      setAuth(user);
      router.push("/");
    } catch (e: any) {
      setApiErr(e?.response?.data?.message || "Login failed. Check your credentials.");
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
            <h1 className="font-serif font-bold text-gray-900 text-2xl">Great Joy Parish</h1>
            <p className="text-gray-400 text-sm font-medium mt-1">RCCG · Rivers Province 12</p>
          </div>

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

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn(inp, "pr-11", errors.password && "border-red-400 bg-red-50")}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600 font-medium">{errors.password.message}</p>}
            </div>

            {apiErr && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                {apiErr}
              </div>
            )}

            <button type="submit" disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-[#145C14] text-white font-bold text-sm hover:bg-[#0A3D0A] active:scale-[.99] transition shadow-lg shadow-green-900/25 disabled:opacity-70 flex items-center justify-center gap-2">
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs font-medium mt-5">
          Parish Management System · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
