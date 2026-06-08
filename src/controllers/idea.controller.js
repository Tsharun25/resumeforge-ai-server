import User from "../models/User.js";
import GeneratedDocument from "../models/GeneratedDocument.js";
import { applyPlanToUser } from "../config/plans.js";

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

const getLanguageInstruction = (language) => {
  if (language === "Bangla") {
    return "Output must be fully in natural Bangla. Use practical Bangladeshi examples. Avoid unnecessary English unless technical terms are needed.";
  }

  if (language === "Bangla + English") {
    return "Output must be in Bangla-English mixed style suitable for Bangladeshi students, freelancers, and creators.";
  }

  return "Output must be in clear, practical English.";
};

const getMarketInstruction = (marketFocus) => {
  if (marketFocus === "Bangladesh") {
    return "Focus strongly on Bangladesh market, local audience, local income reality, bKash/Nagad/payment limitations, local clients, Facebook groups, TikTok/Reels culture, and beginner-friendly execution.";
  }

  if (marketFocus === "Global") {
    return "Focus on global remote market, Upwork, Fiverr, LinkedIn, international clients, global content trends, and scalable digital income.";
  }

  return "Balance Bangladesh market and global remote opportunities.";
};

const checkAndDowngradeExpiredPlan = async (user) => {
  if (!user) return user;

  if (user.plan !== "free" && user.planExpiresAt) {
    const now = new Date();
    const expiry = new Date(user.planExpiresAt);

    if (expiry < now) {
      applyPlanToUser(user, "free");
      user.planExpiresAt = null;
      await user.save();
    }
  }

  return user;
};

const buildPrompt = ({ toolType, form }) => {
  const name = cleanText(form.name, "CareerPilot User");
  const currentStatus = cleanText(form.currentStatus, "Student / beginner");
  const field = cleanText(form.field, "Digital career / online income");
  const skills = cleanText(form.skills, "basic computer, communication, learning mindset");
  const interests = cleanText(form.interests, "freelancing, content creation, AI tools, online income");
  const goal = cleanText(form.goal, "start earning online and build a strong future career");
  const targetIncome = cleanText(form.targetIncome, "BDT 30,000 - BDT 100,000/month");
  const timeline = cleanText(form.timeline, "6 months");
  const language = cleanText(form.language, "Bangla");
  const marketFocus = cleanText(form.marketFocus, "Bangladesh");
  const budget = cleanText(form.budget, "Low budget");
  const skillLevel = cleanText(form.skillLevel, "Beginner");
  const extraDetails = cleanText(form.extraDetails, "No extra details.");

  const baseContext = `
You are CareerPilot AI, a Bangladesh-aware career, freelancing, online income, and creator growth strategist.

User Profile:
Name: ${name}
Current Status: ${currentStatus}
Field: ${field}
Skills: ${skills}
Interests: ${interests}
Goal: ${goal}
Target Income: ${targetIncome}
Timeline: ${timeline}
Budget: ${budget}
Skill Level: ${skillLevel}
Market Focus: ${marketFocus}
Language: ${language}
Extra Details: ${extraDetails}

Language Rule:
${getLanguageInstruction(language)}

Market Rule:
${getMarketInstruction(marketFocus)}

Important Rules:
- Be realistic, not fake motivational.
- Give practical earning paths.
- Include Bangladesh context when relevant.
- Make advice useful for students, freshers, freelancers, and content creators.
- Mention content creation opportunities if the user's interest includes Reels, TikTok, YouTube Shorts, Facebook, social media, creator, or content.
- Do not claim live trend access.
- Write in a clean markdown format.
`;

  if (toolType === "niche_ideas") {
    return `
${baseContext}

Generate profitable niche ideas.

Output format:
# Niche Ideas Report

## Profile Summary
## Best Niche Ideas
Give 7 niche ideas. For each niche include:
- Why it fits
- Bangladesh opportunity
- Global opportunity
- First service/product/content idea
- Difficulty level
- Income potential

## Best Content Creator Niches
Suggest short-form content niches for Facebook Reels, TikTok, YouTube Shorts, and Instagram Reels.

## Beginner-Friendly Services
## Portfolio / Proof-of-Work Ideas
## Monetization Paths
Include freelancing, digital products, affiliate, coaching, templates, sponsorship, and local services where relevant.

## First 30-Day Action Plan
## First 90-Day Growth Plan
## Final Recommended Niche
`;
  }

  if (toolType === "career_path") {
    return `
${baseContext}

Create a personalized career path.

Output format:
# Career Path Report

## Recommended Career Direction
## Why This Path Fits
## Bangladesh Career Opportunity
## Global Remote Opportunity
## Beginner to Advanced Roadmap
## Freelance / Job / Creator Income Options
## Portfolio Strategy
## Learning Priorities
## Common Mistakes to Avoid
## 90-Day Career Action Plan
## Final Recommendation
`;
  }

  if (toolType === "skill_roadmap") {
    return `
${baseContext}

Create a practical skill roadmap.

Output format:
# Skill Roadmap Report

## Current Skill Level Assessment
## Must-Learn Skills
## High-Income Skills
## Bangladesh-Friendly Learning Strategy
## Weekly Learning Roadmap
## Practice Project Ideas
## Portfolio Checklist
## Free / Low-Cost Resource Strategy
## 30-Day Plan
## 60-Day Plan
## 90-Day Plan
## Final Advice
`;
  }

  if (toolType === "income_roadmap") {
    return `
${baseContext}

Create a realistic income roadmap.

Output format:
# Income Roadmap Report

## Realistic Income Path
## Short-Term Income Sources
## Freelance Service Ideas
## Content Creation Income Ideas
## Local Bangladesh Income Ideas
## Global Income Ideas
## Monthly Earning Milestones
## First Client Strategy
## Monetization Plan
## 90-Day Income Action Plan
## Final Recommendation
`;
  }

  return `
${baseContext}

Generate a practical career growth report.
`;
};

