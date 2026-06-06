import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth, qs } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const s = qs(req);
    const year = s.get("year"), month = s.get("month");
    const where: any = { memberId:id };
    if (year) { const y=parseInt(year); where.session={ serviceDate:{ gte:new Date(y,month?parseInt(month)-1:0,1), lte:new Date(y,month?parseInt(month):12,0) } }; }
    const records = await prisma.attendance.findMany({ where, orderBy:{createdAt:"desc"}, include:{session:{select:{serviceDate:true,serviceType:true,preacher:true}}} });
    const present = records.filter(r=>r.present).length;
    return ok({ records, summary:{present,absent:records.length-present,total:records.length,rate:records.length>0?Math.round((present/records.length)*100):0} });
  });
}