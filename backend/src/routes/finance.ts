import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { authenticate, requireTreasurer, requireAuditor } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { TransactionType, IncomeCategory, ExpenseCategory, PaymentMethod } from "@prisma/client";

const router = Router();
router.use(authenticate);

// ─── Validation schemas ───────────────────────
const transactionBaseSchema = z.object({
  type: z.nativeEnum(TransactionType),
  incomeCategory: z.nativeEnum(IncomeCategory).optional(),
  expenseCategory: z.nativeEnum(ExpenseCategory).optional(),
  amount: z.number().positive(),
  description: z.string().min(1),
  paymentMethod: z.nativeEnum(PaymentMethod),
  transactionDate: z.string(),
  memberId: z.string().optional(),
  departmentId: z.string().optional(),
  debitAccountId: z.string().optional(),
  creditAccountId: z.string().optional(),
  notes: z.string().optional(),
});

const createTransactionSchema = transactionBaseSchema.refine((data) => {
  if (data.type === "INCOME" && !data.incomeCategory) return false;
  if (data.type === "EXPENSE" && !data.expenseCategory) return false;
  return true;
}, {
  message: "Category is required for the transaction type",
});

const updateTransactionSchema = transactionBaseSchema.partial();

const querySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 20),
  type: z.nativeEnum(TransactionType).optional(),
  category: z.string().optional(),
  memberId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  month: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  year: z.string().optional().transform(v => v ? parseInt(v) : undefined),
});

