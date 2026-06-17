import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth, qs } from "@/lib/api-helpers";

// GET /api/v1/returns?year=2026
// Returns all stored MonthlyReturn records for the given year (array).
// The page needs an array – the old handler returned a single calculated
// object which caused `returns.map is not a function` crash on render.
export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const s    = qs(req);
    const year = parseInt(s.get("year") || String(new Date().getFullYear()));

    const returns = await prisma.monthlyReturn.findMany({
      where:   { year },
      orderBy: { month: "asc" },
    });

    return ok(returns);
  }, ["PASTOR", "TREASURER", "AUDITOR", "SUPER_ADMIN"]);
}
