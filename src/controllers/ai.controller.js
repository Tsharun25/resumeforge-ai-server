import GeneratedDocument from "../models/GeneratedDocument.js";
import { reserveCredits, refundCredits } from "../services/credit.service.js";
import { generateStructuredOutput } from "../services/openai.service.js";

const AI_CREDIT_COST = 1;

const cleanText = (value, maxLength = 4000) =>
  String(value || "").trim().slice(0, maxLength);

const getLanguageInstruction = (language) => {
  if (language === "Bangla") {
    return "Write in natural professional Bangla script. Keep unavoidable job titles, product names, and technical terms in English.";
  }

  if (language === "Bangla + English") {
    return "Write in a natural professional Bangla-English mixed style suitable for Bangladesh, without awkward word-by-word mixing.";
  }

  return "Write in concise, natural professional English.";
};

const saveGeneratedDocument = async ({
  userId,
  type,
  title,
  language,
  tone,
  input,
  output,
  source = "openai",
}) => {
  try {
    await GeneratedDocument.create({
      user: userId,
      type,
      title,
      language,
      tone,
      source,
      input,
      output,
    });
  } catch (error) {
    console.error("Generated document tracking failed:", error.message);
  }
};

const resumeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    optimizedSkills: {
      type: "array",
      items: { type: "string" },
    },
    experienceDescription: { type: "string" },
    projectDescription: { type: "string" },
    matchScore: { type: "integer", minimum: 0, maximum: 100 },
    matchedKeywords: {
      type: "array",
      items: { type: "string" },
    },
    missingKeywords: {
      type: "array",
      items: { type: "string" },
    },
    strengths: {
      type: "array",
      items: { type: "string" },
    },
    improvements: {
      type: "array",
      items: { type: "string" },
    },
    truthCheckQuestions: {
      type: "array",
      items: { type: "string" },
    },
    recruiterMessage: { type: "string" },
  },
  required: [
    "summary",
    "optimizedSkills",
    "experienceDescription",
    "projectDescription",
    "matchScore",
    "matchedKeywords",
    "missingKeywords",
    "strengths",
    "improvements",
    "truthCheckQuestions",
    "recruiterMessage",
  ],
};

const coverLetterSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    coverLetter: { type: "string" },
    matchedKeywords: {
      type: "array",
      items: { type: "string" },
    },
    missingInformation: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["coverLetter", "matchedKeywords", "missingInformation"],
};

const runCreditedGeneration = async ({ userId, generate }) => {
  const user = await reserveCredits(userId, AI_CREDIT_COST);

  try {
    const output = await generate();
    return {
      output,
      provider: output.__provider || "openai",
      remainingCredits: user.aiCredits,
    };
  } catch (error) {
    await refundCredits(userId, AI_CREDIT_COST);
    throw error;
  }
};

export const generateResumeContent = async (req, res) => {
  try {
    const {
      jobTitle,
      targetRole,
      experienceLevel,
      skills,
      achievements,
      jobDescription,
      resumeData = {},
      language = "English",
      tone = "Professional",
    } = req.body;

    if (!cleanText(targetRole || jobTitle) || !cleanText(experienceLevel) || !cleanText(skills)) {
      return res.status(400).json({
        success: false,
        message: "Target role, experience level, and skills are required.",
      });
    }

    const safeInput = {
      targetRole: cleanText(targetRole || jobTitle, 160),
      experienceLevel: cleanText(experienceLevel, 120),
      skills: cleanText(skills, 2500),
      achievements: cleanText(achievements, 4000),
      jobDescription: cleanText(jobDescription, 15000),
      resumeData: {
        fullName: cleanText(resumeData.fullName, 120),
        title: cleanText(resumeData.title, 120),
        summary: cleanText(resumeData.summary, 2500),
        skills: Array.isArray(resumeData.skills)
          ? resumeData.skills.map((item) => cleanText(item, 120)).filter(Boolean).slice(0, 40)
          : [],
        experience: Array.isArray(resumeData.experience)
          ? resumeData.experience.slice(0, 10)
          : [],
        projects: Array.isArray(resumeData.projects)
          ? resumeData.projects.slice(0, 10)
          : [],
        education: Array.isArray(resumeData.education)
          ? resumeData.education.slice(0, 10)
          : [],
      },
      language,
      tone,
    };

    const { output, provider, remainingCredits } = await runCreditedGeneration({
      userId: req.user._id,
      generate: () =>
        generateStructuredOutput({
          userId: req.user._id,
          schemaName: "careerpilot_resume_optimization",
          schema: resumeSchema,
          instructions: `You are CareerPilot AI, a rigorous resume strategist for Bangladesh and international job markets. Create ATS-readable, job-specific content using only facts supplied by the candidate. Never invent employers, dates, degrees, projects, responsibilities, metrics, certifications, or skills. Treat the job description as requirements, not as facts about the candidate. Put unsupported requirements in missingKeywords or truthCheckQuestions, never in the resume. If experience or project evidence is missing, return an empty description and ask concise truth-check questions. ${getLanguageInstruction(language)}`,
          input: `Optimize this candidate for the target role and evaluate the match.\n\n${JSON.stringify(safeInput, null, 2)}\n\nRules:\n- Summary: 60-90 words and specific to supplied evidence.\n- optimizedSkills: only skills the candidate explicitly supplied.\n- experienceDescription and projectDescription: concise ATS-friendly bullet-style lines separated by newlines; return an empty string when evidence is unavailable.\n- matchScore must be evidence-based; a missing job description means a conservative general-readiness score.\n- missingKeywords are job requirements not evidenced by the candidate.\n- recruiterMessage: 50-80 words, truthful and ready to send.`,
        }),
    });

    await saveGeneratedDocument({
      userId: req.user._id,
      type: "resume",
      title: safeInput.targetRole,
      language,
      tone,
      input: safeInput,
      output,
      source: provider,
    });

    return res.status(200).json({
      success: true,
      source: provider,
      remainingCredits,
      data: output,
    });
  } catch (error) {
    console.error("Resume AI generation error:", error.message);

    return res.status(error.statusCode || 502).json({
      success: false,
      code: "AI_GENERATION_FAILED",
      message:
        error.statusCode === 403
          ? error.message
          : "We could not generate a reliable result. No AI credit was charged. Please try again.",
    });
  }
};

