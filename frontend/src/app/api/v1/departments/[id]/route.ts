import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const dept = await prisma.department.findUnique({ where:{id}, include:{hod:{select:{id:true,firstName:true,lastName:true,phone:true}},members:{where:{status:"ACTIVE"},select:{id:true,firstName:true,lastName:true,phone:true,workerStatus:true,profilePhoto:true},orderBy:{firstName:"asc"}}} });
    if (!dept) return err("Department not found", 404);
    const expenses = await prisma.transaction.findMany({ where:{departmentId:id,type:"EXPENSE"}, orderBy:{transactionDate:"desc"}, take:10, select:{id:true,reference:true,expenseCategory:true,amount:true,description:true,transactionDate:true} });
    return ok({ ...dept, memberCount:dept.members.length, totalSpent:expenses.reduce((s,e)=>s+Number(e.amount),0), recentExpenses:expenses });
  });
}

export async function PATCH(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const data = await req.json();
    const dept = await prisma.department.update({ where:{id}, data:{ name:data.name, description:data.description, hodId:data.hodId||undefined, budget:data.budget, isActive:data.isActive }, include:{hod:{select:{id:true,firstName:true,lastName:true}}} });
    return ok(dept);
  }, ["PASTOR","SUPER_ADMIN"]);
}

export async function DELETE(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    await prisma.department.update({ where:{id}, data:{isActive:false} });
    return ok({ message:"Department deactivated" });
  }, ["PASTOR","SUPER_ADMIN"]);
}