import express from "express";
import {
  approvePaymentRequest,
  createPaymentRequest,
  getAllPaymentRequests,
  getMyPaymentRequests,
  rejectPaymentRequest,
} from "../controllers/payment.controller.js";
import { adminOnly, protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/my-requests", getMyPaymentRequests);
router.post("/request", createPaymentRequest);

router.get("/admin/requests", adminOnly, getAllPaymentRequests);
router.patch("/admin/requests/:id/approve", adminOnly, approvePaymentRequest);
router.patch("/admin/requests/:id/reject", adminOnly, rejectPaymentRequest);

export default router;