"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, UsersRound, Layers, CheckCircle,
  HandCoins, SendHorizonal, BarChart2, MessageCircle,
  Settings, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { getNavForRole } from "@/lib/permissions";
import api from "@/lib/api";
import type { Role } from "@/types";

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, UsersRound, Layers, CheckCircle,
  HandCoins, SendHorizonal, BarChart2, MessageCircle, Settings,
};

interface SidebarProps { collapsed: boolean; onToggle: () => void; }

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, clearAuth } = useAuthStore();

  const navItems = user?.role ? getNavForRole(user.role as Role) : [];

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      await api.post("/auth/logout", { refreshToken });
    } finally {
      clearAuth();
      router.push("/login");
    }
  };

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : "PA";

  return (
    <aside className={cn(
      "no-print flex flex-col h-screen bg-[#0A3D0A] transition-all duration-250 flex-shrink-0 shadow-xl",
      collapsed ? "w-[72px]" : "w-[248px]"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 border-b border-white/10 flex-shrink-0",
        collapsed ? "px-4 py-5 justify-center" : "px-5 py-5"
      )}>
        <img src="/logo.png" alt="RCCG" className="w-10 h-10 rounded-full object-cover border-2 border-white/25 flex-shrink-0"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-white font-serif font-bold text-[15px] leading-tight">Great Joy Parish</div>
            <div className="text-white/50 text-[10px] font-bold tracking-widest uppercase mt-0.5">RCCG</div>
          </div>
        )}
        {!collapsed && (
          <button onClick={onToggle} className="text-white/40 hover:text-white/70 transition flex-shrink-0">
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <button onClick={onToggle} className="mx-auto mt-3 text-white/40 hover:text-white/70 transition">
          <ChevronRight size={16} />
        </button>
      )}

      {/* Nav — only show links this role can access */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon }) => {
          const Icon     = ICON_MAP[icon];
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={cn(
              "flex items-center gap-3 rounded-xl transition-all duration-150 text-[13.5px] font-medium border-l-[3px]",
              collapsed ? "px-3 py-3 justify-center" : "px-3.5 py-2.5",
              isActive
                ? "bg-white/15 text-white border-white/60 font-bold"
                : "text-white/65 border-transparent hover:bg-white/8 hover:text-white/90"
            )}>
              {Icon && <Icon size={19} className="flex-shrink-0" />}
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      {!collapsed ? (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-white/10 border border-white/10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-[13px] truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-white/50 text-[11px] font-medium">{user?.role}</div>
          </div>
          <button onClick={handleLogout} title="Sign out" className="text-white/40 hover:text-red-400 transition flex-shrink-0">
            <LogOut size={15} />
          </button>
        </div>
      ) : (
        <button onClick={handleLogout} className="mx-auto mb-4 text-white/40 hover:text-red-400 transition">
          <LogOut size={18} />
        </button>
      )}
    </aside>
  );
}
