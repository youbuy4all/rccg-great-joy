import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { authenticate, requireTreasurer, requireAuditor, requireAdmin } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { ReturnStatus } from "@prisma/client";

const router = Router();
router.use(authenticate);

// ─── Validation schemas ───────────────────────
const periodSchema = z.object({
  month: z.union([z.string().transform(v => parseInt(v)), z.number()]),
  year:  z.union([z.string().transform(v => parseInt(v)), z.number()]),
});

const updateNotesSchema = z.object({
  notes: z.string().optional(),
  // Manual overrides (in case treasurer needs to adjust)
  newConverts:        z.number().int().min(0).optional(),
  waterBaptism:       z.number().int().min(0).optional(),
  workersInTraining:  z.number().int().min(0).optional(),
  foundationSchool:   z.number().int().min(0).optional(),
});

// ─── Helper: calculate return data from DB ────
async function calculateReturn(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);

  // ── Financial totals ──────────────────────
  const incomeByCategory = await prisma.transaction.groupBy({
    by:    ["incomeCategory"],
    where: {
      type:            "INCOME",
      transactionDate: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true, remittanceAmount: true },
  });

  const expenses = await prisma.transaction.aggregate({
    where: {
      type:            "EXPENSE",
      transactionDate: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  // Map income by category
  const income: Record<string, number> = {};
  const remittance: Record<string, number> = {};

  for (const row of incomeByCategory) {
    const cat = row.incomeCategory || "OTHER_INCOME";
    income[cat]     = Number(row._sum.amount         || 0);
    remittance[cat] = Number(row._sum.remittanceAmount || 0);
  }

  const totalRemittance = Object.values(remittance).reduce((s, v) => s + v, 0);

  // ── Attendance averages ───────────────────
  const attendanceSummary = await prisma.attendanceSession.groupBy({
    by:    ["serviceType"],
    where: {
      serviceDate: { gte: startDate, lte: endDate },
    },
    _avg: { totalCount: true },
    _count: true,
  });

  const avgByType: Record<string, number> = {};
  for (const row of attendanceSummary) {
    avgByType[row.serviceType] = Math.round(row._avg.totalCount || 0);
  }

  // ── Membership stats ──────────────────────
  const [
    totalActive, newConverts, waterBaptism,
    workersInTraining, foundationSchool,
  ] = await Promise.all([
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.member.count({
      where: {
        isNewConvert: true,
        convertDate:  { gte: startDate, lte: endDate },
      },
    }),
    prisma.member.count({
      where: {
        baptismStatus: "BAPTISED",
        baptismDate:   { gte: startDate, lte: endDate },
      },
    }),
    prisma.member.count({ where: { workerStatus: "WORKER_IN_TRAINING" } }),
    prisma.member.count({ where: { foundationSchool: true } }),
  ]);

  return {
    // Financial
    totalTithe:            income["TITHE"]                   || 0,
    totalMinistersTithe:   income["MINISTERS_TITHE"]         || 0,
    totalSundayOffering:   income["SUNDAY_LOVE_OFFERING"]    || 0,
    totalThanksgiving:     income["THANKSGIVING"]            || 0,
    totalCRM:              income["CRM"]                     || 0,
    totalChildrenOffering: income["CHILDREN_TEENS_OFFERING"] || 0,
    totalTrustFruit:       income["TRUST_FRUIT"]             || 0,
    totalFirstBorn:        income["FIRST_BORN_REDEMPTION"]   || 0,
    totalGospelFund:       income["GOSPEL_FUND"]             || 0,
    totalHFOffering:       income["HOUSE_FELLOWSHIP_OFFERING"]|| 0,
    totalBuildingFund:     income["BUILDING_FUND"]           || 0,
    totalRUN:              income["RUN"]                     || 0,
    totalCSR:              income["CSR"]                     || 0,
    totalExpenses:         Number(expenses._sum.amount       || 0),
    totalRemittance,

    // Attendance
    avgSundayAttendance:   avgByType["SUNDAY_MORNING"]  || 0,
    avgMidweekAttendance:  avgByType["DIGGING_DEEP"]    || avgByType["TUESDAY"] || 0,
    avgFaithClinic:        avgByType["FAITH_CLINIC"]    || 0,
    avgYouthService:       avgByType["YOUTH_SERVICE"]   || 0,
    avgHouseFellowship:    avgByType["HOUSE_FELLOWSHIP"]|| 0,

    // Membership
    newConverts,
    waterBaptism,
    workersInTraining,
    foundationSchool,
    totalActiveMembers: totalActive,
  };
}

// ─── GET /api/v1/returns ──────────────────────
router.get("/", requireAuditor, asyncHandler(async (req, res) => {
  const returns = await prisma.monthlyReturn.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      submittedBy: {
        select: { member: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  res.json(returns);
}));

// ─── GET /api/v1/returns/calculate ────────────
// Preview calculated return without saving
router.get("/calculate", requireAuditor, asyncHandler(async (req, res) => {
  const { month, year } = periodSchema.parse(req.query);

  const data = await calculateReturn(month, year);

  // Total all income
  const totalIncome = Object.entries(data)
    .filter(([k]) => k.startsWith("total") && !["totalExpenses","totalRemittance"].includes(k))
    .reduce((s, [, v]) => s + (v as number), 0);

  res.json({
    period: { month, year },
    ...data,
    totalIncome,
    netSurplus: totalIncome - data.totalExpenses,
    parishRetained: totalIncome - data.totalRemittance,
  });
}));

// ─── GET /api/v1/returns/:id ──────────────────
router.get("/:id", requireAuditor, asyncHandler(async (req, res) => {
  const ret = await prisma.monthlyReturn.findUnique({
    where:   { id: req.params.id },
    include: {
      submittedBy: {
        select: { member: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!ret) throw new AppError(404, "Return not found");
  res.json(ret);
}));

// ─── POST /api/v1/returns/generate ────────────
// Auto-generate return from transactions & attendance
router.post("/generate", requireTreasurer, asyncHandler(async (req, res) => {
  const { month, year } = periodSchema.parse(req.body);

  // Check if already exists
  const existing = await prisma.monthlyReturn.findUnique({
    where: { month_year: { month, year } },
  });

  if (existing && existing.status === "SUBMITTED") {
    throw new AppError(400, "This return has already been submitted and cannot be regenerated");
  }

  const data = await calculateReturn(month, year);

  // Upsert — update if draft exists, create if new
  const monthlyReturn = await prisma.monthlyReturn.upsert({
    where:  { month_year: { month, year } },
    update: { ...data, status: "DRAFT" },
    create: { month, year, status: "DRAFT", ...data },
  });

  res.status(201).json({
    ...monthlyReturn,
    message: existing
      ? "Return recalculated from latest data"
      : "Return generated successfully from transactions and attendance",
  });
}));

// ─── PATCH /api/v1/returns/:id ────────────────
// Update notes or manual overrides on a draft return
router.patch("/:id", requireTreasurer, asyncHandler(async (req, res) => {
  const existing = await prisma.monthlyReturn.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, "Return not found");

  if (existing.status === "SUBMITTED") {
    throw new AppError(400, "Cannot edit a submitted return");
  }

  const data = updateNotesSchema.parse(req.body);

  const updated = await prisma.monthlyReturn.update({
    where: { id: req.params.id },
    data,
  });

  res.json(updated);
}));

// ─── POST /api/v1/returns/:id/submit ──────────
router.post("/:id/submit", requireTreasurer, asyncHandler(async (req, res) => {
  const existing = await prisma.monthlyReturn.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, "Return not found");

  if (existing.status === "SUBMITTED") {
    throw new AppError(400, "This return has already been submitted");
  }

  const updated = await prisma.monthlyReturn.update({
    where: { id: req.params.id },
    data:  {
      status:       "SUBMITTED",
      submittedAt:  new Date(),
      submittedById:req.user!.userId,
    },
  });

  res.json({
    ...updated,
    message: `Return for ${existing.month}/${existing.year} submitted to Area Office successfully`,
  });
}));

// ─── POST /api/v1/returns/:id/acknowledge ─────
router.post("/:id/acknowledge", requireAdmin, asyncHandler(async (req, res) => {
  const existing = await prisma.monthlyReturn.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, "Return not found");

  if (existing.status !== "SUBMITTED") {
    throw new AppError(400, "Only submitted returns can be acknowledged");
  }

  const updated = await prisma.monthlyReturn.update({
    where: { id: req.params.id },
    data:  { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
  });

  res.json({ ...updated, message: "Return acknowledged" });
}));

export default router;
