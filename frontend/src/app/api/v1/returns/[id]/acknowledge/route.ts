import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const existing = await prisma.monthlyReturn.findUnique({ where:{id} });
    if (!existing) return err("Not found", 404);
    if (existing.status!=="SUBMITTED") return err("Only submitted returns can be acknowledged", 400);
    const ret = await prisma.monthlyReturn.update({ where:{id}, data:{status:"ACKNOWLEDGED",acknowledgedAt:new Date()} });
    return ok({ ...ret, message:"Return acknowledged" });
  }, ["PASTOR","SUPER_ADMIN"]);
}