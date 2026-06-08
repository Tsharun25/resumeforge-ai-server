import express from "express";
import {
  deleteTrendingAdvice,
  generateTrendingAdvice,
  getTrendingAdviceHistory,
} from "../controllers/trending.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/generate", protect, generateTrendingAdvice);
router.get("/history", protect, getTrendingAdviceHistory);
router.delete("/history/:id", protect, deleteTrendingAdvice);

export default router;