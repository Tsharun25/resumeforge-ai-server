import User from "../models/User.js";
import GeneratedDocument from "../models/GeneratedDocument.js";

const TOOL_CONFIG = {
  upwork_profile: {
    label: "Upwork Profile Generator",
    title: "Upwork Profile",
    credits: 2,
  },
  fiverr_gig: {
    label: "Fiverr Gig Generator",
    title: "Fiverr Gig",
    credits: 2,
  },
  proposal: {
    label: "Freelance Proposal Generator",
    title: "Freelance Proposal",
    credits: 1,
  },
  linkedin_bio: {
    label: "LinkedIn Bio Generator",
    title: "LinkedIn Bio",
    credits: 1,
  },
};

const FREELANCER_TYPES = [
  "upwork_profile",
  "fiverr_gig",
  "proposal",
  "linkedin_bio",
];

const getUserId = (req) => {
  return req.user?._id || req.user?.id || req.user?.userId;
};

const cleanText = (value, fallback = "") => {
  if (!value) return fallback;
  return String(value).trim();
};

const checkAndDowngradeExpiredPlan = async (user) => {
  if (!user) return user;

  if (user.plan !== "Free" && user.planExpiresAt) {
    const now = new Date();
    const expiry = new Date(user.planExpiresAt);

    if (expiry < now) {
      user.plan = "Free";
      user.aiCredits = Math.max(Number(user.aiCredits || 0), 10);
      user.monthlyResumeLimit = 1;
      user.monthlyCoverLetterLimit = 3;
      user.pdfExportLimit = 3;
      user.planExpiresAt = null;

      await user.save();
    }
  }

  return user;
};

const buildPrompt = ({ toolType, form }) => {
  const name = cleanText(form.name, "Candidate");
  const role = cleanText(form.role, "MERN Stack Developer");
  const experience = cleanText(form.experience, "Beginner to intermediate");
  const skills = cleanText(
    form.skills,
    "React, Node.js, Express.js, MongoDB, Tailwind CSS"
  );
  const targetClient = cleanText(
    form.targetClient,
    "startup founders, small businesses, and global remote clients"
  );
  const marketFocus = cleanText(
    form.marketFocus,
    "Bangladesh and global remote market"
  );
  const tone = cleanText(form.tone, "Professional");
  const language = cleanText(form.language, "English");
  const jobPost = cleanText(form.jobPost, "No specific job post provided.");
  const extraDetails = cleanText(form.extraDetails, "No extra details provided.");

  if (toolType === "upwork_profile") {
    return `
Create a high-converting Upwork profile for a Bangladeshi freelancer.

Name: ${name}
Role / Service: ${role}
Experience: ${experience}
Skills: ${skills}
Target Clients: ${targetClient}
Market Focus: ${marketFocus}
Tone: ${tone}
Language: ${language}
Extra Details: ${extraDetails}

Output format:
1. Upwork Profile Title
2. Overview
3. Specialized Profile Summary
4. Skill Keywords
5. Why Hire Me Section
6. Short Call-to-Action

Make it polished, trustworthy, client-focused, and optimized for Upwork search.
`;
  }

  if (toolType === "fiverr_gig") {
    return `
Create a Fiverr gig for a Bangladeshi freelancer.

Name: ${name}
Service / Role: ${role}
Experience: ${experience}
Skills: ${skills}
Target Buyers: ${targetClient}
Market Focus: ${marketFocus}
Tone: ${tone}
Language: ${language}
Extra Details: ${extraDetails}

Output format:
1. SEO Gig Title
2. Search Tags
3. Gig Description
4. Basic Package
5. Standard Package
6. Premium Package
7. FAQ
8. Buyer Requirements

Make it conversion-focused, realistic, and suitable for Fiverr.
`;
  }

  if (toolType === "proposal") {
    return `
Write a personalized freelance proposal.

Freelancer Name: ${name}
Role / Service: ${role}
Experience: ${experience}
Skills: ${skills}
Target Client: ${targetClient}
Tone: ${tone}
Language: ${language}

Client Job Post:
${jobPost}

Extra Details:
${extraDetails}

Output format:
1. Short greeting
2. Understanding of the client's problem
3. Why I am a good fit
4. Relevant skills
5. Suggested approach
6. Timeline / availability
7. Friendly CTA

Keep it concise, human, specific, and not generic.
`;
  }

  if (toolType === "linkedin_bio") {
    return `
Create a professional LinkedIn profile bio for a Bangladeshi career-focused user.

Name: ${name}
Role: ${role}
Experience: ${experience}
Skills: ${skills}
Target Audience: ${targetClient}
Market Focus: ${marketFocus}
Tone: ${tone}
Language: ${language}
Extra Details: ${extraDetails}

Output format:
1. LinkedIn Headline
2. About Section
3. Featured Skills
4. Connection CTA

Make it modern, credible, and suitable for students, fresh graduates, job seekers, and freelancers in Bangladesh.
`;
  }

  return `
Generate a professional freelancing document.

Name: ${name}
Role: ${role}
Skills: ${skills}
Experience: ${experience}
Details: ${extraDetails}
`;
};

