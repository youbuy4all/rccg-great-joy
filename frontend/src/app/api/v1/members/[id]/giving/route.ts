import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth, qs } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const s = qs(req);
    const year = s.get("year"), month = s.get("month");
    const where: any = { memberId:id, type:"INCOME" };
    if (year) {
      const y = parseInt(year);
      where.transactionDate = { gte:new Date(y,month?parseInt(month)-1:0,1), lte:new Date(y,month?parseInt(month):12,0) };
    }
    const transactions = await prisma.transaction.findMany({ where, orderBy:{transactionDate:"desc"}, select:{id:true,reference:true,incomeCategory:true,amount:true,transactionDate:true,paymentMethod:true} });
    const summary = transactions.reduce((acc:any,t) => { const c = t.incomeCategory||"OTHER"; acc[c]=(acc[c]||0)+Number(t.amount); return acc; }, {});
    const total = transactions.reduce((s,t)=>s+Number(t.amount),0);
    return ok({ transactions, summary, total });
  });
}