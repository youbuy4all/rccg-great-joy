import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clearAuthCookies } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("refresh_token")?.value;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
  } catch {}

  const response = NextResponse.json({ message: "Logged out" });
  clearAuthCookies(response);
  return response;
}
