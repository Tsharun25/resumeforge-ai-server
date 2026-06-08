import mongoose from "mongoose";

const generatedDocumentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "resume",
        "cover_letter",
        "linkedin_bio",
        "upwork_profile",
        "fiverr_gig",
        "proposal",
        "idea_report",
        "trending_advice",
        "career_plan",
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    language: {
      type: String,
      enum: ["English", "Bangla", "Bangla + English"],
      default: "English",
    },
    tone: {
      type: String,
      default: "Professional",
    },
    source: {
      type: String,
      enum: ["openai", "mock"],
      default: "mock",
    },
    input: {
      type: Object,
      default: {},
    },
    output: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const GeneratedDocument = mongoose.model(
  "GeneratedDocument",
  generatedDocumentSchema
);

export default GeneratedDocument;