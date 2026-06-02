import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { authenticate, requireAdmin, requireSecretary } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

// ─── Validation schemas ───────────────────────
const createDepartmentSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
  hodId:       z.string().optional(),
  budget:      z.number().min(0).optional(),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

// ─── GET /api/v1/departments ──────────────────
router.get("/", asyncHandler(async (req, res) => {
  const departments = await prisma.department.findMany({
    where:   { isActive: true },
    orderBy: { name: "asc" },
    include: {
      hod: {
        select: { id: true, firstName: true, lastName: true, profilePhoto: true },
      },
      _count: { select: { members: true } },
    },
  });

  // Get budget spent per department
  const spending = await prisma.transaction.groupBy({
    by:    ["departmentId"],
    where: { type: "EXPENSE", departmentId: { not: null } },
    _sum:  { amount: true },
  });

  const spendingMap = spending.reduce((acc: any, s) => {
    acc[s.departmentId!] = Number(s._sum.amount || 0);
    return acc;
  }, {});

  res.json(departments.map(d => ({
    ...d,
    memberCount: d._count.members,
    spent:       spendingMap[d.id] || 0,
    remaining:   Number(d.budget) - (spendingMap[d.id] || 0),
    budgetUsedPct: Number(d.budget) > 0
      ? Math.round(((spendingMap[d.id] || 0) / Number(d.budget)) * 100)
      : 0,
  })));
}));

// ─── GET /api/v1/departments/:id ──────────────
router.get("/:id", asyncHandler(async (req, res) => {
  const department = await prisma.department.findUnique({
    where:   { id: req.params.id },
    include: {
      hod: {
        select: { id: true, firstName: true, lastName: true, phone: true, profilePhoto: true },
      },
      members: {
        where:   { status: "ACTIVE" },
        select:  {
          id: true, firstName: true, lastName: true,
          phone: true, workerStatus: true, profilePhoto: true,
        },
        orderBy: { firstName: "asc" },
      },
    },
  });

  if (!department) throw new AppError(404, "Department not found");

  // Get this department's expenses
  const expenses = await prisma.transaction.findMany({
    where:   { departmentId: req.params.id, type: "EXPENSE" },
    orderBy: { transactionDate: "desc" },
    take:    10,
    select:  {
      id: true, reference: true, expenseCategory: true,
      amount: true, description: true, transactionDate: true,
    },
  });

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  res.json({
    ...department,
    memberCount:   department.members.length,
    totalSpent,
    remaining:     Number(department.budget) - totalSpent,
    recentExpenses:expenses,
  });
}));

// ─── POST /api/v1/departments ─────────────────
router.post("/", requireAdmin, asyncHandler(async (req, res) => {
  const data = createDepartmentSchema.parse(req.body);

  const existing = await prisma.department.findUnique({ where: { name: data.name } });
  if (existing) throw new AppError(409, "A department with this name already exists");

  // Verify HOD is a member if provided
  if (data.hodId) {
    const hod = await prisma.member.findUnique({ where: { id: data.hodId } });
    if (!hod) throw new AppError(404, "HOD member not found");
  }

  const department = await prisma.department.create({
    data: {
      name:        data.name,
      description: data.description,
      hodId:       data.hodId,
      budget:      data.budget || 0,
    },
    include: {
      hod: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.status(201).json(department);
}));

// ─── PATCH /api/v1/departments/:id ────────────
router.patch("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const existing = await prisma.department.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, "Department not found");

  const data = updateDepartmentSchema.parse(req.body);

  // Verify HOD if changing
  if (data.hodId) {
    const hod = await prisma.member.findUnique({ where: { id: data.hodId } });
    if (!hod) throw new AppError(404, "HOD member not found");
  }

  const department = await prisma.department.update({
    where:   { id: req.params.id },
    data,
    include: {
      hod: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.json(department);
}));

// ─── DELETE /api/v1/departments/:id ───────────
router.delete("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const existing = await prisma.department.findUnique({
    where:   { id: req.params.id },
    include: { _count: { select: { members: true } } },
  });
  if (!existing) throw new AppError(404, "Department not found");

  if (existing._count.members > 0) {
    throw new AppError(400, `Cannot delete department with ${existing._count.members} active member(s). Reassign members first.`);
  }

  await prisma.department.update({
    where: { id: req.params.id },
    data:  { isActive: false },
  });

  res.json({ message: "Department deactivated successfully" });
}));

// ─── POST /api/v1/departments/:id/members ─────
// Assign a member to this department
router.post("/:id/members", requireSecretary, asyncHandler(async (req, res) => {
  const { memberId } = z.object({ memberId: z.string() }).parse(req.body);

  const department = await prisma.department.findUnique({ where: { id: req.params.id } });
  if (!department) throw new AppError(404, "Department not found");

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new AppError(404, "Member not found");

  await prisma.member.update({
    where: { id: memberId },
    data:  { departmentId: req.params.id },
  });

  res.json({ message: `${member.firstName} ${member.lastName} assigned to ${department.name}` });
}));

// ─── DELETE /api/v1/departments/:id/members/:memberId ──
// Remove a member from this department
router.delete("/:id/members/:memberId", requireSecretary, asyncHandler(async (req, res) => {
  const member = await prisma.member.findUnique({ where: { id: req.params.memberId } });
  if (!member) throw new AppError(404, "Member not found");

  if (member.departmentId !== req.params.id) {
    throw new AppError(400, "Member does not belong to this department");
  }

  await prisma.member.update({
    where: { id: req.params.memberId },
    data:  { departmentId: null },
  });

  res.json({ message: `${member.firstName} ${member.lastName} removed from department` });
}));

// ─── GET /api/v1/departments/:id/expenses ─────
router.get("/:id/expenses", asyncHandler(async (req, res) => {
  const { month, year } = z.object({
    month: z.string().optional().transform(v => v ? parseInt(v) : undefined),
    year:  z.string().optional().transform(v => v ? parseInt(v) : undefined),
  }).parse(req.query);

  const where: any = { departmentId: req.params.id, type: "EXPENSE" };

  if (month && year) {
    where.transactionDate = {
      gte: new Date(year, month - 1, 1),
      lte: new Date(year, month, 0),
    };
  }

  const expenses = await prisma.transaction.findMany({
    where,
    orderBy: { transactionDate: "desc" },
    select: {
      id: true, reference: true, expenseCategory: true,
      amount: true, description: true, transactionDate: true, paymentMethod: true,
    },
  });

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  res.json({ expenses, total });
}));

export default router;
