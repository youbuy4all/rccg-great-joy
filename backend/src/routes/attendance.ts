import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { authenticate, requireSecretary } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { ServiceType } from "@prisma/client";

const router = Router();
router.use(authenticate);

// ─── Validation schemas ───────────────────────
const createSessionSchema = z.object({
  serviceDate:          z.string(),
  serviceType:          z.nativeEnum(ServiceType),
  preacher:             z.string().optional(),
  menCount:             z.number().int().min(0).optional(),
  womenCount:           z.number().int().min(0).optional(),
  childrenCount:        z.number().int().min(0).optional(),
  sundaySchoolCount:    z.number().int().min(0).optional(),
  houseFellowshipCount: z.number().int().min(0).optional(),
  notes:                z.string().optional(),
});

const markAttendanceSchema = z.object({
  sessionId: z.string(),
  records:   z.array(z.object({
    memberId: z.string(),
    present:  z.boolean(),
  })).min(1),
});

const querySchema = z.object({
  page:        z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit:       z.string().optional().transform(v => v ? parseInt(v) : 20),
  serviceType: z.nativeEnum(ServiceType).optional(),
  startDate:   z.string().optional(),
  endDate:     z.string().optional(),
  month:       z.string().optional().transform(v => v ? parseInt(v) : undefined),
  year:        z.string().optional().transform(v => v ? parseInt(v) : undefined),
});

