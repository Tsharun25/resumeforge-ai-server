import mongoose from "mongoose";

const paymentRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["starter", "pro", "agency"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["bKash", "Nagad", "Rocket", "Tap", "Upay", "Bank Transfer"],
      required: true,
    },

    transactionId: {
      type: String,
      required: true,
      trim: true,
    },

    senderNumber: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const PaymentRequest = mongoose.model(
  "PaymentRequest",
  paymentRequestSchema
);

export default PaymentRequest;
