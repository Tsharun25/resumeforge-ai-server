import mongoose from "mongoose";

const educationSchema = new mongoose.Schema(
  {
    degree: {
      type: String,
      default: "",
      trim: true,
    },
    institute: {
      type: String,
      default: "",
      trim: true,
    },
    year: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const experienceSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      default: "",
      trim: true,
    },
    duration: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
    },
    stack: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    template: {
      type: String,
      enum: ["classic", "modern", "minimal"],
      default: "classic",
    },

    fullName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      maxlength: 120,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 40,
    },

    location: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    portfolio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250,
    },

    summary: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    skills: {
      type: [String],
      default: [],
    },

    education: {
      type: [educationSchema],
      default: [],
    },

    certifications: {
      type: [String],
      default: [],
    },

    languages: {
      type: [String],
      default: [],
    },

    experience: {
      type: [experienceSchema],
      default: [],
    },

    projects: {
      type: [projectSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

resumeSchema.pre("save", function cleanArrays(next) {
  this.skills = (this.skills || [])
    .map((item) => item.trim())
    .filter(Boolean);

  this.certifications = (this.certifications || [])
    .map((item) => item.trim())
    .filter(Boolean);

  this.languages = (this.languages || [])
    .map((item) => item.trim())
    .filter(Boolean);

  next();
});

resumeSchema.pre("findOneAndUpdate", function cleanUpdateArrays(next) {
  const update = this.getUpdate();

  if (update.skills) {
    update.skills = update.skills.map((item) => item.trim()).filter(Boolean);
  }

  if (update.certifications) {
    update.certifications = update.certifications
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (update.languages) {
    update.languages = update.languages
      .map((item) => item.trim())
      .filter(Boolean);
  }

  this.setUpdate(update);

  next();
});

const Resume = mongoose.model("Resume", resumeSchema);

export default Resume;