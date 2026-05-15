import OpenAI from "openai";

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

const generateMockResumeContent = ({
  jobTitle,
  experienceLevel,
  skills,
  targetRole,
}) => {
  const role = targetRole || jobTitle;

  return {
    summary: `Results-driven ${jobTitle} with ${experienceLevel.toLowerCase()}-level experience building modern, responsive, and scalable web applications. Skilled in ${skills}, with a strong focus on clean UI, performance, reusable components, and user-friendly digital experiences. Passionate about solving real business problems through reliable full-stack development.`,

    experienceDescription: `Developed and maintained modern web applications for clients and portfolio projects using ${skills}. Built responsive interfaces, REST API integrations, authentication flows, dashboards, and reusable components while improving performance, usability, and overall product quality for ${role} requirements.`,

    projectDescription: `Built a professional ${role} project featuring a modern responsive UI, secure authentication, clean dashboard experience, reusable architecture, and production-ready code structure. Focused on scalability, performance, polished design, and real-world client requirements.`,
  };
};

export const generateResumeContent = async (req, res) => {
  try {
    const { jobTitle, experienceLevel, skills, targetRole } = req.body;

    if (!jobTitle || !experienceLevel || !skills) {
      return res.status(400).json({
        success: false,
        message: "Job title, experience level, and skills are required.",
      });
    }

    const openai = getOpenAIClient();

    if (!openai) {
      return res.status(200).json({
        success: true,
        source: "mock",
        data: generateMockResumeContent({
          jobTitle,
          experienceLevel,
          skills,
          targetRole,
        }),
      });
    }

    try {
      const prompt = `
You are an expert resume writer.

Create professional resume content for this candidate:

Job Title: ${jobTitle}
Experience Level: ${experienceLevel}
Skills: ${skills}
Target Role: ${targetRole || jobTitle}

Return ONLY valid JSON with this structure:
{
  "summary": "A polished 3-4 line professional summary.",
  "experienceDescription": "A strong achievement-focused experience paragraph.",
  "projectDescription": "A polished project description suitable for a resume."
}

Rules:
- Make it ATS-friendly.
- Use strong action verbs.
- Keep it concise.
- Do not include markdown.
- Do not include extra text outside JSON.
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You write ATS-friendly resume content and always return valid JSON.",
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

      return res.status(200).json({
        success: true,
        source: "openai",
        data: parsedContent,
      });
    } catch (aiError) {
      console.error("OpenAI fallback triggered:", aiError.message);

      return res.status(200).json({
        success: true,
        source: "mock",
        message:
          "OpenAI quota unavailable, generated demo content instead.",
        data: generateMockResumeContent({
          jobTitle,
          experienceLevel,
          skills,
          targetRole,
        }),
      });
    }
  } catch (error) {
    console.error("AI generation error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate resume content.",
    });
  }
};

export const generateCoverLetter = async (req, res) => {
  try {
    const { jobTitle, companyName, applicantName, skills, jobDescription } =
      req.body;

    if (!jobTitle || !companyName || !applicantName || !skills) {
      return res.status(400).json({
        success: false,
        message: "Job title, company name, applicant name, and skills are required.",
      });
    }

    const mockCoverLetter = `
Dear Hiring Manager,

I am excited to apply for the ${jobTitle} position at ${companyName}. As a motivated developer with hands-on experience in ${skills}, I enjoy building modern, responsive, and user-friendly web applications that solve real business problems.

In my recent projects, I have worked on full-stack applications, dashboard systems, authentication flows, REST API integrations, and polished frontend interfaces. These experiences helped me develop a strong understanding of clean code, scalable architecture, and practical product thinking.

${jobDescription ? "After reviewing the job requirements, I believe my skills align well with your needs and I would be excited to contribute to your team." : "I am confident that my technical skills, attention to detail, and willingness to learn would allow me to contribute effectively to your team."}

Thank you for considering my application. I would welcome the opportunity to discuss how I can contribute to ${companyName}.

Sincerely,
${applicantName}
`.trim();

    return res.status(200).json({
      success: true,
      source: "mock",
      data: {
        coverLetter: mockCoverLetter,
      },
    });
  } catch (error) {
    console.error("Cover letter generation error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate cover letter.",
    });
  }
};