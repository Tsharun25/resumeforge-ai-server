import mongoose from "mongoose";
import PaymentRequest from "../models/PaymentRequest.js";
import User from "../models/User.js";
import {
  ACTIVATABLE_PLAN_IDS,
  PAID_PLAN_IDS,
  applyPlanToUser,
  getPlanConfig,
} from "../config/plans.js";

const PAYMENT_METHODS = new Set([
  "bKash",
  "Nagad",
  "Rocket",
  "Tap",
  "Upay",
  "Bank Transfer",
]);

const cleanText = (value, maxLength) =>
  String(value || "").trim().slice(0, maxLength);

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getNextExpiry = (currentExpiry, isRenewal) => {
  const now = new Date();
  const current = currentExpiry ? new Date(currentExpiry) : null;
  const base = isRenewal && current && current > now ? current : now;
  const next = new Date(base);
  const targetMonth = next.getUTCMonth() + 1;

  next.setUTCDate(1);
  next.setUTCMonth(targetMonth);
  const lastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
  ).getUTCDate();
  next.setUTCDate(Math.min(base.getUTCDate(), lastDay));

  return next;
};

export const createPaymentRequest = async (req, res) => {
  try {
    const plan = cleanText(req.body.plan, 30).toLowerCase();
    const paymentMethod = cleanText(req.body.paymentMethod, 40);
    const transactionId = cleanText(req.body.transactionId, 120).toUpperCase();
    const senderNumber = cleanText(req.body.senderNumber, 120);
    const note = cleanText(req.body.note, 500);

    if (!plan || !paymentMethod || !transactionId || !senderNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Plan, payment method, transaction ID, and sender number are required.",
      });
    }

    if (!PAID_PLAN_IDS.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan selected.",
      });
    }

    if (!PAYMENT_METHODS.has(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method selected.",
      });
    }

    const existingPending = await PaymentRequest.findOne({
      user: req.user._id,
      status: "pending",
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a pending payment request. Please wait for admin approval.",
      });
    }

    const reusedTransaction = await PaymentRequest.exists({
      paymentMethod,
      transactionId,
    });

    if (reusedTransaction) {
      return res.status(409).json({
        success: false,
        message: "This transaction ID has already been submitted.",
      });
    }

    const paymentRequest = await PaymentRequest.create({
      user: req.user._id,
      plan,
      amount: getPlanConfig(plan).price,
      paymentMethod,
      transactionId,
      senderNumber,
      note,
    });

    return res.status(201).json({
      success: true,
      message:
        "Payment request submitted successfully. Admin will verify it soon.",
      paymentRequest,
    });
  } catch (error) {
    console.error("Create payment request error:", error);

    return res.status(error?.code === 11000 ? 409 : 500).json({
      success: false,
      message:
        error?.code === 11000
          ? "This transaction ID has already been submitted."
          : "Failed to submit payment request.",
    });
  }
};

export const getMyPaymentRequests = async (req, res) => {
  try {
    const requests = await PaymentRequest.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get payment requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load payment requests.",
    });
  }
};

export const getAllPaymentRequests = async (req, res) => {
  try {
    const requests = await PaymentRequest.find()
      .populate(
        "user",
        "fullName email role plan aiCredits monthlyResumeLimit monthlyCoverLetterLimit pdfExportLimit"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Admin get payment requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load payment requests.",
    });
  }
};

export const approvePaymentRequest = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let paymentRequest;
    let user;

    await session.withTransaction(async () => {
      paymentRequest = await PaymentRequest.findById(req.params.id).session(session);

      if (!paymentRequest) {
        throw createHttpError("Payment request not found.", 404);
      }

      if (paymentRequest.status !== "pending") {
        throw createHttpError("This payment request has already been processed.", 409);
      }

      if (!ACTIVATABLE_PLAN_IDS.includes(paymentRequest.plan)) {
        throw createHttpError("Invalid subscription plan.", 400);
      }

      user = await User.findById(paymentRequest.user).session(session);

      if (!user) throw createHttpError("User not found.", 404);

      const isRenewal = user.plan === paymentRequest.plan;
      const planExpiresAt = getNextExpiry(user.planExpiresAt, isRenewal);

      applyPlanToUser(user, paymentRequest.plan);
      user.planExpiresAt = planExpiresAt;

      await user.save({ session });

      paymentRequest.status = "approved";
      await paymentRequest.save({ session });
    });

    return res.status(200).json({
      success: true,
      message: "Payment approved and user plan activated.",
      user,
      paymentRequest,
    });
  } catch (error) {
    console.error("Approve payment error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to approve payment request.",
    });
  } finally {
    await session.endSession();
  }
};

export const rejectPaymentRequest = async (req, res) => {
  try {
    const note = cleanText(req.body.note, 500);
    const update = { status: "rejected" };
    if (note) update.note = note;

    const paymentRequest = await PaymentRequest.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!paymentRequest) {
      const exists = await PaymentRequest.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({
        success: false,
        message: exists
          ? "This payment request has already been processed."
          : "Payment request not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment request rejected.",
      paymentRequest,
    });
  } catch (error) {
    console.error("Reject payment error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reject payment request.",
    });
  }
};
