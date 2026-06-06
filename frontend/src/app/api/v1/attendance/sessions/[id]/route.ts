import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const session = await prisma.attendanceSession.findUnique({ where:{id}, include:{attendance:{include:{member:{select:{id:true,firstName:true,lastName:true,profilePhoto:true,department:{select:{name:true}}}}},orderBy:{member:{firstName:"asc"}}}} });
    if (!session) return err("Session not found", 404);
    const present = session.attendance.filter(a=>a.present).length;
    return ok({ ...session, summary:{present,absent:session.attendance.length-present,total:session.attendance.length} });
  });
}

export async function PATCH(req: NextRequest, { params }:{ params: Promise<{id:string}> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const data = await req.json();
    const existing = await prisma.attendanceSession.findUnique({ where:{id} });
    if (!existing) return err("Session not found", 404);
    const men=data.menCount??existing.menCount, women=data.womenCount??existing.womenCount, children=data.childrenCount??existing.childrenCount;
    const session = await prisma.attendanceSession.update({ where:{id}, data:{...data,serviceDate:data.serviceDate?new Date(data.serviceDate):undefined,menCount:men,womenCount:women,childrenCount:children,totalCount:men+women+children} });
    return ok(session);
  }, ["PASTOR","SECRETARY","SUPER_ADMIN"]);
}