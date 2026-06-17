import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, writeAuditLog } from "@/lib/api-helpers";
import { calcReturn } from "@/app/api/v1/returns/utils";

export async function POST(req: NextRequest) {
  return withAuth(req, async user => {
    const body  = await req.json();
    const month = Number(body.month), year = Number(body.year);

    if (!month || !year || month < 1 || month > 12) return err("Valid month and year required", 400);

    const existing = await prisma.monthlyReturn.findUnique({ where: { month_year: { month, year } } });
    if (existing?.status === "SUBMITTED") return err("Return already submitted — cannot regenerate", 400);

    const data = await calcReturn(month, year);
    const ret  = await prisma.monthlyReturn.upsert({
      where:  { month_year: { month, year } },
      update: { ...data, status: "DRAFT" },
      create: { month, year, status: "DRAFT", ...data },
    });

    await writeAuditLog({
      userId:    user.userId,
      action:    existing ? "REGENERATE_RETURN" : "GENERATE_RETURN",
      entity:    "MonthlyReturn",
      entityId:  ret.id,
      newValues: { month, year, status: "DRAFT", totalRemittance: data.totalRemittance },
      req,
    });

    return ok({ ...ret, message: existing ? "Return recalculated" : "Return generated successfully" }, 201);
  }, ["PASTOR", "TREASURER", "SUPER_ADMIN"]);
}
