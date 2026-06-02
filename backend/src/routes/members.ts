import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { authenticate, requireAdmin, requireSecretary } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { Gender, MemberStatus, WorkerStatus, BaptismStatus } from "@prisma/client";

const router = Router();

// All member routes require authentication
router.use(authenticate);

// ─── Validation schemas ───────────────────────
const createMemberSchema = z.object({
  firstName:          z.string().min(1),
  lastName:           z.string().min(1),
  otherNames:         z.string().optional(),
  phone:              z.string().min(10),
  phone2:             z.string().optional(),
  email:              z.string().email().optional(),
  gender:             z.nativeEnum(Gender),
  dateOfBirth:        z.string().optional(),
  weddingAnniversary: z.string().optional(),
  address:            z.string().optional(),
  status:             z.nativeEnum(MemberStatus).optional(),
  workerStatus:       z.nativeEnum(WorkerStatus).optional(),
  baptismStatus:      z.nativeEnum(BaptismStatus).optional(),
  baptismDate:        z.string().optional(),
  foundationSchool:   z.boolean().optional(),
  foundationSchoolDate:z.string().optional(),
  isFirstTimer:       z.boolean().optional(),
  isNewConvert:       z.boolean().optional(),
  convertDate:        z.string().optional(),
  zone:               z.string().optional(),
  area:               z.string().optional(),
  houseFellowshipId:  z.string().optional(),
  departmentId:       z.string().optional(),
  joinedDate:         z.string().optional(),
  notes:              z.string().optional(),
});

const updateMemberSchema = createMemberSchema.partial();

const querySchema = z.object({
  page:         z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit:        z.string().optional().transform(v => v ? parseInt(v) : 20),
  search:       z.string().optional(),
  status:       z.nativeEnum(MemberStatus).optional(),
  workerStatus: z.nativeEnum(WorkerStatus).optional(),
  gender:       z.nativeEnum(Gender).optional(),
  department:   z.string().optional(),
  fellowship:   z.string().optional(),
  zone:         z.string().optional(),
  baptised:     z.string().optional().transform(v => v === "true" ? true : v === "false" ? false : undefined),
});

// ─── Helper: generate next member ID ─────────
async function generateMemberId(): Promise<string> {
  const year  = new Date().getFullYear();
  const count = await prisma.member.count();
  return `GJP-${year}-${String(count + 1).padStart(4, "0")}`;
}

// ─── GET /api/v1/members ──────────────────────
router.get("/", asyncHandler(async (req, res) => {
  const query = querySchema.parse(req.query);
  const { page, limit, search, status, workerStatus, gender, department, fellowship, zone, baptised } = query;

  const skip = (page - 1) * limit;

  // Build filter
  const where: any = {};

  if (search) {
    where.OR = [
      { firstName:  { contains: search, mode: "insensitive" } },
      { lastName:   { contains: search, mode: "insensitive" } },
      { phone:      { contains: search } },
      { email:      { contains: search, mode: "insensitive" } },
      { memberId:   { contains: search, mode: "insensitive" } },
    ];
  }

  if (status)       where.status       = status;
  if (workerStatus) where.workerStatus = workerStatus;
  if (gender)       where.gender       = gender;
  if (zone)         where.zone         = { contains: zone, mode: "insensitive" };
  if (department)   where.departmentId = department;
  if (fellowship)   where.houseFellowshipId = fellowship;
  if (baptised !== undefined) {
    where.baptismStatus = baptised ? "BAPTISED" : "NOT_BAPTISED";
  }

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, memberId: true, firstName: true, lastName: true,
        phone: true, email: true, gender: true, profilePhoto: true,
        status: true, workerStatus: true, baptismStatus: true,
        zone: true, joinedDate: true,
        department:     { select: { id: true, name: true } },
        houseFellowship:{ select: { id: true, name: true } },
      },
    }),
    prisma.member.count({ where }),
  ]);

  res.json({
    data: members,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  });
}));

// ─── GET /api/v1/members/stats ────────────────
router.get("/stats", asyncHandler(async (req, res) => {
  const [
    total, active, workers, newConverts,
    baptised, men, women, thisMonth,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.member.count({ where: { workerStatus: { not: "NONE" } } }),
    prisma.member.count({ where: { isNewConvert: true } }),
    prisma.member.count({ where: { baptismStatus: "BAPTISED" } }),
    prisma.member.count({ where: { gender: "MALE" } }),
    prisma.member.count({ where: { gender: "FEMALE" } }),
    prisma.member.count({
      where: {
        joinedDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  res.json({
    total, active, workers, newConverts,
    baptised, men, women, newThisMonth: thisMonth,
    unbaptised: total - baptised,
  });
}));

// ─── GET /api/v1/members/:id ──────────────────
router.get("/:id", asyncHandler(async (req, res) => {
  const member = await prisma.member.findUnique({
    where: { id: req.params.id },
    include: {
      department:      { select: { id: true, name: true } },
      houseFellowship: { select: { id: true, name: true, zone: true } },
      user:            { select: { id: true, email: true, role: true, lastLoginAt: true } },
    },
  });

  if (!member) throw new AppError(404, "Member not found");
  res.json(member);
}));

// ─── GET /api/v1/members/:id/giving ──────────
router.get("/:id/giving", asyncHandler(async (req, res) => {
  const { year, month } = req.query;

  const where: any = {
    memberId: req.params.id,
    type:     "INCOME",
  };

  if (year) {
    const y = parseInt(year as string);
    where.transactionDate = {
      gte: new Date(y, month ? parseInt(month as string) - 1 : 0, 1),
      lte: new Date(y, month ? parseInt(month as string) : 12, 0),
    };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { transactionDate: "desc" },
    select: {
      id: true, reference: true, incomeCategory: true,
      amount: true, transactionDate: true, paymentMethod: true,
    },
  });

  // Group by category for summary
  const summary = transactions.reduce((acc: any, t) => {
    const cat = t.incomeCategory || "OTHER";
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += Number(t.amount);
    return acc;
  }, {});

  const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  res.json({ transactions, summary, total });
}));

// ─── GET /api/v1/members/:id/attendance ──────
router.get("/:id/attendance", asyncHandler(async (req, res) => {
  const { year, month } = req.query;

  const where: any = { memberId: req.params.id };

  if (year) {
    const y = parseInt(year as string);
    where.session = {
      serviceDate: {
        gte: new Date(y, month ? parseInt(month as string) - 1 : 0, 1),
        lte: new Date(y, month ? parseInt(month as string) : 12, 0),
      },
    };
  }

  const records = await prisma.attendance.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      session: {
        select: { serviceDate: true, serviceType: true, preacher: true },
      },
    },
  });

  const present = records.filter(r => r.present).length;
  const total   = records.length;

  res.json({
    records,
    summary: {
      present,
      absent: total - present,
      total,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
    },
  });
}));

