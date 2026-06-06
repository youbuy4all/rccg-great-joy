import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, err, signAccess, signRefresh } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { member: { select: { id:true, firstName:true, lastName:true, profilePhoto:true } } },
    });
    if (!user || !user.isActive) return err("Invalid email or password", 401);
    if (!await bcrypt.compare(password, user.passwordHash)) return err("Invalid email or password", 401);
    const payload = { userId: user.id, role: user.role, memberId: user.member?.id };
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh(payload);
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now()+7*24*60*60*1000) } });
    await prisma.user.update({ where:{id:user.id}, data:{lastLoginAt:new Date()} });
    return ok({ accessToken, refreshToken, user: { id:user.id, email:user.email, role:user.role, memberId:user.member?.id, firstName:user.member?.firstName, lastName:user.member?.lastName, profilePhoto:user.member?.profilePhoto } });
  } catch(e:any) { return err(e.message||"Login failed", 400); }
}