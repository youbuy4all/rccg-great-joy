import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { err, signAccess, signRefresh, setAuthCookies } from "@/lib/api-helpers";
import type { AuthUser } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    // Read refresh token from httpOnly cookie
    const refreshToken = req.cookies.get("refresh_token")?.value;
    if (!refreshToken) return err("Refresh token required", 400);

    let payload: AuthUser;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as AuthUser;
    } catch {
      return err("Invalid refresh token", 401);
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) return err("Token expired", 401);

    const newAccess  = signAccess(payload);
    const newRefresh = signRefresh(payload);

    // Rotate refresh token in DB
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { token: refreshToken } }),
      prisma.refreshToken.create({
        data: { token: newRefresh, userId: payload.userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, newAccess, newRefresh);
    return response;
  } catch (e: any) {
    return err(e.message || "Refresh failed", 400);
  }
}
