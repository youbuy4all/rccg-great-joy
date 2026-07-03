import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, qs, writeAuditLog } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const s = qs(req);
    const page  = parseInt(s.get("page")  || "1");
    const limit = parseInt(s.get("limit") || "20");

    const search           = s.get("search")           || "";
    const workerStatus     = s.get("workerStatus")      || "";   // exact value, or "ANY" = any non-NONE
    const status           = s.get("status")            || "";
    const baptismStatus    = s.get("baptismStatus")     || "";
    const departmentId     = s.get("departmentId")      || "";
    const houseFellowshipId= s.get("houseFellowshipId") || "";
    const newThisMonth     = s.get("newThisMonth")       === "true";

    const where: any = {};

    if (search) where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName:  { contains: search, mode: "insensitive" } },
      { phone:     { contains: search } },
      { email:     { contains: search, mode: "insensitive" } },
      { memberId:  { contains: search, mode: "insensitive" } },
    ];

    if (workerStatus === "ANY")      where.workerStatus = { not: "NONE" };
    else if (workerStatus)           where.workerStatus = workerStatus;

    if (status)                      where.status = status;
    if (baptismStatus)               where.baptismStatus = baptismStatus;
    if (departmentId)                where.departmentId = departmentId;
    if (houseFellowshipId)           where.houseFellowshipId = houseFellowshipId;

    if (newThisMonth) {
      const now = new Date();
      where.joinedDate = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    }

    const [data, total] = await Promise.all([
      prisma.member.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" },
        select: {
          id:true, memberId:true, firstName:true, lastName:true, phone:true, email:true,
          gender:true, profilePhoto:true, status:true, workerStatus:true, baptismStatus:true,
          zone:true, ageGroup:true, joinedDate:true,
          department:      { select: { id:true, name:true } },
          houseFellowship: { select: { id:true, name:true } },
        },
      }),
      prisma.member.count({ where }),
    ]);

    return ok({
      data,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext:    page < Math.ceil(total / limit),
        hasPrev:    page > 1,
      },
    });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async user => {
    const data = await req.json();

    // ── Duplicate-entry safety check (soft) ─────────────────────────
    // Matches on phone number only, since it's the most reliable identifier.
    // This is intentionally NOT a hard database constraint (phone is no longer
    // @unique in the schema) because family members sometimes legitimately
    // share one phone number. Callers can pass `force: true` to save anyway.
    if (!data.force) {
      const existing = await prisma.member.findFirst({
        where: { phone: data.phone },
        select: { id: true, firstName: true, lastName: true, memberId: true },
      });
      if (existing) {
        return err(
          `A member with this phone number already exists: ${existing.firstName} ${existing.lastName} (${existing.memberId}). This could be a family member sharing a phone, or a duplicate entry.`,
          409,
          { existingId: existing.id }
        );
      }
    }

    const year = new Date().getFullYear(), count = await prisma.member.count();
    const memberId = `GJP-${year}-${String(count + 1).padStart(4, "0")}`;

    const clean: any = { memberId, createdById: user.userId };
    Object.entries(data).forEach(([k, v]) => { if (v !== "" && v !== null && v !== undefined) clean[k] = v; });
    ["dateOfBirth","weddingAnniversary","baptismDate","foundationSchoolDate","convertDate","joinedDate"]
      .forEach(f => { if (clean[f]) clean[f] = new Date(clean[f]); });

    const member = await prisma.member.create({
      data: clean,
      include: { department: { select:{id:true,name:true} }, houseFellowship: { select:{id:true,name:true} } },
    });

    await writeAuditLog({
      userId:    user.userId,
      action:    "CREATE_MEMBER",
      entity:    "Member",
      entityId:  member.id,
      newValues: { memberId: member.memberId, firstName: member.firstName, lastName: member.lastName, phone: member.phone },
      req,
    });

    return ok(member, 201);
  }, ["PASTOR", "SECRETARY", "SUPER_ADMIN"]);
}
