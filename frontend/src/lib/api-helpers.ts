import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";

export interface AuthUser {
  userId:    string;
  role:      string;
  memberId?: string;
}

export const ok  = (data: any, status = 200)   => NextResponse.json(data, { status });
export const err = (msg: string, status = 500) => NextResponse.json({ message: msg }, { status });
export const qs  = (req: NextRequest)          => new URL(req.url).searchParams;

// ─── Cookie helpers ───────────────────────────────────────────────────────────
const IS_PROD = process.env.NODE_ENV === "production";

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): void {
  response.cookies.set("access_token", accessToken, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "strict",
    maxAge:   8 * 60 * 60,       // 8 hours
    path:     "/",
  });
  response.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "strict",
    maxAge:   7 * 24 * 60 * 60, // 7 days
    path:     "/",
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set("access_token",  "", { httpOnly: true, secure: IS_PROD, sameSite: "strict", maxAge: 0, path: "/" });
  response.cookies.set("refresh_token", "", { httpOnly: true, secure: IS_PROD, sameSite: "strict", maxAge: 0, path: "/" });
}

// ─── Authentication ───────────────────────────────────────────────────────────
export async function authenticate(req: NextRequest): Promise<AuthUser | null> {
  // Primary: httpOnly cookie — XSS-safe
  const cookieToken = req.cookies.get("access_token")?.value;
  if (cookieToken) {
    try { return jwt.verify(cookieToken, process.env.JWT_SECRET!) as AuthUser; }
    catch { return null; }
  }
  // Fallback: Authorization header (for direct API clients / migration period)
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    try { return jwt.verify(header.split(" ")[1], process.env.JWT_SECRET!) as AuthUser; }
    catch { return null; }
  }
  return null;
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

export const signAccess  = (p: AuthUser) => jwt.sign(p, process.env.JWT_SECRET!,         { expiresIn: "8h" } as any);
export const signRefresh = (p: AuthUser) => jwt.sign(p, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d"  } as any);

export function makeRef(prefix: string, count: number): string {
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

// ─── Audit log ────────────────────────────────────────────────────────────────
export async function writeAuditLog(opts: {
  userId?:    string;
  action:     string;
  entity:     string;
  entityId?:  string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  req:        NextRequest;
}): Promise<void> {
  try {
    const ip        = opts.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
                   ?? opts.req.headers.get("x-real-ip")
                   ?? "unknown";
    const userAgent = opts.req.headers.get("user-agent") ?? undefined;
    await prisma.auditLog.create({
      data: {
        userId:    opts.userId,
        action:    opts.action,
        entity:    opts.entity,
        entityId:  opts.entityId,
        oldValues: opts.oldValues,
        newValues: opts.newValues,
        ipAddress: ip,
        userAgent,
      },
    });
  } catch (e) {
    // Audit failure must never crash the primary request
    console.error("[AuditLog]", e);
  }
}
