import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth, qs } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const q = qs(req).get("q")?.trim() || "";
    if (q.length < 2) return ok({ members: [], transactions: [], returns: [] });

    const [members, transactions, returns] = await Promise.all([
      // Members — search name, phone, memberId, email
      prisma.member.findMany({
        where: {
          OR: [
            { firstName:  { contains: q, mode: "insensitive" } },
            { lastName:   { contains: q, mode: "insensitive" } },
            { memberId:   { contains: q, mode: "insensitive" } },
            { phone:      { contains: q } },
            { email:      { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true, memberId: true, firstName: true, lastName: true,
          phone: true, status: true, workerStatus: true, ageGroup: true,
          department: { select: { name: true } },
        },
        take: 6,
        orderBy: { firstName: "asc" },
      }),

      // Transactions — search reference, description
      prisma.transaction.findMany({
        where: {
          OR: [
            { reference:   { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true, reference: true, type: true,
          amount: true, transactionDate: true,
          incomeCategory: true, expenseCategory: true,
        },
        take: 4,
        orderBy: { transactionDate: "desc" },
      }),

      // Returns — search by year (if numeric)
      prisma.monthlyReturn.findMany({
        where: !isNaN(Number(q))
          ? { OR: [{ year: Number(q) }, { month: Number(q) }] }
          : {},
        select: { id: true, month: true, year: true, status: true, totalRemittance: true },
        take: 3,
        orderBy: { year: "desc" },
      }),
    ]);

    return ok({ members, transactions, returns });
  });
}
