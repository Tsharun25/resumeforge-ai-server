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

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
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

app.get("/api/health", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;

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

const validateRuntimeConfig = () => {
  const missing = ["MONGO_URI", "JWT_SECRET"].filter((name) => !process.env[name]);
  if (missing.length > 0) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

  if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
  }
};

const start = async () => {
  validateRuntimeConfig();
  await connectDB();

  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
};

try {
  await start();
} catch (error) {
  console.error(`Server startup failed: ${error.message}`);
  if (!process.env.VERCEL) process.exit(1);
  throw error;
}

export default app;
