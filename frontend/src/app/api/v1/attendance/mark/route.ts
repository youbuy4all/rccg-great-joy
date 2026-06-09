import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  return withAuth(req, async user => {
    const { sessionId, records } = await req.json();
    if (!sessionId || !records?.length) return err("sessionId and records required", 400);
    const session = await prisma.attendanceSession.findUnique({ where:{id:sessionId} });
    if (!session) return err("Session not found", 404);
    await Promise.all(records.map((r:any) => prisma.attendance.upsert({
      where:{sessionId_memberId:{sessionId,memberId:r.memberId}},
      update:{present:r.present},
      create:{sessionId,memberId:r.memberId,present:r.present,markedById:user.userId},
    })));
    const presentCount = await prisma.attendance.count({ where:{sessionId,present:true} });
    await prisma.attendanceSession.update({ where:{id:sessionId}, data:{totalCount:presentCount} });
    return ok({ message:`${records.length} records updated`, present:presentCount });
  }, ["PASTOR","SECRETARY","SUPER_ADMIN"]);
}