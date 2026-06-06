import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const [total,active,workers,newConverts,baptised,men,women,newThisMonth] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({where:{status:"ACTIVE"}}),
      prisma.member.count({where:{workerStatus:{not:"NONE"}}}),
      prisma.member.count({where:{isNewConvert:true}}),
      prisma.member.count({where:{baptismStatus:"BAPTISED"}}),
      prisma.member.count({where:{gender:"MALE"}}),
      prisma.member.count({where:{gender:"FEMALE"}}),
      prisma.member.count({where:{joinedDate:{gte:new Date(new Date().getFullYear(),new Date().getMonth(),1)}}}),
    ]);
    return ok({total,active,workers,newConverts,baptised,men,women,newThisMonth,unbaptised:total-baptised});
  });
}