import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, writeAuditLog } from "@/lib/api-helpers";

const schema = z.object({
  numberOfBirths:                 z.coerce.number().int().min(0).optional(),
  numberOfDeaths:                 z.coerce.number().int().min(0).optional(),
  numberOfMarriages:               z.coerce.number().int().min(0).optional(),
  newlyBaptisedWorkers:             z.coerce.number().int().min(0).optional(),
  avgVigilAttendance:               z.coerce.number().int().min(0).optional(),
  avgSpecialProgrammeAttendance:    z.coerce.number().int().min(0).optional(),
  numberOfBaptisedWorkers:          z.coerce.number().int().min(0).optional(),
  numberOfNewWorkers:               z.coerce.number().int().min(0).optional(),
  numberOfDeacons:                  z.coerce.number().int().min(0).optional(),
  numberOfAssistantPastors:         z.coerce.number().int().min(0).optional(),
  numberOfFullPastors:              z.coerce.number().int().min(0).optional(),
  numberOfUnordainedMinisters:      z.coerce.number().int().min(0).optional(),
  areaRequiringPraise:              z.string().optional(),
  areaRequiringPrayer:              z.string().optional(),
  generalWellBeing:                 z.string().optional(),
  otherRemarks:                     z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async user => {
    const { id } = await params;
    const existing = await prisma.monthlyReturn.findUnique({ where: { id } });
    if (!existing) return err("Return not found", 404);

    const data = schema.parse(await req.json());

    const updated = await prisma.monthlyReturn.update({
      where: { id },
      data,
    });

    await writeAuditLog({
      userId:    user.userId,
      action:    "UPDATE_PASTORAL_REPORT",
      entity:    "MonthlyReturn",
      entityId:  id,
      newValues: data,
      req,
    });

    return ok(updated);
  }, ["PASTOR", "SECRETARY", "SUPER_ADMIN"]);
}
