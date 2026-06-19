import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const members = await prisma.member.findMany({
      where:   { departmentId: id, status: { not: "INACTIVE" } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true, memberId: true, firstName: true, lastName: true,
        phone: true, gender: true, workerStatus: true, status: true, profilePhoto: true,
      },
    });
    return ok(members);
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async () => {
    const { id }       = await params;
    const { memberId } = await req.json();
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return err("Member not found", 404);
    await prisma.member.update({ where: { id: memberId }, data: { departmentId: id } });
    return ok({ message: "Member assigned to department" });
  }, ["PASTOR", "SECRETARY", "SUPER_ADMIN"]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async () => {
    const { id }       = await params;
    const { memberId } = await req.json();
    await prisma.member.update({ where: { id: memberId, departmentId: id }, data: { departmentId: null } });
    return ok({ message: "Member removed from department" });
  }, ["PASTOR", "SECRETARY", "SUPER_ADMIN"]);
}
