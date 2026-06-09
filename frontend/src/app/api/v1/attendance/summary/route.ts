import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth, qs } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const s = qs(req);
    const now=new Date(), m=parseInt(s.get("month")||String(now.getMonth()+1)), y=parseInt(s.get("year")||String(now.getFullYear()));
    const sessions = await prisma.attendanceSession.findMany({ where:{serviceDate:{gte:new Date(y,m-1,1),lte:new Date(y,m,0)}}, orderBy:{serviceDate:"asc"} });
    const byType: Record<string,{count:number,total:number,avg:number}> = {};
    for (const s of sessions) {
      if (!byType[s.serviceType]) byType[s.serviceType] = {count:0,total:0,avg:0};
      byType[s.serviceType].count++;
      byType[s.serviceType].total += s.totalCount;
    }
    for (const t in byType) byType[t].avg = byType[t].count>0?Math.round(byType[t].total/byType[t].count):0;
    const overallAvg = sessions.length>0?Math.round(sessions.reduce((s,sess)=>s+sess.totalCount,0)/sessions.length):0;
    const highest = sessions.reduce((max,s)=>s.totalCount>max.totalCount?s:max, sessions[0]||{totalCount:0,serviceDate:null,serviceType:null} as any);
    return ok({ period:{month:m,year:y}, totalSessions:sessions.length, overallAvg, highestAttendance:{count:highest?.totalCount||0,date:highest?.serviceDate,service:highest?.serviceType}, byServiceType:byType });
  });
}