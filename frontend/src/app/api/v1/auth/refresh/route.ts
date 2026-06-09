import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { ok, err, signAccess, signRefresh } from "@/lib/api-helpers";
import type { AuthUser } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) return err("Refresh token required", 400);
    let payload: AuthUser;
    try { payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as AuthUser; }
    catch { return err("Invalid refresh token", 401); }
    const stored = await prisma.refreshToken.findUnique({ where:{token:refreshToken} });
    if (!stored || stored.expiresAt < new Date()) return err("Token expired", 401);
    const newAccess = signAccess(payload);
    const newRefresh = signRefresh(payload);
    await prisma.$transaction([
      prisma.refreshToken.delete({ where:{token:refreshToken} }),
      prisma.refreshToken.create({ data:{ token:newRefresh, userId:payload.userId, expiresAt:new Date(Date.now()+7*24*60*60*1000) } }),
    ]);
    return ok({ accessToken:newAccess, refreshToken:newRefresh });
  } catch(e:any) { return err(e.message, 400); }
}