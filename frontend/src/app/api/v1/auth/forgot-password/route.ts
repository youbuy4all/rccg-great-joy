import { NextRequest } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, err } from "@/lib/api-helpers";
import { sendPasswordResetEmail } from "@/lib/email";

const GENERIC_MESSAGE =
  "If an account exists with that email, a password reset link has been sent.";

export async function POST(req: NextRequest) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(await req.json());

    const user = await prisma.user.findUnique({
      where:   { email: email.toLowerCase() },
      include: { member: { select: { firstName: true } } },
    });

    // Always return the same generic message whether or not the email
    // exists — this prevents attackers from using this endpoint to
    // discover which email addresses have accounts (account enumeration).
    if (!user || !user.isActive) return ok({ message: GENERIC_MESSAGE });

    // Generate a random token. Only its SHA-256 hash is stored in the
    // database — the raw token only ever exists in the emailed link, the
    // same way the raw password never touches the database, only its hash.
    const rawToken  = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId:    user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const origin   = req.headers.get("origin") || new URL(req.url).origin;
    const resetUrl = `${origin}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl, user.member?.firstName);
    } catch (emailErr: any) {
      console.error("[forgot-password] Failed to send email:", emailErr?.message);
      // Still return the generic success message — don't leak whether the
      // email send succeeded, and don't tell the requester the account
      // doesn't have a configured email service.
    }

    return ok({ message: GENERIC_MESSAGE });
  } catch (e: any) {
    return err(e.message || "Something went wrong", 400);
  }
}
