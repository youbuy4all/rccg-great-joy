import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const configs = await prisma.incomeConfig.findMany({ orderBy:{category:"asc"} });
    return ok(configs);
  });
}