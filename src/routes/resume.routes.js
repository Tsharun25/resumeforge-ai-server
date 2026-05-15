import express from "express";

import {
  createResume,
  deleteResume,
  getMyResumes,
  getSingleResume,
  updateResume,
} from "../controllers/resume.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getMyResumes).post(createResume);

router.route("/:id").get(getSingleResume).put(updateResume).delete(deleteResume);

export default router;