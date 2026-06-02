import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { Role } from "@prisma/client";

export interface AuthPayload {
  userId: string;
  role:   Role;
  memberId?: string;
}

// Extend Express Request with auth info
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// ── Verify JWT and attach user to request ──
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;

    // Check user still active
    const user = await prisma.user.findUnique({
      where:  { id: payload.userId },
      select: { id: true, role: true, isActive: true, member: { select: { id: true } } },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or deactivated" });
    }

    req.user = {
      userId:   user.id,
      role:     user.role,
      memberId: user.member?.id,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ── Role-based access guard ──
export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }
    next();
  };
};

// ── Token helpers ──
export const signAccessToken = (payload: AuthPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);

export const signRefreshToken = (payload: AuthPayload): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);

// ── Shorthand role guards ──
export const requirePastor    = authorize("PASTOR", "SUPER_ADMIN");
export const requireTreasurer = authorize("PASTOR", "TREASURER", "SUPER_ADMIN");
export const requireSecretary = authorize("PASTOR", "SECRETARY", "SUPER_ADMIN");
export const requireAuditor   = authorize("PASTOR", "AUDITOR", "TREASURER", "SUPER_ADMIN");
export const requireAdmin     = authorize("PASTOR", "SUPER_ADMIN");
