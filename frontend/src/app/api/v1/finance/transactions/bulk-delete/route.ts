import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) return err("No IDs provided", 400);

    // Never delete remitted transactions
    const remitted = await prisma.transaction.findMany({
      where: { id: { in: ids }, isRemitted: true },
      select: { id: true, reference: true },
    });
    const safeIds = ids.filter(id => !remitted.find(r => r.id === id));

    if (safeIds.length === 0) return err("All selected transactions have been remitted and cannot be deleted", 400);

    const { count } = await prisma.transaction.deleteMany({ where: { id: { in: safeIds } } });

    return ok({
      deleted: count,
      skipped: ids.length - safeIds.length,
      skippedRefs: remitted.map(r => r.reference),
    });
  }, ["PASTOR", "TREASURER", "SUPER_ADMIN"]);
}
