import User from "../models/User.js";
import GeneratedDocument from "../models/GeneratedDocument.js";

const TOOL_CONFIG = {
  niche_ideas: {
    label: "Niche Idea Generator",
    title: "Niche Ideas Report",
    credits: 2,
  },
  career_path: {
    label: "Career Path Generator",
    title: "Career Path Report",
    credits: 2,
  },
  skill_roadmap: {
    label: "Skill Roadmap Generator",
    title: "Skill Roadmap Report",
    credits: 2,
  },
  income_roadmap: {
    label: "Income Roadmap Generator",
    title: "Income Roadmap Report",
    credits: 2,
  },
};

const cleanText = (value, fallback = "") => {
  if (!value) return fallback;
  return String(value).trim();
};

const getUserId = (req) => {
  return req.user?._id || req.user?.id || req.user?.userId;
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
  const name = cleanText(form.name, "CareerPilot User");
  const currentStatus = cleanText(form.currentStatus, "Student / beginner");
  const field = cleanText(form.field, "Web Development");
  const skills = cleanText(
    form.skills,
    "HTML, CSS, JavaScript, React, Node.js"
  );
  const interests = cleanText(
    form.interests,
    "freelancing, remote jobs, SaaS products, AI tools"
  );
  const goal = cleanText(
    form.goal,
    "build a strong career and start earning online"
  );
  const targetIncome = cleanText(form.targetIncome, "৳30,000 - ৳100,000/month");
  const timeline = cleanText(form.timeline, "6 months");
  const language = cleanText(form.language, "English");
  const marketFocus = cleanText(
    form.marketFocus,
    "Bangladesh and global remote market"
  );
  const extraDetails = cleanText(form.extraDetails, "No extra details.");

  if (toolType === "niche_ideas") {
    return `
Generate profitable niche ideas for a Bangladesh-focused career and freelancing user.

Name: ${name}
Current Status: ${currentStatus}
Field: ${field}
Skills: ${skills}
Interests: ${interests}
Goal: ${goal}
Target Income: ${targetIncome}
Timeline: ${timeline}
Market Focus: ${marketFocus}
Language: ${language}
Extra Details: ${extraDetails}

Output format:
1. Best Niche Ideas
2. Why These Niches Fit
3. Bangladesh Market Opportunity
4. Global Freelance Opportunity
5. Beginner-Friendly Service Ideas
6. Portfolio Project Ideas
7. First 30-Day Action Plan
8. Risk / Difficulty Level
9. Recommended Next Step

Make it practical, realistic, and suitable for Bangladeshi students, freshers, job seekers, and freelancers.
`;
  }

  if (toolType === "career_path") {
    return `
Create a personalized career path for a Bangladesh-focused user.

Name: ${name}
Current Status: ${currentStatus}
Field: ${field}
Skills: ${skills}
Interests: ${interests}
Goal: ${goal}
Target Income: ${targetIncome}
Timeline: ${timeline}
Market Focus: ${marketFocus}
Language: ${language}
Extra Details: ${extraDetails}

Output format:
1. Recommended Career Direction
2. Why This Path Fits
3. Beginner to Advanced Roadmap
4. Job / Freelance Opportunities
5. Portfolio Strategy
6. Learning Priorities
7. Common Mistakes to Avoid
8. 90-Day Career Action Plan
9. Final Recommendation

Make it motivating but realistic.
`;
  }

  if (toolType === "skill_roadmap") {
    return `
Create a skill roadmap for a Bangladesh-focused career growth user.

Name: ${name}
Current Status: ${currentStatus}
Field: ${field}
Current Skills: ${skills}
Interests: ${interests}
Goal: ${goal}
Timeline: ${timeline}
Market Focus: ${marketFocus}
Language: ${language}
Extra Details: ${extraDetails}

Output format:
1. Current Skill Level Assessment
2. Must-Learn Skills
3. High-Income Skills
4. Weekly Learning Roadmap
5. Practice Project Ideas
6. Portfolio Checklist
7. Free / Low-Cost Learning Strategy
8. 30-Day, 60-Day, 90-Day Plan
9. Final Advice

Keep it practical and action-focused.
`;
  }

  if (toolType === "income_roadmap") {
    return `
Create an income roadmap for a Bangladesh-focused user.

Name: ${name}
Current Status: ${currentStatus}
Field: ${field}
Skills: ${skills}
Interests: ${interests}
Goal: ${goal}
Target Income: ${targetIncome}
Timeline: ${timeline}
Market Focus: ${marketFocus}
Language: ${language}
Extra Details: ${extraDetails}

Output format:
1. Realistic Income Path
2. Short-Term Income Sources
3. Freelance Service Ideas
4. Job / Internship Strategy
5. Digital Product / SaaS Ideas
6. Monthly Earning Milestones
7. First Client Strategy
8. 90-Day Income Action Plan
9. Final Recommendation

Make it realistic for Bangladesh, not fake motivational advice.
`;
  }

  return `
Generate a practical career growth report.

Name: ${name}
Field: ${field}
Skills: ${skills}
Goal: ${goal}
`;
};

