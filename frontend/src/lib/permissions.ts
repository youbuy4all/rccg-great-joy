import type { Role } from "@/types";

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ["*"],
  PASTOR:      ["*"],
  TREASURER:   ["/", "/finance", "/returns", "/reports", "/settings"],
  SECRETARY:   ["/", "/members", "/attendance", "/messaging"],
  HOD:         ["/", "/departments", "/attendance"],
  AUDITOR:     ["/", "/finance", "/reports"],
  WORKER:      ["/"],
  MEMBER:      ["/"],
};

export const NAV_ITEMS = [
  { href: "/",               label: "Dashboard",   icon: "LayoutDashboard", roles: ["*"] },
  { href: "/members",        label: "Members",     icon: "UsersRound",      roles: ["SUPER_ADMIN","PASTOR","SECRETARY"] },
  { href: "/departments",    label: "Departments", icon: "Layers",          roles: ["SUPER_ADMIN","PASTOR","HOD","SECRETARY"] },
  { href: "/attendance",     label: "Attendance",  icon: "CheckCircle",     roles: ["SUPER_ADMIN","PASTOR","SECRETARY","HOD"] },
  { href: "/finance",        label: "Finance",     icon: "HandCoins",       roles: ["SUPER_ADMIN","PASTOR","TREASURER","AUDITOR"] },
  { href: "/returns",        label: "Returns",     icon: "SendHorizonal",   roles: ["SUPER_ADMIN","PASTOR","TREASURER"] },
  { href: "/reports",        label: "Reports",     icon: "BarChart2",       roles: ["SUPER_ADMIN","PASTOR","TREASURER","AUDITOR"] },
  { href: "/messaging",      label: "Messaging",   icon: "MessageCircle",   roles: ["SUPER_ADMIN","PASTOR","SECRETARY"] },
  { href: "/settings",       label: "Settings",    icon: "Settings",        roles: ["SUPER_ADMIN","PASTOR"] },
  { href: "/settings/users", label: "Users",       icon: "ShieldCheck",     roles: ["SUPER_ADMIN","PASTOR"] },
];

export function canAccess(role: Role, path: string): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return false;
  if (allowed.includes("*")) return true;
  return allowed.some(p => path === p || path.startsWith(p + "/"));
}

export function getNavForRole(role: Role) {
  return NAV_ITEMS.filter(item => item.roles.includes("*") || item.roles.includes(role));
}
