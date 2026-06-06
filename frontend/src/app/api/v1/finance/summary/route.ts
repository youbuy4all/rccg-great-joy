import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth, qs } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const s = qs(req);
    const now = new Date();
    const m = parseInt(s.get("month")||String(now.getMonth()+1));
    const y = parseInt(s.get("year")||String(now.getFullYear()));
    const start = new Date(y,m-1,1), end = new Date(y,m,0);
    const where = { transactionDate:{gte:start,lte:end} };
    const [income,expenses,remitted,breakdown,expBreakdown] = await Promise.all([
      prisma.transaction.aggregate({ where:{...where,type:"INCOME"}, _sum:{amount:true} }),
      prisma.transaction.aggregate({ where:{...where,type:"EXPENSE"}, _sum:{amount:true} }),
      prisma.transaction.aggregate({ where:{...where,type:"INCOME",isRemitted:true}, _sum:{remittanceAmount:true} }),
      prisma.transaction.groupBy({ by:["incomeCategory"], where:{...where,type:"INCOME"}, _sum:{amount:true} }),
      prisma.transaction.groupBy({ by:["expenseCategory"], where:{...where,type:"EXPENSE"}, _sum:{amount:true} }),
    ]);
    const totalIncome = Number(income._sum.amount||0);
    const totalExpenses = Number(expenses._sum.amount||0);
    const totalRemitted = Number(remitted._sum.remittanceAmount||0);
    return ok({ period:{month:m,year:y}, totalIncome, totalExpenses, netSurplus:totalIncome-totalExpenses, totalRemitted, parishRetained:totalIncome-totalRemitted,
      incomeBreakdown:breakdown.map(b=>({category:b.incomeCategory,amount:Number(b._sum.amount||0)})),
      expenseBreakdown:expBreakdown.map(b=>({category:b.expenseCategory,amount:Number(b._sum.amount||0)})) });
  }, ["PASTOR","TREASURER","AUDITOR","SUPER_ADMIN"]);
}