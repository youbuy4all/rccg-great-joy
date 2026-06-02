import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import {
  signAccessToken, signRefreshToken,
  authenticate
} from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import jwt from "jsonwebtoken";
import type { AuthPayload } from "../middleware/auth";

const router = Router();

// ─── Validation schemas ───────────────────────
const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  phone:     z.string().min(10),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8),
});

// ─── POST /api/auth/login ─────────────────────
router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where:   { email: email.toLowerCase() },
    include: { member: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } } },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, "Invalid email or password");
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError(401, "Invalid email or password");
  }

  const payload: AuthPayload = {
    userId:   user.id,
    role:     user.role,
    memberId: user.member?.id,
  };

  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token:     refreshToken,
      userId:    user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data:  { lastLoginAt: new Date() },
  });

  res.json({
    accessToken,
    refreshToken,
    user: {
      id:          user.id,
      email:       user.email,
      role:        user.role,
      memberId:    user.member?.id,
      firstName:   user.member?.firstName,
      lastName:    user.member?.lastName,
      profilePhoto:user.member?.profilePhoto,
    },
  });
}));

// ─── POST /api/auth/register (Admin only — initial setup) ────
router.post("/register", asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  // Only allow registration if no PASTOR exists yet (first-time setup)
  const pastoralCount = await prisma.user.count({
    where: { role: { in: ["PASTOR", "SUPER_ADMIN"] } },
  });

  if (pastoralCount > 0) {
    throw new AppError(403, "Registration is closed. Contact your administrator.");
  }

  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  if (existing) {
    throw new AppError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const year     = new Date().getFullYear();
    const count    = await tx.member.count();
    const memberId = `GJP-${year}-${String(count + 1).padStart(3, "0")}`;

    // Create user first
    const user = await tx.user.create({
      data: {
        email:        data.email.toLowerCase(),
        passwordHash,
        role:         "PASTOR",
      },
    });

    // Create member linked to user
    const member = await tx.member.create({
      data: {
        memberId,
        firstName:    data.firstName,
        lastName:     data.lastName,
        phone:        data.phone,
        email:        data.email.toLowerCase(),
        gender:       "MALE",
        workerStatus: "PASTOR",
        userId:       user.id,
      },
    });

    return { user, member };
  });

  const payload: AuthPayload = {
    userId:   result.user.id,
    role:     result.user.role,
    memberId: result.member.id,
  };

  res.status(201).json({
    message:      "Parish admin account created",
    accessToken:  signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: {
      id:        result.user.id,
      email:     result.user.email,
      role:      result.user.role,
      memberId:  result.member.id,
      firstName: result.member.firstName,
      lastName:  result.member.lastName,
    },
  });
}));

// ─── POST /api/auth/refresh ───────────────────
router.post("/refresh", asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError(400, "Refresh token required");

  // Verify token signature
  let payload: AuthPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as AuthPayload;
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  // Check it's in the database
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, "Refresh token revoked or expired");
  }

  // Rotate refresh token
  const newAccessToken  = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { token: refreshToken } }),
    prisma.refreshToken.create({
      data: {
        token:     newRefreshToken,
        userId:    payload.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
}));

// ─── POST /api/auth/logout ────────────────────
router.post("/logout", asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.json({ message: "Logged out successfully" });
}));

// ─── GET /api/auth/me ─────────────────────────
router.get("/me", authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where:   { id: req.user!.userId },
    select:  {
      id: true, email: true, role: true, lastLoginAt: true,
      member: {
        select: {
          id: true, memberId: true, firstName: true, lastName: true,
          phone: true, profilePhoto: true, workerStatus: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!user) throw new AppError(404, "User not found");
  res.json(user);
}));

// ─── PATCH /api/auth/change-password ─────────
router.patch("/change-password", authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) throw new AppError(404, "User not found");

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw new AppError(400, "Current password is incorrect");

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data:  { passwordHash: newHash },
  });

  // Revoke all refresh tokens (force re-login on all devices)
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  res.json({ message: "Password changed successfully. Please log in again." });
}));

export default router;