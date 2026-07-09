import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, writeAuditLog } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  return withAuth(req, async user => {
    const { transactionIds, remittedAt } = await req.json();
    if (!transactionIds?.length) return err("No transactions specified", 400);

    const targets = await prisma.transaction.findMany({
      where:  { id: { in: transactionIds } },
      select: { id: true, reference: true, amount: true, incomeCategory: true },
    });

    const { count } = await prisma.transaction.updateMany({ where:{id:{in:transactionIds}}, data:{isRemitted:true,remittedAt:remittedAt?new Date(remittedAt):new Date()} });

    await writeAuditLog({
      userId:    user.userId,
      action:    "MARK_REMITTED",
      entity:    "Transaction",
      newValues: {
        count,
        remittedAt: remittedAt ? new Date(remittedAt) : new Date(),
        transactions: targets.map((t: { reference: string; incomeCategory: string | null; amount: any }) => ({ reference: t.reference, category: t.incomeCategory, amount: t.amount })),
      },
      req,
    });

    return ok({ message:`${count} transaction(s) marked as remitted` });
  }, ["PASTOR","TREASURER","SUPER_ADMIN"]);
}