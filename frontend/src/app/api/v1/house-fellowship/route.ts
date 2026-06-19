import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, qs } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const hfs = await prisma.houseFellowship.findMany({
      where:   { isActive: true },
      orderBy: { name: "asc" },
      include: { members: { where: { status: "ACTIVE" }, select: { id: true } } },
    });

    return ok(hfs.map(hf => ({
      id:          hf.id,
      name:        hf.name,
      address:     hf.address,
      zone:        hf.zone,
      meetingDay:  hf.meetingDay,
      meetingTime: hf.meetingTime,
      isActive:    hf.isActive,
      leaderId:    hf.leaderId,
      memberCount: hf.members.length,
    })));
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const body = await req.json();
    if (!body.name?.trim()) return err("House fellowship name is required", 400);

    const hf = await prisma.houseFellowship.create({
      data: {
        name:        body.name.trim(),
        address:     body.address     || undefined,
        zone:        body.zone        || undefined,
        meetingDay:  body.meetingDay  || undefined,
        meetingTime: body.meetingTime || undefined,
        leaderId:    body.leaderId    || undefined,
      },
    });
    return ok(hf, 201);
  }, ["PASTOR", "SECRETARY", "SUPER_ADMIN"]);
}