const buildMockOutput = ({ toolType, form }) => {
  const name = cleanText(form.name, "Harun");
  const role = cleanText(form.role, "MERN Stack Developer");
  const experience = cleanText(form.experience, "1-2 Years");
  const skills = cleanText(
    form.skills,
    "React, Node.js, Express.js, MongoDB, Tailwind CSS, JWT, REST API"
  );
  const targetClient = cleanText(
    form.targetClient,
    "startup founders, ecommerce owners, SaaS businesses, and global remote clients"
  );
  const jobPost = cleanText(form.jobPost, "your project requirements");

  if (toolType === "upwork_profile") {
    return {
      content: `# Upwork Profile

## Profile Title
${role} | React, Node.js, MongoDB & Modern SaaS Web Apps

## Overview
Hi, I’m ${name}, a ${role} focused on building clean, responsive, and business-ready web applications.

I help ${targetClient} turn ideas into polished digital products using ${skills}. My focus is not only writing code, but also building products that feel professional, load fast, work smoothly on mobile, and support real business goals.

## What I Can Help With
- Full-stack MERN web applications
- SaaS dashboards and admin panels
- Authentication and protected routes
- REST API development
- MongoDB database design
- Responsive frontend with Tailwind CSS
- Bug fixing and performance improvements
- MVP development for startups

## Why Work With Me
I care about clean UI, reliable backend logic, and clear communication. I can work with your existing idea, improve an unfinished project, or build a complete MVP from scratch.

## Skills
${skills}

## CTA
If you need a reliable developer for a modern web app, dashboard, SaaS product, or MERN project, feel free to message me. I’d love to discuss your project.`,
    };
  }

  if (toolType === "fiverr_gig") {
    return {
      content: `# Fiverr Gig

## SEO Gig Title
I will build a modern MERN stack website, SaaS dashboard, or web application

## Search Tags
mern stack, react website, node js, mongodb, saas dashboard

## Gig Description
Are you looking for a modern, responsive, and professional web application?

I’m ${name}, a ${role} with experience in ${skills}. I can build clean and scalable websites, dashboards, SaaS platforms, business apps, and MVPs for ${targetClient}.

## What You Will Get
- Responsive React frontend
- Node.js and Express backend
- MongoDB database integration
- JWT authentication
- Dashboard UI
- Clean reusable components
- Bug fixing and deployment support

## Basic Package
Simple responsive landing page or small frontend fix.

## Standard Package
Full frontend page with API integration and responsive layout.

## Premium Package
Complete MERN stack web app with authentication, dashboard, database, and deployment guidance.

## FAQ
Q: Do you build custom dashboards?
A: Yes, I can build SaaS dashboards, admin panels, CRM dashboards, and analytics pages.

Q: Can you fix bugs in an existing MERN project?
A: Yes, I can debug frontend, backend, API, database, and deployment issues.

## Buyer Requirements
Please share your project idea, design reference, features list, and any existing code or website link.`,
    };
  }

  if (toolType === "proposal") {
    return {
      content: `Hi,

I read your project details and understand that you need help with ${jobPost}.

I’m ${name}, a ${role} with experience in ${skills}. I can help you build a clean, responsive, and reliable solution that matches your business needs.

Here’s how I would approach the project:

1. Understand your exact requirements and user flow
2. Build a clean and mobile-responsive UI
3. Connect frontend with backend/API properly
4. Test all core features
5. Deliver clean, maintainable code

I have worked with MERN stack projects including dashboards, authentication, CRUD systems, SaaS-style interfaces, and modern responsive layouts. I focus on quality, communication, and practical solutions instead of just writing code.

I’m available to start and would be happy to discuss the details with you.

Best regards,  
${name}`,
    };
  }

  if (toolType === "linkedin_bio") {
    return {
      content: `# LinkedIn Profile

## Headline
${role} | MERN Stack Developer | React, Node.js, MongoDB | Building Modern SaaS & Business Web Apps

## About
Hi, I’m ${name}, a ${role} passionate about building clean, useful, and business-focused web applications.

I work with ${skills} to create responsive websites, SaaS dashboards, admin panels, REST APIs, and full-stack MERN applications. My goal is to build products that are not only functional, but also polished, mobile-friendly, and ready for real users.

I’m especially interested in career-tech, SaaS products, startup MVPs, ecommerce, CRM dashboards, and AI-powered web platforms.

## Core Skills
${skills}

## What I’m Building
I’m continuously improving my portfolio with production-style projects that solve real problems and demonstrate practical full-stack development skills.

## CTA
I’m open to freelance projects, remote opportunities, collaborations, and meaningful tech conversations.`,
    };
  }

  return {
    content: `Generated freelancer content for ${role}.`,
  };
};

