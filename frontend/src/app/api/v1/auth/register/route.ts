import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, err, signAccess, signRefresh } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const data = z.object({ email:z.string().email(), password:z.string().min(8), firstName:z.string(), lastName:z.string(), phone:z.string() }).parse(await req.json());
    const count = await prisma.user.count({ where:{role:{in:["PASTOR","SUPER_ADMIN"]}} });
    if (count > 0) return err("Registration is closed.", 403);
    const exists = await prisma.user.findUnique({ where:{email:data.email.toLowerCase()} });
    if (exists) return err("Email already registered", 409);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const year = new Date().getFullYear();
    const mcount = await prisma.member.count();
    const memberId = `GJP-${year}-${String(mcount+1).padStart(4,"0")}`;
    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data:{ email:data.email.toLowerCase(), passwordHash, role:"PASTOR" } });
      const member = await tx.member.create({ data:{ memberId, firstName:data.firstName, lastName:data.lastName, phone:data.phone, email:data.email.toLowerCase(), gender:"MALE", workerStatus:"PASTOR", userId:user.id } });
      return { user, member };
    });
    const payload = { userId:result.user.id, role:result.user.role, memberId:result.member.id };
    return ok({ message:"Account created", accessToken:signAccess(payload), refreshToken:signRefresh(payload), user:{ id:result.user.id, email:result.user.email, role:result.user.role, memberId:result.member.id, firstName:result.member.firstName, lastName:result.member.lastName } }, 201);
  } catch(e:any) { return err(e.message||"Registration failed", 400); }
}