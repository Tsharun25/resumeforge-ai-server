import express from "express";
import {
  deleteFreelancerDocument,
  generateFreelancerContent,
  getFreelancerHistory,
  getSingleFreelancerDocument,
} from "../controllers/freelancer.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { aiGenerationLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/generate", protect, aiGenerationLimiter, generateFreelancerContent);
router.get("/history", protect, getFreelancerHistory);
router.get("/history/:id", protect, getSingleFreelancerDocument);
router.delete("/history/:id", protect, deleteFreelancerDocument);

export default router;