const buildMockOutput = ({ toolType, form }) => {
  const name = cleanText(form.name, "Harun");
  const currentStatus = cleanText(form.currentStatus, "Student / beginner");
  const field = cleanText(form.field, "MERN Stack Development");
  const skills = cleanText(
    form.skills,
    "React, Node.js, Express.js, MongoDB, Tailwind CSS, JWT, REST API"
  );
  const interests = cleanText(
    form.interests,
    "freelancing, SaaS products, AI tools, dashboards"
  );
  const goal = cleanText(
    form.goal,
    "build a strong career and earn from remote/freelance work"
  );
  const targetIncome = cleanText(form.targetIncome, "৳50,000/month");
  const timeline = cleanText(form.timeline, "6 months");

  if (toolType === "niche_ideas") {
    return `# Niche Ideas Report

## Profile Summary
Name: ${name}  
Current Status: ${currentStatus}  
Field: ${field}  
Skills: ${skills}  
Goal: ${goal}

## Best Niche Ideas

### 1. MERN SaaS Dashboard Development
This is a strong niche because many startups, agencies, and small businesses need dashboards, admin panels, CRM tools, and internal systems.

### 2. AI Tool Frontend Development
AI startups often need clean frontend interfaces for chatbots, document tools, resume builders, and analytics products.

### 3. Ecommerce Admin Panel Development
Bangladesh and global ecommerce businesses need product management, order management, payment tracking, and inventory dashboards.

### 4. Portfolio + Landing Page Development for Freelancers
Students, creators, coaches, and freelancers need modern portfolio websites to build trust.

### 5. Career-Tech Micro SaaS
You can build small tools like resume builders, cover letter tools, job trackers, and skill roadmap generators.

## Bangladesh Market Opportunity
In Bangladesh, many small businesses, coaching centers, agencies, and freelancers need affordable digital tools. A developer who can build polished MERN apps has strong local and global potential.

## Global Freelance Opportunity
On Upwork and Fiverr, you can position yourself as a MERN dashboard and SaaS MVP developer instead of a generic web developer.

## Beginner-Friendly Services
- React landing page
- Dashboard UI redesign
- MERN CRUD app
- Authentication setup
- MongoDB integration
- Admin panel development
- Bug fixing

## Portfolio Project Ideas
- CRM SaaS dashboard
- AI resume builder
- Ecommerce admin panel
- Freelancer proposal generator
- Subscription billing dashboard

## First 30-Day Action Plan
Week 1: Polish your portfolio and choose 1 niche.  
Week 2: Build one strong niche project.  
Week 3: Create Upwork/Fiverr profile and gig.  
Week 4: Send proposals daily and publish project case studies.

## Recommended Next Step
Focus on “MERN SaaS Dashboard Developer” as your first niche. It matches your skills and has both Bangladesh and global demand.`;
  }

  if (toolType === "career_path") {
    return `# Career Path Report

## Recommended Career Direction
Based on your background in ${field}, your best path is:

**MERN Stack Developer → SaaS Dashboard Developer → AI Career-Tech Product Builder**

This direction fits your skills: ${skills}.

## Why This Path Fits
You already have a strong foundation for building real-world SaaS apps. Instead of only learning random technologies, you should focus on building production-style products.

## Beginner to Advanced Roadmap

### Stage 1: Strong Frontend Foundation
- React components
- Tailwind CSS
- Responsive design
- Form handling
- API integration

### Stage 2: Backend Confidence
- Express routes
- MongoDB models
- JWT authentication
- Middleware
- Role-based access

### Stage 3: SaaS Features
- Subscription plans
- Usage limits
- Admin dashboard
- Payment tracking
- Analytics

### Stage 4: AI Integration
- OpenAI API
- Prompt engineering
- AI document generation
- Usage/credit tracking

## Job / Freelance Opportunities
- Junior MERN Developer
- React Developer
- SaaS Dashboard Developer
- Admin Panel Developer
- Freelance MERN Developer
- AI Tool Frontend Developer

## Portfolio Strategy
Build fewer but stronger projects. Each project should include authentication, dashboard, CRUD, payments or AI, and mobile responsiveness.

## 90-Day Career Action Plan
Month 1: Finish 2 portfolio projects.  
Month 2: Create Upwork/Fiverr/LinkedIn presence.  
Month 3: Apply to jobs and send 5-10 proposals daily.

## Final Recommendation
Your strongest positioning is: **Bangladesh-based MERN SaaS Developer building modern dashboards, AI tools, and business platforms.**`;
  }

  if (toolType === "skill_roadmap") {
    return `# Skill Roadmap Report

## Current Skill Level Assessment
You are currently focused on ${field}. Your current skills include:

${skills}

This is a good foundation, but to become more market-ready, you need deeper project experience and stronger product thinking.

## Must-Learn Skills
- Advanced React patterns
- React Router protected routes
- API integration with Axios
- Express middleware
- MongoDB schema design
- JWT authentication
- Role-based dashboard
- Payment workflow
- Deployment and environment variables

## High-Income Skills
- SaaS architecture
- AI API integration
- Dashboard analytics
- Payment gateway integration
- Performance optimization
- Client communication
- Product UI/UX thinking

## Weekly Learning Roadmap

### Week 1
Improve React component structure and responsive UI.

### Week 2
Practice backend CRUD, auth, and middleware.

### Week 3
Build one dashboard with analytics cards and charts.

### Week 4
Add AI generation, credits, and history tracking.

### Week 5
Add payment/subscription logic.

### Week 6
Deploy and write a case study.

## Practice Project Ideas
- AI Resume Builder
- Freelancer Toolkit
- Subscription Dashboard
- Job Application Tracker
- Admin Analytics Panel

## 30/60/90-Day Plan
30 Days: Build and polish one SaaS project.  
60 Days: Add AI, payment, and admin features.  
90 Days: Start applying for jobs and freelance work.

## Final Advice
Do not learn endlessly. Build production-style features and show them clearly in your portfolio.`;
  }

  if (toolType === "income_roadmap") {
    return `# Income Roadmap Report

## Target Income
Your target income: ${targetIncome}  
Timeline: ${timeline}

## Realistic Income Path
Your best earning path is a combination of freelance services, portfolio-based job applications, and small SaaS experiments.

## Short-Term Income Sources
- Landing page development
- Dashboard UI development
- MERN bug fixing
- Authentication setup
- MongoDB integration
- Admin panel development

## Freelance Service Ideas
1. I will build a modern React landing page.
2. I will create a MERN stack dashboard.
3. I will fix React/Node/MongoDB bugs.
4. I will build admin panels for small businesses.
5. I will integrate JWT authentication in your app.

## Monthly Earning Milestones

### Month 1
Goal: Build portfolio and send proposals.  
Possible income: ৳0 - ৳10,000

### Month 2
Goal: Get small local or Fiverr/Upwork work.  
Possible income: ৳10,000 - ৳30,000

### Month 3
Goal: Close better projects and improve profile.  
Possible income: ৳30,000 - ৳60,000

### Month 4-6
Goal: Build repeat clients and stronger offers.  
Possible income: ৳60,000+

## First Client Strategy
Start with small, specific services. Do not say “I can build any website.” Say “I build modern MERN dashboards for startups and small businesses.”

## 90-Day Income Action Plan
Day 1-15: Polish portfolio.  
Day 16-30: Create Fiverr gigs and Upwork profile.  
Day 31-60: Send proposals daily.  
Day 61-90: Improve offers based on client responses.

## Final Recommendation
Focus on one sellable offer first: **MERN SaaS Dashboard / Admin Panel Development**.`;
  }

  return `# Career Growth Report

Field: ${field}  
Skills: ${skills}  
Interests: ${interests}

Recommended next step: build a focused roadmap and take action for 30 days.`;
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
              "You are CareerPilot AI, a Bangladesh-focused AI Career Operating System. Generate realistic, practical, career-growth, freelancing, skill, and income roadmaps for Bangladeshi students, freshers, job seekers, and freelancers.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.75,
        max_tokens: 1600,
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

export const generateIdeaReport = async (req, res) => {
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
        message: "Invalid Idea Radar tool selected.",
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
    const mockContent = buildMockOutput({ toolType, form });

    const finalContent = aiResult.content || mockContent;
    const source = aiResult.content ? aiResult.source : "mock";

    user.aiCredits = Math.max(0, currentCredits - creditsRequired);
    await user.save();

    const field = cleanText(form.field, "Career Growth");

    const document = await GeneratedDocument.create({
      user: user._id,
      type: "idea_report",
      title: `${config.title} - ${field}`,
      language: cleanText(form.language, "English"),
      tone: "Strategic",
      source,
      input: {
        ...form,
        toolType,
        toolLabel: config.label,
        creditsUsed: creditsRequired,
      },
      output: {
        content: finalContent,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Idea Radar report generated successfully.",
      data: {
        document,
        remainingCredits: user.aiCredits,
        creditsUsed: creditsRequired,
        source,
      },
    });
  } catch (error) {
    console.error("Generate idea report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate Idea Radar report.",
    });
  }
};

export const getIdeaHistory = async (req, res) => {
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
      type: "idea_report",
    })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("Get idea history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load Idea Radar history.",
    });
  }
};

export const getSingleIdeaReport = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const document = await GeneratedDocument.findOne({
      _id: id,
      user: userId,
      type: "idea_report",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("Get idea report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load report.",
    });
  }
};

export const deleteIdeaReport = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const document = await GeneratedDocument.findOneAndDelete({
      _id: id,
      user: userId,
      type: "idea_report",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report deleted successfully.",
    });
  } catch (error) {
    console.error("Delete idea report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete report.",
    });
  }
};