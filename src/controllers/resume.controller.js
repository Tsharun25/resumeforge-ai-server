import Resume from "../models/Resume.js";

const getResumeLimitMessage = (plan, limit) => {
  const planNameMap = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    agency: "Agency",
  };

  const planName = planNameMap[plan] || "Free";

  return `Resume limit reached for your ${planName} plan. Your current plan allows ${limit} saved resume${limit === 1 ? "" : "s"}. Please upgrade your subscription to create more resumes.`;
};

export const createResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const resumeLimit = req.user.monthlyResumeLimit || 1;

    const currentResumeCount = await Resume.countDocuments({
      user: userId,
    });

    if (currentResumeCount >= resumeLimit) {
      return res.status(403).json({
        success: false,
        code: "RESUME_LIMIT_REACHED",
        message: getResumeLimitMessage(req.user.plan, resumeLimit),
        limit: resumeLimit,
        used: currentResumeCount,
        plan: req.user.plan,
      });
    }

    const resume = await Resume.create({
      user: userId,
      template: req.body.template || "classic",
      fullName: req.body.fullName || "",
      title: req.body.title || "",
      email: req.body.email || "",
      phone: req.body.phone || "",
      location: req.body.location || "",
      portfolio: req.body.portfolio || "",
      summary: req.body.summary || "",
      skills: req.body.skills || [],
      education: req.body.education || [],
      certifications: req.body.certifications || [],
      languages: req.body.languages || [],
      experience: req.body.experience || [],
      projects: req.body.projects || [],
    });

    return res.status(201).json({
      success: true,
      message: "Resume saved successfully.",
      resume,
      usage: {
        limit: resumeLimit,
        used: currentResumeCount + 1,
        remaining: Math.max(resumeLimit - (currentResumeCount + 1), 0),
      },
    });
  } catch (error) {
    console.error("Create resume error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save resume.",
    });
  }
};

export const getMyResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({
      user: req.user._id,
    }).sort({
      createdAt: -1,
    });

    const resumeLimit = req.user.monthlyResumeLimit || 1;

    return res.status(200).json({
      success: true,
      count: resumes.length,
      limit: resumeLimit,
      remaining: Math.max(resumeLimit - resumes.length, 0),
      resumes,
    });
  } catch (error) {
    console.error("Get resumes error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch resumes.",
    });
  }
};

export const getSingleResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    return res.status(200).json({
      success: true,
      resume,
    });
  } catch (error) {
    console.error("Get single resume error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch resume.",
    });
  }
};

export const updateResume = async (req, res) => {
  try {
    const allowedUpdates = {
      template: req.body.template,
      fullName: req.body.fullName,
      title: req.body.title,
      email: req.body.email,
      phone: req.body.phone,
      location: req.body.location,
      portfolio: req.body.portfolio,
      summary: req.body.summary,
      skills: req.body.skills,
      education: req.body.education,
      certifications: req.body.certifications,
      languages: req.body.languages,
      experience: req.body.experience,
      projects: req.body.projects,
    };

    Object.keys(allowedUpdates).forEach((key) => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    const resume = await Resume.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      allowedUpdates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Resume updated successfully.",
      resume,
    });
  } catch (error) {
    console.error("Update resume error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update resume.",
    });
  }
};

export const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    const resumeLimit = req.user.monthlyResumeLimit || 1;

    const currentResumeCount = await Resume.countDocuments({
      user: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Resume deleted successfully.",
      usage: {
        limit: resumeLimit,
        used: currentResumeCount,
        remaining: Math.max(resumeLimit - currentResumeCount, 0),
      },
    });
  } catch (error) {
    console.error("Delete resume error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete resume.",
    });
  }
};