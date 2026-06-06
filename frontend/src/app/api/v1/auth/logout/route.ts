import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (refreshToken) await prisma.refreshToken.deleteMany({ where:{token:refreshToken} });
  } catch {}
  return ok({ message:"Logged out" });
}