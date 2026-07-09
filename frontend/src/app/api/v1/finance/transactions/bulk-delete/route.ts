import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, writeAuditLog } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  return withAuth(req, async user => {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) return err("No IDs provided", 400);

    // Never delete remitted transactions
    const remitted = await prisma.transaction.findMany({
      where: { id: { in: ids }, isRemitted: true },
      select: { id: true, reference: true },
    });
    const safeIds = ids.filter((id: string) => !remitted.find((r: { id: string }) => r.id === id));

    if (safeIds.length === 0) return err("All selected transactions have been remitted and cannot be deleted", 400);

    // Capture what's about to be deleted BEFORE deleting it, so the audit
    // log actually shows what was lost — not just how many rows.
    const toDelete = await prisma.transaction.findMany({
      where: { id: { in: safeIds } },
      select: { id: true, reference: true, type: true, incomeCategory: true, expenseCategory: true, amount: true, description: true },
    });

    const { count } = await prisma.transaction.deleteMany({ where: { id: { in: safeIds } } });

    await writeAuditLog({
      userId:    user.userId,
      action:    "BULK_DELETE_TRANSACTION",
      entity:    "Transaction",
      oldValues: {
        count,
        transactions: toDelete.map((t: { reference: string; type: string; incomeCategory: string | null; expenseCategory: string | null; amount: any; description: string | null }) => ({
          reference:   t.reference,
          type:        t.type,
          category:    t.incomeCategory || t.expenseCategory,
          amount:      t.amount,
          description: t.description,
        })),
      },
      req,
    });

    return ok({
      deleted: count,
      skipped: ids.length - safeIds.length,
      skippedRefs: remitted.map((r: { reference: string }) => r.reference),
    });
  }, ["PASTOR", "TREASURER", "SUPER_ADMIN"]);
}
