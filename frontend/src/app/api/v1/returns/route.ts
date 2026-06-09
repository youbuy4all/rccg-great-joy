import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const returns = await prisma.monthlyReturn.findMany({ orderBy:[{year:"desc"},{month:"desc"}], include:{submittedBy:{select:{member:{select:{firstName:true,lastName:true}}}}} });
    return ok(returns);
  }, ["PASTOR","TREASURER","AUDITOR","SUPER_ADMIN"]);
}