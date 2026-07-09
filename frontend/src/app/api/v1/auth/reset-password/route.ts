import { NextRequest } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, err, writeAuditLog } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = z
      .object({ token: z.string().min(1), newPassword: z.string().min(8, "Password must be at least 8 characters") })
      .parse(await req.json());

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where:   { tokenHash },
      include: { user: true },
    });

    if (!resetToken)                     return err("This reset link is invalid.", 400);
    if (resetToken.usedAt)                return err("This reset link has already been used.", 400);
    if (resetToken.expiresAt < new Date()) return err("This reset link has expired. Please request a new one.", 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data:  { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data:  { usedAt: new Date() },
      }),
      // Log out every existing session — if someone else had access via the
      // old password, this ends their session immediately too.
      prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    await writeAuditLog({
      userId:   resetToken.userId,
      action:   "PASSWORD_RESET",
      entity:   "User",
      entityId: resetToken.userId,
      req,
    });

    return ok({ message: "Password reset successfully. Please sign in with your new password." });
  } catch (e: any) {
    return err(e.message || "Something went wrong", 400);
  }
}
