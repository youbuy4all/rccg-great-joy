import { NextRequest } from "next/server";
import { ok, withAuth, qs } from "@/lib/api-helpers";
import { calcReturn } from "@/app/api/v1/returns/utils";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const s = qs(req);
    const now = new Date(), m = parseInt(s.get("month") || String(now.getMonth() + 1)), y = parseInt(s.get("year") || String(now.getFullYear()));
    const data = await calcReturn(m, y);
    const totalIncome = [data.totalTithe, data.totalMinistersTithe, data.totalSundayOffering, data.totalThanksgiving, data.totalCRM, data.totalChildrenOffering, data.totalTrustFruit, data.totalFirstBorn, data.totalGospelFund, data.totalHFOffering, data.totalBuildingFund, data.totalRUN, data.totalCSR].reduce((s, v) => s + v, 0);
    return ok({ period: { month: m, year: y }, ...data, totalIncome, netSurplus: totalIncome - data.totalExpenses, parishRetained: totalIncome - data.totalRemittance });
  }, ["PASTOR", "TREASURER", "AUDITOR", "SUPER_ADMIN"]);
}