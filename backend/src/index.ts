import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env, isDev } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

// ── Route imports ──────────────────────────────
import authRoutes from "./routes/auth";
import memberRoutes from "./routes/members";
import financeRoutes from "./routes/finance";
import attendanceRoutes from "./routes/attendance";
import departmentRoutes from "./routes/departments";
import returnRoutes from "./routes/returns";
// import attendanceRoutes from "./routes/attendance";
// import financeRoutes   from "./routes/finance";
// import departmentRoutes from "./routes/departments";
// import returnRoutes    from "./routes/returns";
// import reportRoutes    from "./routes/reports";
// import messageRoutes   from "./routes/messages";

const app = express();

// ── Security middleware ────────────────────────
app.use(helmet());
app.use(compression());

// ── CORS ──────────────────────────────────────
const allowedOrigins = env.CORS_ORIGINS.split(",").map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow Postman/mobile (no origin) in dev
    if (!origin && isDev) return callback(null, true);
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Rate limiting ──────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      300,
  message:  { message: "Too many requests, please try again later" },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20, // strict on auth routes
  message:  { message: "Too many auth attempts, please try again later" },
});

app.use(globalLimiter);

// ── Body parsing ───────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ────────────────────────────────────
if (isDev) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ── Health check ───────────────────────────────
app.get("/health", (_, res) => {
  res.json({
    status:  "ok",
    service: "RCCG Great Joy Parish API",
    parish:  env.PARISH_NAME,
    province:env.PROVINCE,
    env:     env.NODE_ENV,
    time:    new Date().toISOString(),
  });
});

// ── API Routes ─────────────────────────────────
const API = "/api/v1";

app.use(`${API}/auth`,        authLimiter, authRoutes);
app.use(`${API}/members`,     memberRoutes);
app.use(`${API}/finance`,     financeRoutes);
app.use(`${API}/attendance`,  attendanceRoutes);
app.use(`${API}/departments`, departmentRoutes);
app.use(`${API}/returns`,     returnRoutes);
// app.use(`${API}/attendance`,  attendanceRoutes);
// app.use(`${API}/finance`,     financeRoutes);
// app.use(`${API}/departments`, departmentRoutes);
// app.use(`${API}/returns`,     returnRoutes);
// app.use(`${API}/reports`,     reportRoutes);
// app.use(`${API}/messages`,    messageRoutes);

// ── 404 handler ────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ── Global error handler ───────────────────────
app.use(errorHandler);

// ── Start server ───────────────────────────────
const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`
  ✝  RCCG Great Joy Parish API
  ─────────────────────────────
  🚀  Running on  : http://localhost:${PORT}
  📦  Environment : ${env.NODE_ENV}
  🏛  Parish      : ${env.PARISH_NAME}
  🌍  Province    : ${env.PROVINCE}
  📋  Health      : http://localhost:${PORT}/health
  `);
});

export default app;
