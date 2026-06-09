import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, qs } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const s = qs(req);
    const page = parseInt(s.get("page")||"1"), limit = parseInt(s.get("limit")||"20");
    const search = s.get("search")||"", workerStatus = s.get("workerStatus")||"", status = s.get("status")||"";
    const where: any = {};
    if (search) where.OR = [
      { firstName:{contains:search,mode:"insensitive"} }, { lastName:{contains:search,mode:"insensitive"} },
      { phone:{contains:search} }, { email:{contains:search,mode:"insensitive"} }, { memberId:{contains:search,mode:"insensitive"} },
    ];
    if (workerStatus) where.workerStatus = workerStatus;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      prisma.member.findMany({ where, skip:(page-1)*limit, take:limit, orderBy:{createdAt:"desc"},
        select:{id:true,memberId:true,firstName:true,lastName:true,phone:true,email:true,gender:true,profilePhoto:true,status:true,workerStatus:true,baptismStatus:true,zone:true,joinedDate:true,department:{select:{id:true,name:true}},houseFellowship:{select:{id:true,name:true}}} }),
      prisma.member.count({ where }),
    ]);
    return ok({ data, pagination:{page,limit,total,totalPages:Math.ceil(total/limit),hasNext:page<Math.ceil(total/limit),hasPrev:page>1} });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async user => {
    const data = await req.json();
    const existing = await prisma.member.findUnique({ where:{phone:data.phone} });
    if (existing) return err("Phone number already registered", 409);
    const year = new Date().getFullYear(), count = await prisma.member.count();
    const memberId = `GJP-${year}-${String(count+1).padStart(4,"0")}`;
    const clean: any = { memberId, createdById: user.userId };
    Object.entries(data).forEach(([k,v]) => { if(v !== "" && v !== null && v !== undefined) clean[k] = v; });
    ["dateOfBirth","weddingAnniversary","baptismDate","foundationSchoolDate","convertDate","joinedDate"].forEach(f => {
      if (clean[f]) clean[f] = new Date(clean[f]);
    });
    const member = await prisma.member.create({ data:clean, include:{department:{select:{id:true,name:true}},houseFellowship:{select:{id:true,name:true}}} });
    return ok(member, 201);
  }, ["PASTOR","SECRETARY","SUPER_ADMIN"]);
}