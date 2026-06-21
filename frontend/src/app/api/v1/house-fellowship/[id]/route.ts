import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, writeAuditLog } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const hf = await prisma.houseFellowship.findUnique({
      where: { id },
      include: { members: { where: { status: { not: "INACTIVE" } }, select: { id: true, firstName: true, lastName: true, phone: true } } },
    });
    if (!hf) return err("House fellowship not found", 404);
    return ok({ ...hf, memberCount: hf.members.length });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async user => {
    const { id } = await params;
    const existing = await prisma.houseFellowship.findUnique({ where: { id } });
    if (!existing) return err("House fellowship not found", 404);

    const data = await req.json();
    if (data.name !== undefined && !data.name.trim()) return err("Name cannot be empty", 400);

    const updated = await prisma.houseFellowship.update({
      where: { id },
      data: {
        name:        data.name?.trim()        ?? undefined,
        address:     data.address              ?? undefined,
        zone:        data.zone                 ?? undefined,
        meetingDay:  data.meetingDay            ?? undefined,
        meetingTime: data.meetingTime           ?? undefined,
        leaderId:    data.leaderId              ?? undefined,
      },
    });

    await writeAuditLog({
      userId:    user.userId,
      action:    "UPDATE_HOUSE_FELLOWSHIP",
      entity:    "HouseFellowship",
      entityId:  id,
      oldValues: { name: existing.name },
      newValues: { name: updated.name },
      req,
    });

    return ok(updated);
  }, ["PASTOR", "SECRETARY", "SUPER_ADMIN"]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async user => {
    const { id } = await params;
    const existing = await prisma.houseFellowship.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!existing) return err("House fellowship not found", 404);

    // Soft delete — same pattern as Department. Members keep their history;
    // the fellowship just stops appearing in active lists and dropdowns.
    await prisma.houseFellowship.update({ where: { id }, data: { isActive: false } });

    await writeAuditLog({
      userId:    user.userId,
      action:    "DELETE_HOUSE_FELLOWSHIP",
      entity:    "HouseFellowship",
      entityId:  id,
      oldValues: { name: existing.name, memberCount: existing._count.members },
      req,
    });

    return ok({ message: "House fellowship removed" });
  }, ["PASTOR", "SECRETARY", "SUPER_ADMIN"]);
}
