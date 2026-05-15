import express from "express";
import {
  generateCoverLetter,
  generateResumeContent,
} from "../controllers/ai.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/generate-resume", protect, generateResumeContent);
router.post("/generate-cover-letter", protect, generateCoverLetter);

export default router;