const buildMockOutput = ({ toolType, form }) => {
  const name = cleanText(form.name, "বন্ধু");
  const field = cleanText(form.field, "Online Income / Digital Career");
  const skills = cleanText(form.skills, "basic computer, communication, learning mindset");
  const goal = cleanText(form.goal, "online income শুরু করা");
  const targetIncome = cleanText(form.targetIncome, "৳৩০,০০০ - ৳১,০০,০০০/মাস");
  const timeline = cleanText(form.timeline, "৬ মাস");
  const language = cleanText(form.language, "Bangla");
  const marketFocus = cleanText(form.marketFocus, "Bangladesh");

  if (language === "English") {
    return `# Idea Radar Report

## Profile Summary
Name: ${name}
Field: ${field}
Skills: ${skills}
Goal: ${goal}
Target Income: ${targetIncome}
Timeline: ${timeline}
Market Focus: ${marketFocus}

## Best Direction
Your best direction is to combine practical digital skills with a clear income path. Start with one specific offer, build proof, then expand into freelancing, content, or digital products.

## Bangladesh Opportunity
Bangladesh has strong demand for affordable digital services, Facebook/Reels content, small business websites, AI tool support, social media management, and freelancing support.

## Global Opportunity
You can target global clients through Upwork, Fiverr, LinkedIn, and niche portfolio content.

## Recommended Ideas
1. Short-form content strategy service
2. AI tool tutorial content
3. Freelance profile optimization
4. Small business landing pages
5. Resume/CV and LinkedIn improvement service
6. Social media content calendar service
7. Digital template products

## 30-Day Action Plan
Week 1: Pick one niche and study 20 successful examples.
Week 2: Build 3 sample works.
Week 3: Publish content and create portfolio.
Week 4: Start outreach and proposal sending.

## Final Advice
Do not try everything. Pick one clear niche and execute for 90 days.`;
  }

  if (language === "Bangla + English") {
    return `# Idea Radar Report

## Profile Summary
Name: ${name}
Field: ${field}
Skills: ${skills}
Goal: ${goal}
Target Income: ${targetIncome}
Timeline: ${timeline}
Market Focus: ${marketFocus}

## Best Direction
তোমার জন্য best direction হলো practical digital skill + clear income offer combine করা। একসাথে অনেক কিছু না করে first 90 days একটা niche ধরে কাজ করা উচিত।

## Bangladesh Opportunity
Bangladesh market-এ Facebook page, Reels/TikTok content, small business website, CV/LinkedIn service, social media management, AI tools tutorial—এই ধরনের service-এর ভালো demand আছে।

## Global Opportunity
Global market-এর জন্য Upwork, Fiverr, LinkedIn এবং portfolio content ব্যবহার করা যায়।

## Recommended Ideas
1. Reels/TikTok content idea service
2. AI tools tutorial content
3. Freelance profile optimization
4. Small business landing page
5. Resume/CV improvement service
6. Social media content calendar
7. Digital templates

## 30-Day Action Plan
Week 1: একটা niche select করো।
Week 2: ৩টা demo/sample বানাও।
Week 3: Facebook/LinkedIn-এ publish করো।
Week 4: client outreach শুরু করো।

## Final Advice
Random motivation না, daily execution দরকার। One niche, one offer, 90 days.`;
  }

  return `# আইডিয়া রাডার রিপোর্ট

## প্রোফাইল সারাংশ
নাম: ${name}
ক্ষেত্র: ${field}
স্কিল: ${skills}
লক্ষ্য: ${goal}
টার্গেট ইনকাম: ${targetIncome}
সময়: ${timeline}
মার্কেট: ${marketFocus}

## আপনার জন্য সেরা দিক
আপনার জন্য সবচেয়ে ভালো পথ হলো এমন একটি niche বেছে নেওয়া যেখানে কম বাজেটে শুরু করা যায়, দ্রুত proof তৈরি করা যায় এবং freelancing/content/digital product দিয়ে income করা যায়।

## বাংলাদেশ মার্কেট সুযোগ
বাংলাদেশে এখন Facebook page, Reels/TikTok content, small business website, CV/Resume service, AI tools tutorial, social media management এবং online course/template—এসবের চাহিদা বাড়ছে।

## Global Opportunity
আপনি চাইলে একই skill দিয়ে Upwork, Fiverr, LinkedIn এবং portfolio website-এর মাধ্যমে global client ধরতে পারবেন।

## Recommended Ideas
### ১. Reels/TikTok Content Idea Service
যারা content creator, তাদের জন্য script, caption, hook এবং hashtag তৈরি করার service দিতে পারেন।

### ২. AI Tools Tutorial Content
বাংলায় AI tools নিয়ে short video বানালে student, freelancer এবং job seeker audience পাওয়া সম্ভব।

### ৩. CV/Resume + LinkedIn Optimization
বাংলাদেশের job seeker ও fresher-দের জন্য এটা practical service হতে পারে।

### ৪. Small Business Landing Page
Local business, coaching center, online shop-এর জন্য website/landing page বানানো যায়।

### ৫. Social Media Content Calendar
Small business বা creator-দের জন্য ৩০ দিনের content plan বানিয়ে paid service দেওয়া যায়।

## Monetization Paths
- Freelance service
- Digital template
- Affiliate marketing
- Paid consultation
- Sponsorship
- Mini course
- Local client service

## ৩০ দিনের Action Plan
Week 1: একটি niche select করুন এবং ২০টি successful example দেখুন।  
Week 2: ৩টি sample work তৈরি করুন।  
Week 3: Facebook, LinkedIn অথবা portfolio-তে publish করুন।  
Week 4: প্রতিদিন ১০ জন potential client-কে message/proposal পাঠান।

## ৯০ দিনের Growth Plan
প্রথম ৩০ দিন proof তৈরি করুন।  
পরের ৩০ দিন client outreach করুন।  
শেষ ৩০ দিন pricing, portfolio এবং offer improve করুন।

## Final Recommendation
শুরুতে একটি clear offer নিন: “আমি creator/business-এর জন্য Reels/TikTok content idea, script, caption এবং hashtag তৈরি করি।”  
এটা Bangladesh market-এর জন্য practical এবং future income source হিসেবে ভালো।`;
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
              "You are CareerPilot AI, a Bangladesh-aware career, freelancing, online income, and creator growth strategist.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.75,
        max_tokens: 1800,
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
      language: cleanText(form.language, "Bangla"),
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