// ─── Helper: generate reference number ────────
async function generateReference(type: TransactionType): Promise<string> {
  const prefix = type === "INCOME" ? "INC" : type === "EXPENSE" ? "EXP" : "TRF";
  const count = await prisma.transaction.count({ where: { type } });
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(6, "0")}`;
}

// ─── GET /api/v1/finance/summary ─────────────
router.get("/summary", requireAuditor, asyncHandler(async (req, res) => {
  const { month, year } = querySchema.parse(req.query);

  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || now.getMonth() + 1;
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0); // last day of month

  const where = {
    transactionDate: { gte: startDate, lte: endDate },
  };

  const [income, expenses, remitted] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...where, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...where, type: "EXPENSE" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...where, type: "INCOME", isRemitted: true },
      _sum: { remittanceAmount: true },
    }),
  ]);

  const totalIncome = Number(income._sum.amount || 0);
  const totalExpenses = Number(expenses._sum.amount || 0);
  const totalRemitted = Number(remitted._sum.remittanceAmount || 0);

  // Income breakdown by category
  const breakdown = await prisma.transaction.groupBy({
    by: ["incomeCategory"],
    where: { ...where, type: "INCOME" },
    _sum: { amount: true },
  });

  // Expense breakdown by category
  const expenseBreakdown = await prisma.transaction.groupBy({
    by: ["expenseCategory"],
    where: { ...where, type: "EXPENSE" },
    _sum: { amount: true },
  });

  res.json({
    period: { month: m, year: y },
    totalIncome,
    totalExpenses,
    netSurplus: totalIncome - totalExpenses,
    totalRemitted,
    parishRetained: totalIncome - totalRemitted,
    incomeBreakdown: breakdown.map(b => ({
      category: b.incomeCategory,
      amount: Number(b._sum.amount || 0),
    })),
    expenseBreakdown: expenseBreakdown.map(b => ({
      category: b.expenseCategory,
      amount: Number(b._sum.amount || 0),
    })),
  });
}));

// ─── GET /api/v1/finance/transactions ─────────
router.get("/transactions", requireAuditor, asyncHandler(async (req, res) => {
  const query = querySchema.parse(req.query);
  const { page, limit, type, memberId, startDate, endDate, month, year } = query;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (type) where.type = type;
  if (memberId) where.memberId = memberId;

  if (startDate || endDate) {
    where.transactionDate = {};
    if (startDate) where.transactionDate.gte = new Date(startDate);
    if (endDate) where.transactionDate.lte = new Date(endDate);
  } else if (month && year) {
    where.transactionDate = {
      gte: new Date(year, month - 1, 1),
      lte: new Date(year, month, 0),
    };
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { transactionDate: "desc" },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, member: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    data: transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}));

// ─── GET /api/v1/finance/transactions/:id ─────
router.get("/transactions/:id", requireAuditor, asyncHandler(async (req, res) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: req.params.id },
    include: {
      member: { select: { id: true, firstName: true, lastName: true, phone: true } },
      department: { select: { id: true, name: true } },
      debitAccount: true,
      creditAccount: true,
      createdBy: { select: { id: true, member: { select: { firstName: true, lastName: true } } } },
    },
  });

  if (!transaction) throw new AppError(404, "Transaction not found");
  res.json(transaction);
}));

// ─── POST /api/v1/finance/transactions ────────
router.post("/transactions", requireTreasurer, asyncHandler(async (req, res) => {
  const data = createTransactionSchema.parse(req.body);

  const reference = await generateReference(data.type);

  // Auto-calculate remittance for income transactions
  let remittanceAmount: number | undefined;
  let isRemitted = false;

  if (data.type === "INCOME" && data.incomeCategory) {
    const config = await prisma.incomeConfig.findUnique({
      where: { category: data.incomeCategory },
    });
    if (config) {
      remittanceAmount = (data.amount * Number(config.remittancePct)) / 100;
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      reference,
      type: data.type,
      incomeCategory: data.incomeCategory,
      expenseCategory: data.expenseCategory,
      amount: data.amount,
      description: data.description,
      paymentMethod: data.paymentMethod,
      transactionDate: new Date(data.transactionDate),
      memberId: data.memberId,
      departmentId: data.departmentId,
      debitAccountId: data.debitAccountId,
      creditAccountId: data.creditAccountId,
      notes: data.notes,
      remittanceAmount,
      isRemitted,
      createdById: req.user!.userId,
    },
    include: {
      member: { select: { id: true, firstName: true, lastName: true } },
      department: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({
    ...transaction,
    remittanceAmount,
    message: remittanceAmount
      ? `Transaction recorded. Remittance due: ₦${remittanceAmount.toLocaleString()}`
      : "Transaction recorded.",
  });
}));

// ─── PATCH /api/v1/finance/transactions/:id ───
router.patch("/transactions/:id", requireTreasurer, asyncHandler(async (req, res) => {
  const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, "Transaction not found");

  // Don't allow editing remitted transactions
  if (existing.isRemitted) {
    throw new AppError(400, "Cannot edit a transaction that has already been remitted");
  }

  const data = updateTransactionSchema.parse(req.body);

  const transaction = await prisma.transaction.update({
    where: { id: req.params.id },
    data: {
      ...data,
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : undefined,
    },
  });

  res.json(transaction);
}));



// ─── POST /api/v1/finance/transactions/bulk ───
router.post("/transactions/bulk", requireTreasurer, asyncHandler(async (req, res) => {
  const rows = z.array(z.object({
    type:             z.nativeEnum(TransactionType),
    incomeCategory:   z.nativeEnum(IncomeCategory).optional(),
    expenseCategory:  z.nativeEnum(ExpenseCategory).optional(),
    amount:           z.preprocess(v => Number(v), z.number().positive()),
    description:      z.string().min(1),
    paymentMethod:    z.nativeEnum(PaymentMethod),
    transactionDate:  z.string(),
    memberId:         z.string().optional(),
    departmentId:     z.string().optional(),
    notes:            z.string().optional(),
  }).refine(d => {
    if (d.type === "INCOME" && !d.incomeCategory) return false;
    if (d.type === "EXPENSE" && !d.expenseCategory) return false;
    return true;
  }, { message: "Category required for transaction type" })).parse(req.body.rows);

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const data = rows[i];
    try {
      const reference = await generateReference(data.type);

      let remittanceAmount: number | undefined;
      if (data.type === "INCOME" && data.incomeCategory) {
        const config = await prisma.incomeConfig.findUnique({ where: { category: data.incomeCategory } });
        if (config) remittanceAmount = (data.amount * Number(config.remittancePct)) / 100;
      }

      await prisma.transaction.create({
        data: {
          reference,
          type:            data.type,
          incomeCategory:  data.incomeCategory  || null,
          expenseCategory: data.expenseCategory || null,
          amount:          data.amount,
          description:     data.description,
          paymentMethod:   data.paymentMethod,
          transactionDate: new Date(data.transactionDate),
          memberId:        data.memberId || null,
          departmentId:    data.departmentId || null,
          notes:           data.notes,
          remittanceAmount,
          isRemitted:      false,
          createdById:     req.user!.userId,
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
// ─── DELETE /api/v1/finance/transactions/:id ──
router.delete("/transactions/:id", requireTreasurer, asyncHandler(async (req, res) => {
  const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, "Transaction not found");

  if (existing.isRemitted) {
    throw new AppError(400, "Cannot delete a remitted transaction");
  }

  await prisma.transaction.delete({ where: { id: req.params.id } });
  res.json({ message: "Transaction deleted" });
}));

// ─── GET /api/v1/finance/remittance ───────────
// Shows what needs to be remitted to Province this month
router.get("/remittance", requireTreasurer, asyncHandler(async (req, res) => {
  const { month, year } = querySchema.parse(req.query);
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || now.getMonth() + 1;

  const transactions = await prisma.transaction.findMany({
    where: {
      type: "INCOME",
      transactionDate: {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0),
      },
    },
    select: {
      id: true,
      incomeCategory: true,
      amount: true,
      remittanceAmount: true,
      isRemitted: true,
    },
  });

  // Group by category
  const byCategory: Record<string, { total: number; remittance: number; remitted: boolean }> = {};

  for (const t of transactions) {
    const cat = t.incomeCategory || "OTHER_INCOME";
    if (!byCategory[cat]) {
      byCategory[cat] = { total: 0, remittance: 0, remitted: false };
    }
    byCategory[cat].total += Number(t.amount);
    byCategory[cat].remittance += Number(t.remittanceAmount || 0);
    if (t.isRemitted) byCategory[cat].remitted = true;
  }

  const totalDue = Object.values(byCategory).reduce((s, c) => s + c.remittance, 0);
  const totalRemitted = transactions
    .filter(t => t.isRemitted)
    .reduce((s, t) => s + Number(t.remittanceAmount || 0), 0);

  res.json({
    period: { month: m, year: y },
    breakdown: byCategory,
    totalDue,
    totalRemitted,
    outstanding: totalDue - totalRemitted,
  });
}));

// ─── POST /api/v1/finance/remittance/mark ─────
// Mark transactions as remitted to Province
router.post("/remittance/mark", requireTreasurer, asyncHandler(async (req, res) => {
  const { transactionIds, remittedAt } = z.object({
    transactionIds: z.array(z.string()).min(1),
    remittedAt: z.string().optional(),
  }).parse(req.body);

  await prisma.transaction.updateMany({
    where: { id: { in: transactionIds } },
    data: {
      isRemitted: true,
      remittedAt: remittedAt ? new Date(remittedAt) : new Date(),
    },
  });

  res.json({ message: `${transactionIds.length} transaction(s) marked as remitted` });
}));

// ─── GET /api/v1/finance/accounts ─────────────
router.get("/accounts", requireAuditor, asyncHandler(async (req, res) => {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  res.json(accounts);
}));

// ─── GET /api/v1/finance/income-configs ───────
router.get("/income-configs", asyncHandler(async (req, res) => {
  const configs = await prisma.incomeConfig.findMany({
    orderBy: { category: "asc" },
  });
  res.json(configs);
}));

// ─── PATCH /api/v1/finance/income-configs/:category ──
router.patch("/income-configs/:category", requireTreasurer, asyncHandler(async (req, res) => {
  const { parishRetainPct, remittancePct } = z.object({
    parishRetainPct: z.number().min(0).max(100),
    remittancePct: z.number().min(0).max(100),
  }).parse(req.body);

  if (parishRetainPct + remittancePct !== 100) {
    throw new AppError(400, "Parish retain % and remittance % must add up to 100");
  }

  const config = await prisma.incomeConfig.update({
    where: { category: req.params.category as IncomeCategory },
    data: { parishRetainPct, remittancePct },
  });

  res.json(config);
}));

export default router;