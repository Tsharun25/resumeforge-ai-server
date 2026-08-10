import express from "express";
import {
  generateCoverLetter,
  generateResumeContent,
} from "../controllers/ai.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { aiGenerationLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/generate-resume", protect, aiGenerationLimiter, generateResumeContent);
router.post(
  "/generate-cover-letter",
  protect,
  aiGenerationLimiter,
  generateCoverLetter
);

export default router;
