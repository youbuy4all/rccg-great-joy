import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { err, signAccess, signRefresh, setAuthCookies } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = z
      .object({ email: z.string().email(), password: z.string() })
      .parse(await req.json());

    const user = await prisma.user.findUnique({
      where:   { email: email.toLowerCase() },
      include: { member: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } } },
    });

    if (!user || !user.isActive) return err("Invalid email or password", 401);
    if (!await bcrypt.compare(password, user.passwordHash)) return err("Invalid email or password", 401);

    const payload      = { userId: user.id, role: user.role, memberId: user.member?.id };
    const accessToken  = signAccess(payload);
    const refreshToken = signRefresh(payload);

    await Promise.all([
      prisma.refreshToken.create({
        data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ]);

    // Tokens go into httpOnly cookies — NOT the response body
    const response = NextResponse.json({
      user: {
        id:          user.id,
        email:       user.email,
        role:        user.role,
        memberId:    user.member?.id,
        firstName:   user.member?.firstName,
        lastName:    user.member?.lastName,
        profilePhoto: user.member?.profilePhoto,
      },
    });

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (e: any) {
    return err(e.message || "Login failed", 400);
  }
}
