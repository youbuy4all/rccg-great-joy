import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const sessions = await prisma.attendanceSession.findMany({ where:{serviceDate:{gte:today,lt:tomorrow}}, include:{_count:{select:{attendance:{where:{present:true}}}}} });
    return ok(sessions.map(s=>({...s,presentCount:s._count.attendance})));
  });
}