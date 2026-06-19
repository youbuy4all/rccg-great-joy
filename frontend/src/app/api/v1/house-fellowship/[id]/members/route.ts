import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async () => {
    const { id } = await params;
    const members = await prisma.member.findMany({
      where:   { houseFellowshipId: id, status: { not: "INACTIVE" } },
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
    const { id }      = await params;
    const { memberId } = await req.json();
    await prisma.member.update({
      where: { id: memberId },
      data:  { houseFellowshipId: id },
    });
    return ok({ message: "Member assigned to house fellowship" });
  }, ["PASTOR", "SECRETARY", "SUPER_ADMIN"]);
}
