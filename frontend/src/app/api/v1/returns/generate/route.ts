import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, writeAuditLog } from "@/lib/api-helpers";
import { calcReturn } from "@/app/api/v1/returns/utils";

export async function POST(req: NextRequest) {
  return withAuth(req, async user => {
    const body  = await req.json();
    const month = Number(body.month), year = Number(body.year);

    if (!month || !year || month < 1 || month > 12) return err("Valid month and year required", 400);

    // Custom date range is optional — if the caller doesn't provide one, calcReturn falls
    // back to full calendar-month bounds. RCCG's actual reporting cycle rarely aligns to
    // calendar months, so in practice the frontend almost always sends a specific range.
    let fromDate: Date | undefined, toDate: Date | undefined;
    if (body.fromDate || body.toDate) {
      if (!body.fromDate || !body.toDate) return err("Both fromDate and toDate are required if either is provided", 400);
      fromDate = new Date(body.fromDate);
      toDate   = new Date(body.toDate);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return err("Invalid date format", 400);
      if (fromDate > toDate) return err("fromDate must be before toDate", 400);
    }

    const existing = await prisma.monthlyReturn.findUnique({ where: { month_year: { month, year } } });
    if (existing?.status === "SUBMITTED") return err("Return already submitted — cannot regenerate", 400);

    const { fromDate: resolvedFrom, toDate: resolvedTo, ...data } = await calcReturn(month, year, fromDate, toDate);
    const ret  = await prisma.monthlyReturn.upsert({
      where:  { month_year: { month, year } },
      update: { ...data, fromDate: resolvedFrom, toDate: resolvedTo, status: "DRAFT" },
      create: { month, year, fromDate: resolvedFrom, toDate: resolvedTo, status: "DRAFT", ...data },
    });

    await writeAuditLog({
      userId:    user.userId,
      action:    existing ? "REGENERATE_RETURN" : "GENERATE_RETURN",
      entity:    "MonthlyReturn",
      entityId:  ret.id,
      newValues: { month, year, fromDate: resolvedFrom, toDate: resolvedTo, status: "DRAFT", totalRemittance: data.totalRemittance },
      req,
    });

    return ok({ ...ret, message: existing ? "Return recalculated" : "Return generated successfully" }, 201);
  }, ["PASTOR", "TREASURER", "SUPER_ADMIN"]);
}
