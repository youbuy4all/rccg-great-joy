import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const t = await prisma.transaction.findUnique({ where:{id}, include:{member:{select:{id:true,firstName:true,lastName:true}},department:{select:{id:true,name:true}}} });
    if (!t) return err("Not found", 404);
    return ok(t);
  }, ["PASTOR","TREASURER","AUDITOR","SUPER_ADMIN"]);
}

export async function DELETE(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const t = await prisma.transaction.findUnique({ where:{id} });
    if (!t) return err("Not found", 404);
    if (t.isRemitted) return err("Cannot delete remitted transaction", 400);
    await prisma.transaction.delete({ where:{id} });
    return ok({ message:"Deleted" });
  }, ["PASTOR","TREASURER","SUPER_ADMIN"]);
}