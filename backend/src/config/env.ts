import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV:              z.enum(["development", "production", "test"]).default("development"),
  PORT:                  z.string().default("5000").transform(Number),
  DATABASE_URL:          z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL:            z.string().min(1, "DIRECT_URL is required"),
  JWT_SECRET:            z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET:    z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_EXPIRES_IN:        z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN:z.string().default("7d"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY:    z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  TWILIO_ACCOUNT_SID:    z.string().optional(),
  TWILIO_AUTH_TOKEN:     z.string().optional(),
  TWILIO_PHONE_NUMBER:   z.string().optional(),
  TWILIO_WHATSAPP_NUMBER:z.string().optional(),
  SMTP_HOST:             z.string().optional(),
  SMTP_PORT:             z.string().optional().transform(v => v ? Number(v) : 587),
  SMTP_USER:             z.string().optional(),
  SMTP_PASS:             z.string().optional(),
  EMAIL_FROM:            z.string().optional(),
  PARISH_NAME:           z.string().default("Great Joy Parish"),
  PROVINCE:              z.string().default("Rivers Province 12"),
  CORS_ORIGINS:          z.string().default("http://localhost:3000,http://localhost:8081"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌  Invalid environment variables:");
  console.error(_env.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = _env.data;
export const isDev  = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
