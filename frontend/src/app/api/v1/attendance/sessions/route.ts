import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, qs } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const s = qs(req);
    const page  = parseInt(s.get("page")  || "1");
    const limit = parseInt(s.get("limit") || "20");
    const month = s.get("month"), year = s.get("year");
    const serviceType = s.get("serviceType") || "";

    const where: any = {};
    if (month && year) {
      where.serviceDate = {
        gte: new Date(parseInt(year), parseInt(month) - 1, 1),
        lte: new Date(parseInt(year), parseInt(month), 0),
      };
    }
    if (serviceType) where.serviceType = serviceType;

    const [data, total] = await Promise.all([
      prisma.attendanceSession.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { serviceDate: "desc" },
        include: { _count: { select: { attendance: { where: { present: true } } } } },
      }),
      prisma.attendanceSession.count({ where }),
    ]);

    return ok({
      data: data.map(s => ({ ...s, presentCount: s._count.attendance })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const data = await req.json();
    const existing = await prisma.attendanceSession.findUnique({
      where: { serviceDate_serviceType: { serviceDate: new Date(data.serviceDate), serviceType: data.serviceType } },
    });
    // Hard block — one session per date+serviceType is a genuine data-integrity rule, not just
    // a soft duplicate hint. We return the existing session so the UI can offer "edit it instead"
    // rather than just showing a raw error.
    if (existing) return err("Session already exists for this date and service type", 409, { existingId: existing.id });

    const men = data.menCount || 0, women = data.womenCount || 0, children = data.childrenCount || 0;
    const session = await prisma.attendanceSession.create({
      data: {
        serviceDate: new Date(data.serviceDate), serviceType: data.serviceType,
        preacher: data.preacher || undefined, menCount: men, womenCount: women, childrenCount: children,
        totalCount: men + women + children, sundaySchoolCount: data.sundaySchoolCount || 0,
        houseFellowshipCount: data.houseFellowshipCount || 0, notes: data.notes || undefined,
      },
    });
    return ok(session, 201);
  }, ["PASTOR", "SECRETARY", "SUPER_ADMIN"]);
}
