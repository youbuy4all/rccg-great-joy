import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth, qs } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const s = qs(req);
    const now=new Date(), m=parseInt(s.get("month")||String(now.getMonth()+1)), y=parseInt(s.get("year")||String(now.getFullYear()));
    const transactions = await prisma.transaction.findMany({ where:{type:"INCOME",transactionDate:{gte:new Date(y,m-1,1),lte:new Date(y,m,0)}}, select:{id:true,incomeCategory:true,amount:true,remittanceAmount:true,isRemitted:true} });
    const byCategory: Record<string,{total:number,remittance:number,remitted:boolean}> = {};
    for (const t of transactions) {
      const cat = t.incomeCategory||"OTHER_INCOME";
      if (!byCategory[cat]) byCategory[cat] = {total:0,remittance:0,remitted:false};
      byCategory[cat].total += Number(t.amount);
      byCategory[cat].remittance += Number(t.remittanceAmount||0);
      if (t.isRemitted) byCategory[cat].remitted = true;
    }
    const totalDue = Object.values(byCategory).reduce((s,c)=>s+c.remittance,0);
    const totalRemitted = transactions.filter(t=>t.isRemitted).reduce((s,t)=>s+Number(t.remittanceAmount||0),0);
    return ok({ period:{month:m,year:y}, breakdown:byCategory, totalDue, totalRemitted, outstanding:totalDue-totalRemitted });
  }, ["PASTOR","TREASURER","SUPER_ADMIN"]);
}