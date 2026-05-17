import OpenAI from "openai";
import GeneratedDocument from "../models/GeneratedDocument.js";
import User from "../models/User.js";

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

const checkAndConsumeCredit = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.plan === "free" && user.aiCredits <= 0) {
    const error = new Error(
      "You have used all free AI credits. Please upgrade your plan."
    );
    error.statusCode = 403;
    throw error;
  }

  if (user.plan === "free") {
    user.aiCredits -= 1;
    await user.save();
  }

  return user;
};

const getLanguageInstruction = (language) => {
  if (language === "Bangla") {
    return "Write the output in natural, professional Bangla.";
  }

  if (language === "Bangla + English") {
    return "Write the output in Bangla-English mixed style, suitable for Bangladeshi users.";
  }

  return "Write the output in professional English.";
};

const saveGeneratedDocument = async ({
  userId,
  type,
  title,
  language,
  tone,
  source,
  input,
  output,
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

const generateMockResumeContent = ({
  jobTitle,
  experienceLevel,
  skills,
  targetRole,
  language = "English",
}) => {
  const role = targetRole || jobTitle;

  if (language === "Bangla") {
    return {
      summary: `${jobTitle} হিসেবে ${experienceLevel} পর্যায়ের অভিজ্ঞতা নিয়ে আধুনিক, responsive এবং scalable web application তৈরি করতে আগ্রহী। ${skills} ব্যবহার করে clean UI, reusable component, REST API integration এবং user-friendly digital product তৈরি করার দক্ষতা রয়েছে। বাস্তব ব্যবসায়িক সমস্যা সমাধানে reliable full-stack development করতে আগ্রহী।`,

      experienceDescription: `${skills} ব্যবহার করে client এবং portfolio project-এর জন্য modern web application তৈরি ও maintain করেছি। Responsive interface, authentication flow, REST API integration, dashboard এবং reusable component তৈরি করার মাধ্যমে product quality, performance এবং user experience উন্নত করেছি।`,

      projectDescription: `${role} লক্ষ্য করে একটি professional project তৈরি করেছি যেখানে modern responsive UI, secure authentication, clean dashboard experience, reusable architecture এবং production-ready code structure ব্যবহার করা হয়েছে। Projectটি scalability, performance এবং real-world client requirements মাথায় রেখে তৈরি করা হয়েছে।`,
    };
  }

  if (language === "Bangla + English") {
    return {
      summary: `Results-driven ${jobTitle} with ${experienceLevel.toLowerCase()}-level experience in building modern, responsive, and scalable web applications. ${skills} নিয়ে strong hands-on experience আছে, especially clean UI, REST API integration, dashboard, authentication flow এবং user-friendly SaaS product development এ।`,

      experienceDescription: `Developed and maintained modern web applications using ${skills}. Responsive frontend, secure authentication, REST API integration, dashboard UI এবং reusable components build করেছি while improving performance, usability, and overall product quality for ${role} requirements.`,

      projectDescription: `Built a professional ${role} project with modern responsive UI, secure authentication, clean dashboard experience, reusable architecture এবং production-ready code structure. Focus ছিল scalability, performance, polished design এবং real client/business requirements.`,
    };
  }

  return {
    summary: `Results-driven ${jobTitle} with ${experienceLevel.toLowerCase()}-level experience building modern, responsive, and scalable web applications. Skilled in ${skills}, with a strong focus on clean UI, performance, reusable components, and user-friendly digital experiences. Passionate about solving real business problems through reliable full-stack development.`,

    experienceDescription: `Developed and maintained modern web applications for clients and portfolio projects using ${skills}. Built responsive interfaces, REST API integrations, authentication flows, dashboards, and reusable components while improving performance, usability, and overall product quality for ${role} requirements.`,

    projectDescription: `Built a professional ${role} project featuring a modern responsive UI, secure authentication, clean dashboard experience, reusable architecture, and production-ready code structure. Focused on scalability, performance, polished design, and real-world client requirements.`,
  };
};

export const generateResumeContent = async (req, res) => {
  try {
    const {
      jobTitle,
      experienceLevel,
      skills,
      targetRole,
      language = "English",
      tone = "Professional",
    } = req.body;

    if (!jobTitle || !experienceLevel || !skills) {
      return res.status(400).json({
        success: false,
        message: "Job title, experience level, and skills are required.",
      });
    }

    const user = await checkAndConsumeCredit(req.user._id);
    const openai = getOpenAIClient();

    if (!openai) {
      const output = generateMockResumeContent({
        jobTitle,
        experienceLevel,
        skills,
        targetRole,
        language,
        tone,
      });

      await saveGeneratedDocument({
        userId: req.user._id,
        type: "resume",
        title: jobTitle,
        language,
        tone,
        source: "mock",
        input: {
          jobTitle,
          experienceLevel,
          skills,
          targetRole,
        },
        output,
      });

      return res.status(200).json({
        success: true,
        source: "mock",
        remainingCredits: user.aiCredits,
        data: output,
      });
    }

    try {
      const prompt = `
You are an expert resume writer for Bangladesh and Asia focused job seekers, freelancers, and students.

Candidate details:
Job Title: ${jobTitle}
Experience Level: ${experienceLevel}
Skills: ${skills}
Target Role: ${targetRole || jobTitle}
Output Language: ${language}
Output Tone: ${tone}

Language instruction:
${getLanguageInstruction(language)}

Tone instruction:
Use a ${tone} tone.

Return ONLY valid JSON with this structure:
{
  "summary": "A polished 3-4 line professional resume summary.",
  "experienceDescription": "A strong achievement-focused experience paragraph.",
  "projectDescription": "A polished project description suitable for a resume."
}

Rules:
- Make it ATS-friendly.
- Keep it suitable for Bangladesh/Asia job market.
- Use strong action verbs.
- Keep it concise and practical.
- Do not include markdown.
- Do not include extra text outside JSON.
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You write ATS-friendly career content and always return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      const rawContent = completion.choices[0]?.message?.content;

      if (!rawContent) {
        throw new Error("AI did not return any content.");
      }

      const parsedContent = JSON.parse(rawContent);

      await saveGeneratedDocument({
        userId: req.user._id,
        type: "resume",
        title: jobTitle,
        language,
        tone,
        source: "openai",
        input: {
          jobTitle,
          experienceLevel,
          skills,
          targetRole,
        },
        output: parsedContent,
      });

      return res.status(200).json({
        success: true,
        source: "openai",
        remainingCredits: user.aiCredits,
        data: parsedContent,
      });
    } catch (aiError) {
      console.error("OpenAI fallback triggered:", aiError.message);

      const output = generateMockResumeContent({
        jobTitle,
        experienceLevel,
        skills,
        targetRole,
        language,
        tone,
      });

      await saveGeneratedDocument({
        userId: req.user._id,
        type: "resume",
        title: jobTitle,
        language,
        tone,
        source: "mock",
        input: {
          jobTitle,
          experienceLevel,
          skills,
          targetRole,
        },
        output,
      });

      return res.status(200).json({
        success: true,
        source: "mock",
        message: "OpenAI unavailable, generated demo content instead.",
        remainingCredits: user.aiCredits,
        data: output,
      });
    }
  } catch (error) {
    console.error("AI generation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to generate resume content.",
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
      jobDescription,
      language = "English",
      tone = "Professional",
    } = req.body;

    if (!jobTitle || !companyName || !applicantName || !skills) {
      return res.status(400).json({
        success: false,
        message:
          "Job title, company name, applicant name, and skills are required.",
      });
    }

    const user = await checkAndConsumeCredit(req.user._id);

    let coverLetter;

    if (language === "Bangla") {
      coverLetter = `
প্রিয় Hiring Manager,

আমি ${companyName}-এর ${jobTitle} পদের জন্য আবেদন করতে আগ্রহী। ${skills} বিষয়ে আমার hands-on অভিজ্ঞতা রয়েছে এবং আমি modern, responsive ও user-friendly web application তৈরি করতে ভালোবাসি।

আমার recent projects-এ full-stack application, dashboard system, authentication flow, REST API integration এবং polished frontend interface নিয়ে কাজ করেছি। এই অভিজ্ঞতাগুলো আমাকে clean code, scalable architecture এবং real product thinking সম্পর্কে ভালো ধারণা দিয়েছে।

${
  jobDescription
    ? "আপনাদের job requirements দেখে মনে হয়েছে আমার skills এই role-এর সাথে ভালোভাবে match করে, এবং আমি আপনাদের team-এ value add করতে পারব।"
    : "আমি বিশ্বাস করি আমার technical skill, শেখার আগ্রহ এবং attention to detail আমাকে আপনাদের team-এ কার্যকরভাবে contribute করতে সাহায্য করবে।"
}

আমার application consider করার জন্য ধন্যবাদ। আমি ${companyName}-এ কীভাবে contribute করতে পারি, সে বিষয়ে আলোচনা করার সুযোগ পেলে আনন্দিত হব।

শুভেচ্ছান্তে,
${applicantName}
`.trim();
    } else if (language === "Bangla + English") {
      coverLetter = `
Dear Hiring Manager,

I am excited to apply for the ${jobTitle} position at ${companyName}. ${skills} নিয়ে আমার hands-on experience আছে, and I enjoy building modern, responsive, and user-friendly web applications that solve real business problems.

In my recent projects, I worked on full-stack applications, dashboard systems, authentication flows, REST API integrations, and polished frontend interfaces. এই experience গুলো আমাকে clean code, scalable architecture, and practical product thinking develop করতে help করেছে।

${
  jobDescription
    ? "After reviewing the job requirements, I believe my skills align well with your needs and I would be excited to contribute to your team."
    : "I am confident that my technical skills, attention to detail, and willingness to learn would allow me to contribute effectively to your team."
}

Thank you for considering my application. I would welcome the opportunity to discuss how I can contribute to ${companyName}.

Sincerely,
${applicantName}
`.trim();
    } else {
      coverLetter = `
Dear Hiring Manager,

I am excited to apply for the ${jobTitle} position at ${companyName}. As a motivated developer with hands-on experience in ${skills}, I enjoy building modern, responsive, and user-friendly web applications that solve real business problems.

In my recent projects, I have worked on full-stack applications, dashboard systems, authentication flows, REST API integrations, and polished frontend interfaces. These experiences helped me develop a strong understanding of clean code, scalable architecture, and practical product thinking.

${
  jobDescription
    ? "After reviewing the job requirements, I believe my skills align well with your needs and I would be excited to contribute to your team."
    : "I am confident that my technical skills, attention to detail, and willingness to learn would allow me to contribute effectively to your team."
}

Thank you for considering my application. I would welcome the opportunity to discuss how I can contribute to ${companyName}.

Sincerely,
${applicantName}
`.trim();
    }

    await saveGeneratedDocument({
      userId: req.user._id,
      type: "cover_letter",
      title: `${jobTitle} at ${companyName}`,
      language,
      tone,
      source: "mock",
      input: {
        jobTitle,
        companyName,
        applicantName,
        skills,
        jobDescription,
      },
      output: {
        coverLetter,
      },
    });

    return res.status(200).json({
      success: true,
      source: "mock",
      remainingCredits: user.aiCredits,
      data: {
        coverLetter,
      },
    });
  } catch (error) {
    console.error("Cover letter generation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to generate cover letter.",
    });
  }
};