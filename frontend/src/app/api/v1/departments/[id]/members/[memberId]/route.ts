import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function DELETE(req: NextRequest, { params }:{ params: Promise<{id:string,memberId:string}> }) {
  return withAuth(req, async () => {
    const { memberId } = await params;
    await prisma.member.update({ where:{id:memberId}, data:{departmentId:null} });
    return ok({ message:"Member removed from department" });
  }, ["PASTOR","SECRETARY","SUPER_ADMIN"]);
}