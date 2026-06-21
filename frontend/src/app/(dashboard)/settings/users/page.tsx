"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, X, Shield, UserCheck, UserX, KeyRound, Search, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
const ROLES = ["PASTOR","TREASURER","HOD","SECRETARY","AUDITOR","WORKER","MEMBER","SUPER_ADMIN"] as const;
type Role = typeof ROLES[number];

interface SystemUser {
  id:          string;
  email:       string;
  role:        Role;
  isActive:    boolean;
  lastLoginAt: string | null;
  createdAt:   string;
  member:      { id:string; memberId:string; firstName:string; lastName:string; phone?:string } | null;
}

// ─── Role badge ───────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  PASTOR:      "bg-green-100 text-green-700",
  TREASURER:   "bg-blue-100 text-blue-700",
  AUDITOR:     "bg-indigo-100 text-indigo-700",
  HOD:         "bg-amber-100 text-amber-700",
  SECRETARY:   "bg-teal-100 text-teal-700",
  WORKER:      "bg-gray-100 text-gray-600",
  MEMBER:      "bg-gray-100 text-gray-500",
};

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full", ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600 dark:text-gray-300")}>
      {role.replace("_", " ")}
    </span>
  );
}

// ─── Zod schemas ─────────────────────────────────────────────────────────────
const createSchema = z.object({
  email:    z.string().email("Valid email required"),
  password: z.string().min(8, "Min 8 characters"),
  role:     z.enum(ROLES),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  role:        z.enum(ROLES),
  isActive:    z.boolean(),
  newPassword: z.string().min(8, "Min 8 characters").or(z.literal("")).optional(),
});
type EditForm = z.infer<typeof editSchema>;

const inp = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#145C14] focus:border-transparent placeholder-gray-400 transition";

// ─── Create user modal ────────────────────────────────────────────────────────
function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiErr, setApiErr] = useState("");
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: "WORKER" },
  });

  const create = useMutation({
    mutationFn: (d: CreateForm) => api.post("/users", d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["users"] }); onClose(); },
    onError:    (e: any) => setApiErr(e?.response?.data?.message || "Failed to create user"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Create System User</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit(d => create.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email *</label>
            <input {...register("email")} type="email" placeholder="user@greatjoyparish.org" className={cn(inp, errors.email && "border-red-400")} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Password * (min 8 chars)</label>
            <div className="relative">
              <input {...register("password")} type={showPw ? "text" : "password"} placeholder="••••••••" className={cn(inp, "pr-10", errors.password && "border-red-400")} />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-300 transition">
                <KeyRound size={14} />
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Role *</label>
            <select {...register("role")} className={inp}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
          </div>
          {apiErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{apiErr}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-700 transition">Cancel</button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70 flex items-center justify-center gap-2">
              {create.isPending ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit user modal ──────────────────────────────────────────────────────────
function EditUserModal({ user: target, onClose }: { user: SystemUser; onClose: () => void }) {
  const qc = useQueryClient();
  const [apiErr, setApiErr] = useState("");
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { role: target.role, isActive: target.isActive, newPassword: "" },
  });

  const update = useMutation({
    mutationFn: (d: EditForm) => api.patch(`/users/${target.id}`, {
      role:        d.role,
      isActive:    d.isActive,
      newPassword: d.newPassword || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); onClose(); },
    onError:   (e: any) => setApiErr(e?.response?.data?.message || "Failed to update user"),
  });

  const displayName = target.member
    ? `${target.member.firstName} ${target.member.lastName}`
    : target.email;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">Edit User</h2>
            <p className="text-sm text-gray-400 mt-0.5">{displayName}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit(d => update.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Role</label>
            <select {...register("role")} className={inp}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-700">
            <div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Account Active</p>
              <p className="text-xs text-gray-400 mt-0.5">Deactivating prevents login without deleting data</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
              <input {...register("isActive")} type="checkbox" className="sr-only peer" />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white dark:bg-gray-800 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#145C14]" />
            </label>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              New Password <span className="text-gray-300 font-normal">(leave blank to keep current)</span>
            </label>
            <div className="relative">
              <input {...register("newPassword")} type={showPw ? "text" : "password"} placeholder="New password (optional)" className={cn(inp, "pr-10")} />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-300 transition">
                <KeyRound size={14} />
              </button>
            </div>
            {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
          </div>
          {apiErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{apiErr}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-700 transition">Cancel</button>
            <button type="submit" disabled={update.isPending} className="flex-1 py-3 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition disabled:opacity-70 flex items-center justify-center gap-2">
              {update.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const currentUser = useAuthStore(s => s.user);
  const qc          = useQueryClient();
  const [search, setSearch]       = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<SystemUser | null>(null);

  const { data: users = [], isLoading } = useQuery<SystemUser[]>({
    queryKey: ["users", search],
    queryFn:  () => api.get(`/users${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(r => r.data),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const active   = users.filter(u => u.isActive);
  const inactive = users.filter(u => !u.isActive);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif font-bold text-gray-900 dark:text-white text-lg">System Users</h2>
          <p className="text-gray-400 text-sm mt-0.5">Manage login accounts and access roles</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145C14] text-white text-sm font-bold hover:bg-[#0A3D0A] transition shadow-sm">
          <Plus size={15} /> New User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Users",    value: users.length,    icon: <Shield size={18} className="text-gray-400" />       },
          { label: "Active",         value: active.length,   icon: <UserCheck size={18} className="text-green-500" />   },
          { label: "Inactive",       value: inactive.length, icon: <UserX size={18} className="text-gray-400" />        },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">{s.icon}</div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#145C14] placeholder-gray-400"
        />
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Shield size={36} className="mb-3 text-gray-200" />
            <p className="font-semibold text-sm">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 dark:bg-gray-700/40">
                  {["User","Email","Role","Status","Last Login","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => {
                  const name      = u.member ? `${u.member.firstName} ${u.member.lastName}` : "—";
                  const initials  = u.member ? getInitials(u.member.firstName, u.member.lastName) : "?";
                  const isMe      = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className={cn("hover:bg-gray-50/50 dark:bg-gray-700/30 transition-colors", !u.isActive && "opacity-60")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#145C14]/10 flex items-center justify-center text-[#145C14] text-xs font-bold flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm leading-tight">
                              {name} {isMe && <span className="text-[10px] text-gray-400 font-normal">(you)</span>}
                            </p>
                            {u.member?.memberId && <p className="text-[11px] text-gray-400">{u.member.memberId}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{u.email}</td>
                      <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3">
                        {u.isActive
                          ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                          : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        {!isMe && (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setEditing(u)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition">
                              <ChevronDown size={11} /> Edit
                            </button>
                            {u.isActive && (
                              <button
                                onClick={() => { if (confirm(`Deactivate ${u.email}?`)) deactivate.mutate(u.id); }}
                                disabled={deactivate.isPending}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition disabled:opacity-50">
                                <UserX size={11} /> Deactivate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {editing    && <EditUserModal   user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
