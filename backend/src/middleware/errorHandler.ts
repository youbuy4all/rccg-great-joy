import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { isDev } from "../config/env";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Known application error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status:  "error",
      message: err.message,
      code:    err.code,
    });
  }

  // Zod validation error
  if (err instanceof ZodError) {
    return res.status(400).json({
      status:  "validation_error",
      message: "Invalid input data",
      errors:  err.flatten().fieldErrors,
    });
  }

  // Prisma unique constraint
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const field = (err.meta?.target as string[])?.join(", ");
      return res.status(409).json({
        status:  "error",
        message: `${field || "A record"} already exists`,
        code:    "DUPLICATE_ENTRY",
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        status:  "error",
        message: "Record not found",
        code:    "NOT_FOUND",
      });
    }
  }

  // Unknown error
  console.error("Unhandled error:", err);
  return res.status(500).json({
    status:  "error",
    message: isDev ? err.message : "Internal server error",
    ...(isDev && { stack: err.stack }),
  });
};

// Async handler wrapper — avoids try/catch in every controller
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