export const generateCoverLetter = async (req, res) => {
  try {
    const {
      jobTitle,
      companyName,
      applicantName,
      skills,
      achievements,
      experienceSummary,
      jobDescription,
      language = "English",
      tone = "Professional",
    } = req.body;

    if (!cleanText(jobTitle) || !cleanText(companyName) || !cleanText(applicantName) || !cleanText(skills)) {
      return res.status(400).json({
        success: false,
        message: "Job title, company name, applicant name, and skills are required.",
      });
    }

    const monthStart = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
    );
    const monthlyLimit = Number(req.user.monthlyCoverLetterLimit || 1);
    const monthlyUsage = await GeneratedDocument.countDocuments({
      user: req.user._id,
      type: "cover_letter",
      createdAt: { $gte: monthStart },
    });

    if (monthlyUsage >= monthlyLimit) {
      return res.status(403).json({
        success: false,
        code: "COVER_LETTER_LIMIT_REACHED",
        message: `Your plan includes ${monthlyLimit} cover letter${monthlyLimit === 1 ? "" : "s"} per calendar month.`,
      });
    }

    const safeInput = {
      jobTitle: cleanText(jobTitle, 160),
      companyName: cleanText(companyName, 160),
      applicantName: cleanText(applicantName, 160),
      skills: cleanText(skills, 2500),
      achievements: cleanText(achievements, 4000),
      experienceSummary: cleanText(experienceSummary, 5000),
      jobDescription: cleanText(jobDescription, 15000),
      language,
      tone,
    };

    const { output, provider, remainingCredits } = await runCreditedGeneration({
      userId: req.user._id,
      generate: () =>
        generateStructuredOutput({
          userId: req.user._id,
          schemaName: "careerpilot_cover_letter",
          schema: coverLetterSchema,
          instructions: `You are CareerPilot AI, an expert job application writer. Write a human, specific cover letter using only facts the applicant supplied. Never invent experience, achievements, company facts, or metrics. Do not repeat the resume or use generic clichés. ${getLanguageInstruction(language)}`,
          input: `Create a concise cover letter for this application.\n\n${JSON.stringify(safeInput, null, 2)}\n\nRequirements:\n- 250-350 words when enough evidence exists; shorter when evidence is limited.\n- Connect supplied evidence to the most important job requirements.\n- Use the requested ${tone} tone.\n- Do not use placeholders, markdown headings, or unsupported claims.\n- missingInformation must list facts that would make the letter stronger but were not supplied.`,
        }),
    });

    await saveGeneratedDocument({
      userId: req.user._id,
      type: "cover_letter",
      title: `${safeInput.jobTitle} at ${safeInput.companyName}`,
      language,
      tone,
      input: safeInput,
      output,
      source: provider,
    });

    return res.status(200).json({
      success: true,
      source: provider,
      remainingCredits,
      data: output,
    });
  } catch (error) {
    console.error("Cover letter generation error:", error.message);

    return res.status(error.statusCode || 502).json({
      success: false,
      code: "AI_GENERATION_FAILED",
      message:
        error.statusCode === 403
          ? error.message
          : "We could not generate a reliable cover letter. No AI credit was charged. Please try again.",
    });
  }
};
