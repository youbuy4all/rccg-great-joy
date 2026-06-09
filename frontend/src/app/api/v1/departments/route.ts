import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const departments = await prisma.department.findMany({ where:{isActive:true}, orderBy:{name:"asc"}, include:{hod:{select:{id:true,firstName:true,lastName:true,profilePhoto:true}},_count:{select:{members:true}}} });
    const spending = await prisma.transaction.groupBy({ by:["departmentId"], where:{type:"EXPENSE",departmentId:{not:null}}, _sum:{amount:true} });
    const spendMap = spending.reduce((acc:any,s)=>{acc[s.departmentId!]=Number(s._sum.amount||0);return acc;},{});
    return ok(departments.map(d=>({...d,memberCount:d._count.members,spent:spendMap[d.id]||0,remaining:Number(d.budget)-(spendMap[d.id]||0),budgetUsedPct:Number(d.budget)>0?Math.round(((spendMap[d.id]||0)/Number(d.budget))*100):0})));
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const data = await req.json();
    const existing = await prisma.department.findUnique({ where:{name:data.name} });
    if (existing) return err("Department already exists", 409);
    const dept = await prisma.department.create({ data:{ name:data.name, description:data.description||undefined, hodId:data.hodId||undefined, budget:data.budget||0 }, include:{hod:{select:{id:true,firstName:true,lastName:true}}} });
    return ok(dept, 201);
  }, ["PASTOR","SUPER_ADMIN"]);
}