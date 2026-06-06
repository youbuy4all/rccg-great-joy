import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async user => {
    const u = await prisma.user.findUnique({
      where: { id:user.userId },
      select: { id:true, email:true, role:true, lastLoginAt:true, member:{ select:{ id:true, memberId:true, firstName:true, lastName:true, phone:true, profilePhoto:true, workerStatus:true, department:{ select:{id:true,name:true} } } } },
    });
    if (!u) return err("User not found", 404);
    return ok(u);
  });
}