// ─── GET /api/v1/attendance/sessions ─────────
router.get("/sessions", asyncHandler(async (req, res) => {
  const { page, limit, serviceType, startDate, endDate, month, year } = querySchema.parse(req.query);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (serviceType) where.serviceType = serviceType;

  if (startDate || endDate) {
    where.serviceDate = {};
    if (startDate) where.serviceDate.gte = new Date(startDate);
    if (endDate)   where.serviceDate.lte = new Date(endDate);
  } else if (month && year) {
    where.serviceDate = {
      gte: new Date(year, month - 1, 1),
      lte: new Date(year, month, 0),
    };
  }

  const [sessions, total] = await Promise.all([
    prisma.attendanceSession.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { serviceDate: "desc" },
      include: {
        _count: { select: { attendance: { where: { present: true } } } },
      },
    }),
    prisma.attendanceSession.count({ where }),
  ]);

  res.json({
    data: sessions.map(s => ({
      ...s,
      presentCount: s._count.attendance,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}));

// ─── GET /api/v1/attendance/sessions/:id ─────
router.get("/sessions/:id", asyncHandler(async (req, res) => {
  const session = await prisma.attendanceSession.findUnique({
    where:   { id: req.params.id },
    include: {
      attendance: {
        include: {
          member: {
            select: {
              id: true, firstName: true, lastName: true,
              profilePhoto: true, department: { select: { name: true } },
            },
          },
        },
        orderBy: { member: { firstName: "asc" } },
      },
    },
  });

  if (!session) throw new AppError(404, "Session not found");

  const present = session.attendance.filter(a => a.present).length;
  const absent  = session.attendance.filter(a => !a.present).length;

  res.json({
    ...session,
    summary: { present, absent, total: session.attendance.length },
  });
}));

// ─── POST /api/v1/attendance/sessions ─────────
router.post("/sessions", requireSecretary, asyncHandler(async (req, res) => {
  const data = createSessionSchema.parse(req.body);

  // Check for duplicate session (same date + type)
  const existing = await prisma.attendanceSession.findUnique({
    where: {
      serviceDate_serviceType: {
        serviceDate:  new Date(data.serviceDate),
        serviceType:  data.serviceType,
      },
    },
  });
  if (existing) {
    throw new AppError(409, "An attendance session already exists for this date and service type");
  }

  // Auto-calculate total
  const men      = data.menCount      || 0;
  const women    = data.womenCount    || 0;
  const children = data.childrenCount || 0;
  const total    = men + women + children;

  const session = await prisma.attendanceSession.create({
    data: {
      serviceDate:          new Date(data.serviceDate),
      serviceType:          data.serviceType,
      preacher:             data.preacher,
      menCount:             men,
      womenCount:           women,
      childrenCount:        children,
      totalCount:           total,
      sundaySchoolCount:    data.sundaySchoolCount    || 0,
      houseFellowshipCount: data.houseFellowshipCount || 0,
      notes:                data.notes,
    },
  });

  res.status(201).json(session);
}));

// ─── PATCH /api/v1/attendance/sessions/:id ────
router.patch("/sessions/:id", requireSecretary, asyncHandler(async (req, res) => {
  const existing = await prisma.attendanceSession.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, "Session not found");

  const data = createSessionSchema.partial().parse(req.body);

  const men      = data.menCount      ?? existing.menCount;
  const women    = data.womenCount    ?? existing.womenCount;
  const children = data.childrenCount ?? existing.childrenCount;

  const session = await prisma.attendanceSession.update({
    where: { id: req.params.id },
    data:  {
      ...data,
      serviceDate: data.serviceDate ? new Date(data.serviceDate) : undefined,
      menCount:    men,
      womenCount:  women,
      childrenCount: children,
      totalCount:  men + women + children,
    },
  });

  res.json(session);
}));

// ─── POST /api/v1/attendance/mark ─────────────
// Mark individual members present/absent for a session
router.post("/mark", requireSecretary, asyncHandler(async (req, res) => {
  const { sessionId, records } = markAttendanceSchema.parse(req.body);

  // Verify session exists
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError(404, "Session not found");

  // Upsert attendance records
  const results = await Promise.all(
    records.map(r =>
      prisma.attendance.upsert({
        where: {
          sessionId_memberId: { sessionId, memberId: r.memberId },
        },
        update: { present: r.present },
        create: {
          sessionId,
          memberId:  r.memberId,
          present:   r.present,
          markedById:req.user!.userId,
        },
      })
    )
  );

  // Update session totals from actual marked attendance
  const presentCount = await prisma.attendance.count({
    where: { sessionId, present: true },
  });

  await prisma.attendanceSession.update({
    where: { id: sessionId },
    data:  { totalCount: presentCount },
  });

  res.json({
    message: `${results.length} attendance record(s) updated`,
    present: presentCount,
  });
}));



// ─── POST /api/v1/attendance/sessions/bulk ───
router.post("/sessions/bulk", requireSecretary, asyncHandler(async (req, res) => {
  const rows = z.array(z.object({
    serviceDate:          z.string(),
    serviceType:          z.nativeEnum(ServiceType),
    preacher:             z.string().optional(),
    menCount:             z.preprocess(v => v !== "" && v !== undefined ? Number(v) : 0, z.number().int().min(0)).optional(),
    womenCount:           z.preprocess(v => v !== "" && v !== undefined ? Number(v) : 0, z.number().int().min(0)).optional(),
    childrenCount:        z.preprocess(v => v !== "" && v !== undefined ? Number(v) : 0, z.number().int().min(0)).optional(),
    sundaySchoolCount:    z.preprocess(v => v !== "" && v !== undefined ? Number(v) : 0, z.number().int().min(0)).optional(),
    houseFellowshipCount: z.preprocess(v => v !== "" && v !== undefined ? Number(v) : 0, z.number().int().min(0)).optional(),
    notes:                z.string().optional(),
  })).parse(req.body.rows);

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const data = rows[i];
    try {
      const existing = await prisma.attendanceSession.findFirst({
        where: { serviceDate: new Date(data.serviceDate), serviceType: data.serviceType },
      });
      if (existing) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: Session for ${data.serviceDate} (${data.serviceType}) already exists — skipped`);
        continue;
      }
      const men      = data.menCount      ?? 0;
      const women    = data.womenCount    ?? 0;
      const children = data.childrenCount ?? 0;
      await prisma.attendanceSession.create({
        data: {
          serviceDate:          new Date(data.serviceDate),
          serviceType:          data.serviceType,
          preacher:             data.preacher,
          menCount:             men,
          womenCount:           women,
          childrenCount:        children,
          totalCount:           men + women + children,
          sundaySchoolCount:    data.sundaySchoolCount,
          houseFellowshipCount: data.houseFellowshipCount,
          notes:                data.notes,
          createdById:          req.user!.userId,
        },
      });
      results.created++;
    } catch (e: any) {
      results.skipped++;
      results.errors.push(`Row ${i + 1}: ${e.message}`);
    }
  }

  res.json(results);
}));
// ─── GET /api/v1/attendance/summary ──────────
// Monthly attendance summary for returns
router.get("/summary", asyncHandler(async (req, res) => {
  const { month, year } = querySchema.parse(req.query);
  const now = new Date();
  const y   = year  || now.getFullYear();
  const m   = month || now.getMonth() + 1;

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      serviceDate: {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0),
      },
    },
    orderBy: { serviceDate: "asc" },
  });

  // Group by service type
  const byType: Record<string, { count: number; total: number; avg: number; sessions: any[] }> = {};

  for (const s of sessions) {
    const type = s.serviceType;
    if (!byType[type]) byType[type] = { count: 0, total: 0, avg: 0, sessions: [] };
    byType[type].count++;
    byType[type].total += s.totalCount;
    byType[type].sessions.push({
      date:  s.serviceDate,
      total: s.totalCount,
      men:   s.menCount,
      women: s.womenCount,
      children: s.childrenCount,
    });
  }

  // Calculate averages
  for (const type in byType) {
    byType[type].avg = byType[type].count > 0
      ? Math.round(byType[type].total / byType[type].count)
      : 0;
  }

  // Overall stats
  const totalSessions = sessions.length;
  const overallAvg    = totalSessions > 0
    ? Math.round(sessions.reduce((s, sess) => s + sess.totalCount, 0) / totalSessions)
    : 0;

  const highestAttendance = sessions.reduce((max, s) =>
    s.totalCount > max.totalCount ? s : max,
    sessions[0] || { totalCount: 0, serviceDate: null, serviceType: null }
  );

  res.json({
    period: { month: m, year: y },
    totalSessions,
    overallAvg,
    highestAttendance: {
      count:   highestAttendance?.totalCount || 0,
      date:    highestAttendance?.serviceDate,
      service: highestAttendance?.serviceType,
    },
    byServiceType: byType,
  });
}));

// ─── GET /api/v1/attendance/today ─────────────
router.get("/today", asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      serviceDate: { gte: today, lt: tomorrow },
    },
    include: {
      _count: { select: { attendance: { where: { present: true } } } },
    },
  });

  res.json(sessions.map(s => ({
    ...s,
    presentCount: s._count.attendance,
  })));
}));

export default router;
