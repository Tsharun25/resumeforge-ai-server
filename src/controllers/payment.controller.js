import PaymentRequest from "../models/PaymentRequest.js";
import User from "../models/User.js";
import { PAID_PLAN_IDS, applyPlanToUser, getPlanConfig } from "../config/plans.js";

export const createPaymentRequest = async (req, res) => {
  try {
    const { plan, paymentMethod, transactionId, senderNumber, note } = req.body;

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

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit payment request.",
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
  try {
    const paymentRequest = await PaymentRequest.findById(req.params.id);

    if (!paymentRequest) {
      return res.status(404).json({
        success: false,
        message: "Payment request not found.",
      });
    }

    if (paymentRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This payment request has already been processed.",
      });
    }

    if (!PAID_PLAN_IDS.includes(paymentRequest.plan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan.",
      });
    }

    const user = await User.findById(paymentRequest.user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const planExpiresAt = new Date();
    planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);

    applyPlanToUser(user, paymentRequest.plan);
    user.planExpiresAt = planExpiresAt;

    await user.save();

    paymentRequest.status = "approved";
    await paymentRequest.save();

    return res.status(200).json({
      success: true,
      message: "Payment approved and user plan activated.",
      user,
      paymentRequest,
    });
  } catch (error) {
    console.error("Approve payment error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to approve payment request.",
    });
  }
};

export const rejectPaymentRequest = async (req, res) => {
  try {
    const { note } = req.body;

    const paymentRequest = await PaymentRequest.findById(req.params.id);

    if (!paymentRequest) {
      return res.status(404).json({
        success: false,
        message: "Payment request not found.",
      });
    }

    if (paymentRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This payment request has already been processed.",
      });
    }

    paymentRequest.status = "rejected";
    paymentRequest.note = note || paymentRequest.note;
    await paymentRequest.save();

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
