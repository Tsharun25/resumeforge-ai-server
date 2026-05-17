import express from "express";
import {
  deleteIdeaReport,
  generateIdeaReport,
  getIdeaHistory,
  getSingleIdeaReport,
} from "../controllers/idea.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/generate", protect, generateIdeaReport);
router.get("/history", protect, getIdeaHistory);
router.get("/history/:id", protect, getSingleIdeaReport);
router.delete("/history/:id", protect, deleteIdeaReport);

export default router;