// ─── POST /api/v1/members ─────────────────────
router.post("/", requireSecretary, asyncHandler(async (req, res) => {
  const data = createMemberSchema.parse(req.body);

  // Check phone uniqueness
  const existing = await prisma.member.findUnique({ where: { phone: data.phone } });
  if (existing) throw new AppError(409, "A member with this phone number already exists");

  const memberId = await generateMemberId();

  const member = await prisma.member.create({
    data: {
      memberId,
      ...data,
      dateOfBirth:         data.dateOfBirth         ? new Date(data.dateOfBirth)         : undefined,
      weddingAnniversary:  data.weddingAnniversary  ? new Date(data.weddingAnniversary)  : undefined,
      baptismDate:         data.baptismDate         ? new Date(data.baptismDate)         : undefined,
      foundationSchoolDate:data.foundationSchoolDate? new Date(data.foundationSchoolDate): undefined,
      convertDate:         data.convertDate         ? new Date(data.convertDate)         : undefined,
      joinedDate:          data.joinedDate          ? new Date(data.joinedDate)          : new Date(),
      createdById:         req.user!.userId,
    },
    include: {
      department:      { select: { id: true, name: true } },
      houseFellowship: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(member);
}));

// ─── PATCH /api/v1/members/:id ────────────────
router.patch("/:id", requireSecretary, asyncHandler(async (req, res) => {
  const data = updateMemberSchema.parse(req.body);

  // Check member exists
  const existing = await prisma.member.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, "Member not found");

  // Check phone uniqueness if changing
  if (data.phone && data.phone !== existing.phone) {
    const phoneExists = await prisma.member.findUnique({ where: { phone: data.phone } });
    if (phoneExists) throw new AppError(409, "This phone number belongs to another member");
  }

  const member = await prisma.member.update({
    where: { id: req.params.id },
    data: {
      ...data,
      dateOfBirth:         data.dateOfBirth         ? new Date(data.dateOfBirth)         : undefined,
      weddingAnniversary:  data.weddingAnniversary  ? new Date(data.weddingAnniversary)  : undefined,
      baptismDate:         data.baptismDate         ? new Date(data.baptismDate)         : undefined,
      foundationSchoolDate:data.foundationSchoolDate? new Date(data.foundationSchoolDate): undefined,
      convertDate:         data.convertDate         ? new Date(data.convertDate)         : undefined,
      joinedDate:          data.joinedDate          ? new Date(data.joinedDate)          : undefined,
    },
    include: {
      department:      { select: { id: true, name: true } },
      houseFellowship: { select: { id: true, name: true } },
    },
  });

  res.json(member);
}));

// ─── DELETE /api/v1/members/:id ───────────────
router.delete("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const member = await prisma.member.findUnique({ where: { id: req.params.id } });
  if (!member) throw new AppError(404, "Member not found");

  // Soft delete — set status to INACTIVE rather than hard delete
  await prisma.member.update({
    where: { id: req.params.id },
    data:  { status: "INACTIVE" },
  });

  res.json({ message: "Member deactivated successfully" });
}));

// ─── GET /api/v1/members/birthdays/upcoming ──
router.get("/birthdays/upcoming", asyncHandler(async (req, res) => {
  const today    = new Date();
  const thisMonth = today.getMonth() + 1;
  const nextMonth = thisMonth === 12 ? 1 : thisMonth + 1;

  const members = await prisma.member.findMany({
    where: {
      dateOfBirth: { not: null },
      status: "ACTIVE",
    },
    select: {
      id: true, firstName: true, lastName: true,
      phone: true, dateOfBirth: true, profilePhoto: true,
    },
  });

  // Filter to this month and next month birthdays
  const upcoming = members
    .filter(m => {
      const month = m.dateOfBirth!.getMonth() + 1;
      return month === thisMonth || month === nextMonth;
    })
    .map(m => ({
      ...m,
      birthdayMonth: m.dateOfBirth!.getMonth() + 1,
      birthdayDay:   m.dateOfBirth!.getDate(),
    }))
    .sort((a, b) => a.birthdayDay - b.birthdayDay);

  res.json(upcoming);
}));

export default router;
