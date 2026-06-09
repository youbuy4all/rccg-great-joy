import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const accounts = await prisma.account.findMany({ where:{isActive:true}, orderBy:{name:"asc"} });
    return ok(accounts);
  }, ["PASTOR","TREASURER","AUDITOR","SUPER_ADMIN"]);
}