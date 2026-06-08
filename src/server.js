import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";
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

connectDB();

const app = express();
app.set("trust proxy", 1);

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
app.use(express.urlencoded({ extended: true }));

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: "Too many authentication attempts. Please try again later.",
});

const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 12,
  message: "Too many AI requests. Please wait a moment and try again.",
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CareerPilot AI API is running.",
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/freelancer", aiLimiter, freelancerRoutes);
app.use("/api/ideas", aiLimiter, ideaRoutes);
app.use("/api/trending", aiLimiter, trendingRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
