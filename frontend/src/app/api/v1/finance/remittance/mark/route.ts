import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const { transactionIds, remittedAt } = await req.json();
    if (!transactionIds?.length) return err("No transactions specified", 400);
    await prisma.transaction.updateMany({ where:{id:{in:transactionIds}}, data:{isRemitted:true,remittedAt:remittedAt?new Date(remittedAt):new Date()} });
    return ok({ message:`${transactionIds.length} transaction(s) marked as remitted` });
  }, ["PASTOR","TREASURER","SUPER_ADMIN"]);
}