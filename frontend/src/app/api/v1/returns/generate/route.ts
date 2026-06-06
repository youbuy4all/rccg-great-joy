import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";
import { calcReturn } from "../calculate/route";

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const body = await req.json();
    const month=Number(body.month), year=Number(body.year);
    const existing = await prisma.monthlyReturn.findUnique({ where:{month_year:{month,year}} });
    if (existing?.status==="SUBMITTED") return err("Return already submitted", 400);
    const data = await calcReturn(month, year);
    const ret = await prisma.monthlyReturn.upsert({ where:{month_year:{month,year}}, update:{...data,status:"DRAFT"}, create:{month,year,status:"DRAFT",...data} });
    return ok({ ...ret, message:existing?"Return recalculated":"Return generated successfully" }, 201);
  }, ["PASTOR","TREASURER","SUPER_ADMIN"]);
}