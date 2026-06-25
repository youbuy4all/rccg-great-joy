import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, writeAuditLog } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        department:      { select: { id:true, name:true } },
        houseFellowship: { select: { id:true, name:true } },
        user:            { select: { id:true, email:true, role:true, lastLoginAt:true } },
      },
    });
    if (!member) return err("Member not found", 404);
    return ok(member);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async user => {
    const { id } = await params;
    const before = await prisma.member.findUnique({ where: { id }, select: { firstName:true, lastName:true, status:true } });
    if (!before) return err("Member not found", 404);
    const data = await req.json();
    const clean: any = {};
    Object.entries(data).forEach(([k, v]) => { if (v !== "" && v !== null && v !== undefined) clean[k] = v; });
    ["dateOfBirth","weddingAnniversary","baptismDate","foundationSchoolDate","convertDate","joinedDate"]
      .forEach(f => { if (clean[f]) clean[f] = new Date(clean[f]); });
    const member = await prisma.member.update({ where: { id }, data: clean,
      include: { department: { select:{id:true,name:true} }, houseFellowship: { select:{id:true,name:true} } } });
    await writeAuditLog({ userId: user.userId, action: "UPDATE_MEMBER", entity: "Member", entityId: id, oldValues: before, newValues: clean, req });
    return ok(member);
  }, ["PASTOR", "SECRETARY", "SUPER_ADMIN"]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async user => {
    const { id } = await params;
    await prisma.member.update({ where: { id }, data: { status: "INACTIVE" } });
    await writeAuditLog({ userId: user.userId, action: "DEACTIVATE_MEMBER", entity: "Member", entityId: id, newValues: { status: "INACTIVE" }, req });
    return ok({ message: "Member deactivated" });
  }, ["PASTOR", "SUPER_ADMIN"]);
}
