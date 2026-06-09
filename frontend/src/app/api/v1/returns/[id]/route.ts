import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const ret = await prisma.monthlyReturn.findUnique({ where:{id} });
    if (!ret) return err("Not found", 404);
    return ok(ret);
  }, ["PASTOR","TREASURER","AUDITOR","SUPER_ADMIN"]);
}

export async function PATCH(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const existing = await prisma.monthlyReturn.findUnique({ where:{id} });
    if (!existing) return err("Not found", 404);
    if (existing.status==="SUBMITTED") return err("Cannot edit submitted return", 400);
    const data = await req.json();
    const ret = await prisma.monthlyReturn.update({ where:{id}, data });
    return ok(ret);
  }, ["PASTOR","TREASURER","SUPER_ADMIN"]);
}