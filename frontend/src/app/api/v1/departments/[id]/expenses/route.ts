import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth, qs } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const s = qs(req);
    const month=s.get("month"), year=s.get("year");
    const where: any = { departmentId:id, type:"EXPENSE" };
    if (month && year) where.transactionDate = { gte:new Date(parseInt(year),parseInt(month)-1,1), lte:new Date(parseInt(year),parseInt(month),0) };
    const expenses = await prisma.transaction.findMany({ where, orderBy:{transactionDate:"desc"}, select:{id:true,reference:true,expenseCategory:true,amount:true,description:true,transactionDate:true,paymentMethod:true} });
    return ok({ expenses, total:expenses.reduce((s,e)=>s+Number(e.amount),0) });
  });
}