import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const { searchParams } = new URL(req.url);
    const entity   = searchParams.get("entity")   || undefined;
    const action   = searchParams.get("action")   || undefined;
    const from     = searchParams.get("from")     || undefined;
    const to       = searchParams.get("to")       || undefined;
    const page     = Math.max(1, Number(searchParams.get("page")  || 1));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") || 50));

    const where: any = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from + "T00:00:00");
      if (to)   where.createdAt.lte = new Date(to   + "T23:59:59");
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // AuditLog.userId is a loose string, not a Prisma relation (the person who
    // performed an action may later be deactivated or deleted, and we still
    // want the historical log entry to remain), so the "who did this" lookup
    // is done manually here rather than via a Prisma include.
    type LogRow  = { userId: string | null; [key: string]: any };
    type UserRow = { id: string; email: string; member: { firstName: string; lastName: string } | null };

    const userIds = [...new Set((logs as LogRow[]).map((l: LogRow) => l.userId).filter((id): id is string => !!id))];
    const users: UserRow[] = userIds.length
      ? await prisma.user.findMany({
          where:   { id: { in: userIds } },
          select:  { id: true, email: true, member: { select: { firstName: true, lastName: true } } },
        })
      : [];
    const userMap = new Map(users.map((u: UserRow) => [u.id, u]));

    const enriched = (logs as LogRow[]).map((l: LogRow) => {
      const u = l.userId ? userMap.get(l.userId) : undefined;
      return {
        ...l,
        performedBy: u
          ? (u.member ? `${u.member.firstName} ${u.member.lastName}` : u.email)
          : (l.userId ? "Deleted user" : "System"),
      };
    });

    return ok({
      logs: enriched,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }, ["PASTOR", "SUPER_ADMIN"]);
}
