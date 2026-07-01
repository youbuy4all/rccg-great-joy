import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) return err("No IDs provided", 400);

    const { count } = await prisma.attendanceSession.deleteMany({ where: { id: { in: ids } } });

    return ok({ deleted: count });
  }, ["PASTOR", "SECRETARY", "TREASURER", "SUPER_ADMIN"]);
}
