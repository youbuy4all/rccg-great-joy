import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, qs, makeRef, writeAuditLog } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const s = qs(req);
    const page = parseInt(s.get("page") || "1"), limit = parseInt(s.get("limit") || "20");
    const type = s.get("type"), month = s.get("month"), year = s.get("year"), search = s.get("search");
    const where: any = {};
    if (type)          where.type = type;
    if (search)        where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { reference:   { contains: search, mode: "insensitive" } },
    ];
    if (month && year) where.transactionDate = {
      gte: new Date(parseInt(year), parseInt(month) - 1, 1),
      lte: new Date(parseInt(year), parseInt(month), 0),
    };
    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { transactionDate: "desc" },
        include: {
          member:     { select: { id:true, firstName:true, lastName:true } },
          department: { select: { id:true, name:true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);
    return ok({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 } });
  }, ["PASTOR", "TREASURER", "AUDITOR", "SUPER_ADMIN"]);
}

export async function POST(req: NextRequest) {
  return withAuth(req, async user => {
    const data = await req.json();

    if (!data.amount || data.amount <= 0)                    return err("Invalid amount", 400);
    if (data.type === "INCOME"  && !data.incomeCategory)     return err("Income category required", 400);
    if (data.type === "EXPENSE" && !data.expenseCategory)    return err("Expense category required", 400);

    // ── Duplicate-entry safety check ────────────────────────────────
    // Matches on: same day + same category + same exact amount + same type.
    // This is a *soft* check — callers can pass `force: true` to save anyway
    // (e.g. two members genuinely gave the same amount in the same category
    // on the same day). Without `force`, we reject with a 409 so the UI can
    // show a confirmation prompt instead of silently creating a duplicate.
    if (!data.force) {
      const txDate = new Date(data.transactionDate);
      const dayStart = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
      const dayEnd   = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate() + 1);
      const categoryField = data.type === "INCOME" ? "incomeCategory" : "expenseCategory";
      const categoryValue = data.type === "INCOME" ? data.incomeCategory : data.expenseCategory;

      const possibleDuplicate = await prisma.transaction.findFirst({
        where: {
          type:                data.type,
          [categoryField]:     categoryValue,
          amount:               data.amount,
          transactionDate:      { gte: dayStart, lt: dayEnd },
        },
      });

      if (possibleDuplicate) {
        return err(
          `A matching transaction already exists: ₦${Number(possibleDuplicate.amount).toLocaleString()} for ${categoryValue} on ${possibleDuplicate.transactionDate.toISOString().split("T")[0]} (ref: ${possibleDuplicate.reference}). This looks like a possible duplicate entry.`,
          409,
          { existingId: possibleDuplicate.id, existingReference: possibleDuplicate.reference }
        );
      }
    }

    const count     = await prisma.transaction.count({ where: { type: data.type } });
    const prefix    = data.type === "INCOME" ? "INC" : data.type === "EXPENSE" ? "EXP" : "TRF";
    const reference = makeRef(prefix, count);

    let remittanceAmount: number | undefined;
    if (data.type === "INCOME" && data.incomeCategory) {
      const config = await prisma.incomeConfig.findUnique({ where: { category: data.incomeCategory } });
      if (config) remittanceAmount = (data.amount * Number(config.remittancePct)) / 100;
    }

    const transaction = await prisma.transaction.create({
      data: {
        reference,
        type:            data.type,
        incomeCategory:  data.incomeCategory  || undefined,
        expenseCategory: data.expenseCategory || undefined,
        amount:          data.amount,
        description:     data.description,
        paymentMethod:   data.paymentMethod,
        transactionDate: new Date(data.transactionDate),
        memberId:        data.memberId     || undefined,
        departmentId:    data.departmentId || undefined,
        remittanceAmount,
        isRemitted:      false,
        createdById:     user.userId,
      },
      include: {
        member:     { select: { id:true, firstName:true, lastName:true } },
        department: { select: { id:true, name:true } },
      },
    });

    await writeAuditLog({
      userId:    user.userId,
      action:    "CREATE_TRANSACTION",
      entity:    "Transaction",
      entityId:  transaction.id,
      newValues: {
        reference,
        type:      data.type,
        category:  data.incomeCategory || data.expenseCategory,
        amount:    data.amount,
        remittanceAmount,
      },
      req,
    });

    return ok({
      ...transaction,
      message: remittanceAmount
        ? `Transaction recorded. Remittance due: ₦${remittanceAmount.toLocaleString()}`
        : "Transaction recorded.",
    }, 201);
  }, ["PASTOR", "TREASURER", "SUPER_ADMIN"]);
}
