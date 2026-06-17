import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, err, withAuth, qs, writeAuditLog } from "@/lib/api-helpers";

const ROLES = ["PASTOR","TREASURER","HOD","SECRETARY","AUDITOR","WORKER","MEMBER","SUPER_ADMIN"] as const;

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const s      = qs(req);
    const search = s.get("search") || "";
    const where: any = {};
    if (search) where.OR = [
      { email:  { contains: search, mode: "insensitive" } },
      { member: { OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName:  { contains: search, mode: "insensitive" } },
      ]}},
    ];
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true,
        member: { select: { id:true, memberId:true, firstName:true, lastName:true, phone:true, profilePhoto:true } },
      },
    });
    return ok(users);
  }, ["PASTOR", "SUPER_ADMIN"]);
}

export async function POST(req: NextRequest) {
  return withAuth(req, async user => {
    const body = z.object({
      email:     z.string().email("Valid email required"),
      password:  z.string().min(8, "Password must be at least 8 characters"),
      role:      z.enum(ROLES),
      memberId:  z.string().optional(), // link to existing member
    }).parse(await req.json());

    const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (exists) return err("Email already registered", 409);

    const passwordHash = await bcrypt.hash(body.password, 12);

    const newUser = await prisma.user.create({
      data: {
        email:        body.email.toLowerCase(),
        passwordHash,
        role:         body.role,
        isActive:     true,
        memberId:     body.memberId || undefined,
      },
      select: {
        id:true, email:true, role:true, isActive:true, createdAt:true,
        member: { select: { id:true, firstName:true, lastName:true } },
      },
    });

    await writeAuditLog({
      userId:    user.userId,
      action:    "CREATE_USER",
      entity:    "User",
      entityId:  newUser.id,
      newValues: { email: newUser.email, role: newUser.role },
      req,
    });

    return ok(newUser, 201);
  }, ["PASTOR", "SUPER_ADMIN"]);
}
