import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const t = await prisma.transaction.findUnique({ where:{id}, include:{member:{select:{id:true,firstName:true,lastName:true}},department:{select:{id:true,name:true}}} });
    if (!t) return err("Not found", 404);
    return ok(t);
  }, ["PASTOR","TREASURER","AUDITOR","SUPER_ADMIN"]);
}

export async function DELETE(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const t = await prisma.transaction.findUnique({ where:{id} });
    if (!t) return err("Not found", 404);
    if (t.isRemitted) return err("Cannot delete remitted transaction", 400);
    await prisma.transaction.delete({ where:{id} });
    return ok({ message:"Deleted" });
  }, ["PASTOR","TREASURER","SUPER_ADMIN"]);
}

export async function PATCH(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const data = await req.json();
    const existing = await prisma.transaction.findUnique({ where:{ id } });
    if (!existing) return err("Transaction not found", 404);
    if (existing.isRemitted) return err("Cannot edit a remitted transaction", 400);

    let remittanceAmount = existing.remittanceAmount ? Number(existing.remittanceAmount) : undefined;
    const newCategory = data.incomeCategory ?? existing.incomeCategory;
    const newAmount   = data.amount        ?? Number(existing.amount);
    if (existing.type === "INCOME" && newCategory) {
      const config = await prisma.incomeConfig.findUnique({ where: { category: newCategory } });
      if (config) remittanceAmount = (newAmount * Number(config.remittancePct)) / 100;
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        // Use || to treat empty string "" the same as undefined/null
        incomeCategory:  data.incomeCategory  || existing.incomeCategory  || undefined,
        expenseCategory: data.expenseCategory || existing.expenseCategory || undefined,
        amount:          newAmount,
        description:     data.description     || existing.description     || undefined,
        paymentMethod:   data.paymentMethod   || existing.paymentMethod   || "CASH",
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : existing.transactionDate,
        memberId:        data.memberId        || existing.memberId        || undefined,
        departmentId:    data.departmentId    || existing.departmentId    || undefined,
        remittanceAmount,
      },
      include: {
        member:     { select: { id:true, firstName:true, lastName:true } },
        department: { select: { id:true, name:true } },
      },
    });
    return ok(updated);
  }, ["PASTOR","TREASURER","SUPER_ADMIN"]);
}
