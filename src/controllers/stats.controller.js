import Resume from "../models/Resume.js";
import GeneratedDocument from "../models/GeneratedDocument.js";
import User from "../models/User.js";

const formatUserResponse = (user) => {
  return {
    id: user._id,
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    plan: user.plan,
    aiCredits: user.aiCredits,
    monthlyResumeLimit: user.monthlyResumeLimit,
    monthlyCoverLetterLimit: user.monthlyCoverLetterLimit,
    pdfExportLimit: user.pdfExportLimit,
    planExpiresAt: user.planExpiresAt,
  };
};

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      "fullName email role plan aiCredits monthlyResumeLimit monthlyCoverLetterLimit pdfExportLimit planExpiresAt"
    );

    const [totalResumes, totalGenerations, recentResumes, recentDocuments] =
      await Promise.all([
        Resume.countDocuments({ user: userId }),

        GeneratedDocument.countDocuments({ user: userId }),

        Resume.find({ user: userId })
          .sort({ createdAt: -1 })
          .limit(3)
          .select("fullName title template createdAt"),

        GeneratedDocument.find({ user: userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("type title language tone source createdAt"),
      ]);

    const resumeGenerations = await GeneratedDocument.countDocuments({
      user: userId,
      type: "resume",
    });

    const coverLetterGenerations = await GeneratedDocument.countDocuments({
      user: userId,
      type: "cover_letter",
    });

    return res.status(200).json({
      success: true,
      user: formatUserResponse(user),
      stats: {
        totalResumes,
        totalGenerations,
        resumeGenerations,
        coverLetterGenerations,
      },
      recentResumes,
      recentDocuments,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard stats.",
    });
  }
};