const generateWithOpenAI = async ({ prompt }) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      source: "mock",
      content: null,
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are CareerPilot AI, a Bangladesh-focused AI Career Operating System. Generate polished, practical, conversion-focused content for Bangladeshi students, fresh graduates, job seekers, and freelancers.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.75,
        max_tokens: 1400,
      }),
    });

    if (!response.ok) {
      return {
        source: "mock",
        content: null,
      };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    return {
      source: content ? "openai" : "mock",
      content: content || null,
    };
  } catch (error) {
    return {
      source: "mock",
      content: null,
    };
  }
};

export const generateFreelancerContent = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { toolType, form = {} } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    const config = TOOL_CONFIG[toolType];

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "Invalid freelancer tool selected.",
      });
    }

    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user = await checkAndDowngradeExpiredPlan(user);

    const currentCredits = Number(user.aiCredits || 0);
    const creditsRequired = config.credits;

    if (currentCredits < creditsRequired) {
      return res.status(403).json({
        success: false,
        message: `Not enough AI credits. This tool needs ${creditsRequired} credits.`,
        creditsRequired,
        currentCredits,
      });
    }

    const prompt = buildPrompt({ toolType, form });
    const aiResult = await generateWithOpenAI({ prompt });
    const mockOutput = buildMockOutput({ toolType, form });

    const finalContent = aiResult.content || mockOutput.content;
    const source = aiResult.content ? aiResult.source : "mock";

    user.aiCredits = Math.max(0, currentCredits - creditsRequired);
    await user.save();

    const titleRole = cleanText(form.role, "Career Document");

    const document = await GeneratedDocument.create({
      user: user._id,
      type: toolType,
      title: `${config.title} - ${titleRole}`,
      language: cleanText(form.language, "English"),
      tone: cleanText(form.tone, "Professional"),
      source,
      input: {
        ...form,
        toolType,
        creditsUsed: creditsRequired,
      },
      output: {
        content: finalContent,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Freelancer content generated successfully.",
      data: {
        document,
        remainingCredits: user.aiCredits,
        creditsUsed: creditsRequired,
        source,
      },
    });
  } catch (error) {
    console.error("Generate freelancer content error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate freelancer content.",
    });
  }
};

export const getFreelancerHistory = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    const documents = await GeneratedDocument.find({
      user: userId,
      type: { $in: FREELANCER_TYPES },
    })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("Get freelancer history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load freelancer history.",
    });
  }
};

export const getSingleFreelancerDocument = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const document = await GeneratedDocument.findOne({
      _id: id,
      user: userId,
      type: { $in: FREELANCER_TYPES },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("Get freelancer document error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load document.",
    });
  }
};

export const deleteFreelancerDocument = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const document = await GeneratedDocument.findOneAndDelete({
      _id: id,
      user: userId,
      type: { $in: FREELANCER_TYPES },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (error) {
    console.error("Delete freelancer document error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete document.",
    });
  }
};