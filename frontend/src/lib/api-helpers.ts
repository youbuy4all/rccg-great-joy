import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export interface AuthUser {
  userId:    string;
  role:      string;
  memberId?: string;
}

export const ok  = (data: any, status = 200)   => NextResponse.json(data, { status });
export const err = (msg: string, status = 500) => NextResponse.json({ message: msg }, { status });
export const qs  = (req: NextRequest) => new URL(req.url).searchParams;

export async function authenticate(req: NextRequest): Promise<AuthUser | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.split(" ")[1], process.env.JWT_SECRET!) as AuthUser;
  } catch { return null; }
}

const SUPER = ["SUPER_ADMIN", "PASTOR"];

export async function withAuth(
  req: NextRequest,
  handler: (user: AuthUser) => Promise<NextResponse>,
  allowedRoles?: string[]
): Promise<NextResponse> {
  const user = await authenticate(req);
  if (!user) return err("Not authenticated", 401);
  if (allowedRoles && !SUPER.includes(user.role) && !allowedRoles.includes(user.role)) {
    return err("Access denied", 403);
  }
  try {
    return await handler(user);
  } catch (e: any) {
    console.error("[API Error]", e?.message);
    if (e?.code === "P2002") return err("Record already exists", 409);
    if (e?.code === "P2025") return err("Record not found", 404);
    return err(e?.message || "Internal server error", 500);
  }
}

export const signAccess  = (p: AuthUser) => jwt.sign(p, process.env.JWT_SECRET!,         { expiresIn: "15m" } as any);
export const signRefresh = (p: AuthUser) => jwt.sign(p, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d"  } as any);

export function makeRef(prefix: string, count: number): string {
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}
