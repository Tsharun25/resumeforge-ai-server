import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import resumeRoutes from "./routes/resume.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import freelancerRoutes from "./routes/freelancer.routes.js";
import ideaRoutes from "./routes/idea.routes.js";
import trendingRoutes from "./routes/trending.routes.js";
import { createRateLimiter } from "./middleware/rateLimit.middleware.js";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());

const configuredClientOrigins = String(process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  ...configuredClientOrigins,
  "https://careerpilot-ai-rho.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = origin?.replace(/\/+$/, "");

      if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: "Too many authentication attempts. Please try again later.",
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CareerPilot AI API is running.",
  });
});

let weakJwtWarningShown = false;

const validateRuntimeConfig = () => {
  const missing = ["MONGO_URI", "JWT_SECRET"].filter((name) => !process.env[name]);
  if (missing.length > 0) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

  if (
    process.env.NODE_ENV === "production" &&
    process.env.JWT_SECRET.length < 32 &&
    !weakJwtWarningShown
  ) {
    weakJwtWarningShown = true;
    console.warn("JWT_SECRET should be rotated to a value with at least 32 characters.");
  }
};

const ensureApiReady = async (req, res, next) => {
  try {
    validateRuntimeConfig();
    await connectDB();
    return next();
  } catch (error) {
    console.error("API dependency check failed:", error.message);
    return res.status(503).json({
      success: false,
      message: "The service is temporarily unavailable. Please try again shortly.",
    });
  }
};

app.get("/api/health", async (req, res) => {
  let databaseReady = mongoose.connection.readyState === 1;

  if (!databaseReady) {
    try {
      validateRuntimeConfig();
      await connectDB();
      databaseReady = mongoose.connection.readyState === 1;
    } catch (error) {
      console.error("Health check dependency failed:", error.message);
    }
  }

  return res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    status: databaseReady ? "ready" : "starting",
    timestamp: new Date().toISOString(),
    services: {
      database: databaseReady,
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      preferredAIProvider: process.env.AI_PROVIDER || "auto",
      youtubeConfigured: Boolean(process.env.YOUTUBE_API_KEY),
    },
  });
});

app.use("/api", ensureApiReady);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/freelancer", freelancerRoutes);
app.use("/api/ideas", ideaRoutes);
app.use("/api/trending", trendingRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  const isCorsError = error?.message?.startsWith("CORS blocked");
  const statusCode = isCorsError ? 403 : error.statusCode || 500;

  if (statusCode >= 500) console.error("Unhandled API error:", error);

  return res.status(statusCode).json({
    success: false,
    message: isCorsError ? "This website is not allowed to access the API." : "Unexpected server error.",
  });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  validateRuntimeConfig();
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

if (!process.env.VERCEL) {
  start().catch((error) => {
    console.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  });
}

export default app;
