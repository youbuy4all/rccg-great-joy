import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async user => {
    const { id } = await params;
    const existing = await prisma.monthlyReturn.findUnique({ where:{id} });
    if (!existing) return err("Not found", 404);
    if (existing.status==="SUBMITTED") return err("Already submitted", 400);
    const ret = await prisma.monthlyReturn.update({ where:{id}, data:{status:"SUBMITTED",submittedAt:new Date(),submittedById:user.userId} });
    return ok({ ...ret, message:`Return for ${existing.month}/${existing.year} submitted successfully` });
  }, ["PASTOR","TREASURER","SUPER_ADMIN"]);
}