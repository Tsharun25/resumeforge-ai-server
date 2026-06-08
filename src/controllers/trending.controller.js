import OpenAI from "openai";
import GeneratedDocument from "../models/GeneratedDocument.js";
import User from "../models/User.js";

const CREDIT_COST = 2;

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

const cleanText = (value, fallback = "") => {
  if (!value) return fallback;
  return String(value).trim();
};

const checkAndConsumeCredits = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (Number(user.aiCredits || 0) < CREDIT_COST) {
    const error = new Error(
      "You do not have enough AI credits. Please upgrade your plan."
    );
    error.statusCode = 403;
    throw error;
  }

  user.aiCredits = Math.max(0, Number(user.aiCredits || 0) - CREDIT_COST);
  await user.save();

  return user;
};

const getLanguageInstruction = (language) => {
  if (language === "Bangla") {
    return "Write in natural Bangla. Keep creator, platform, and technical terms understandable for Bangladeshi users.";
  }

  if (language === "Bangla + English") {
    return "Write in a Bangla-English mixed style that feels natural for Bangladeshi creators.";
  }

  return "Write in clear, practical, creator-friendly English.";
};

const buildMockTrendingAdvice = (form) => {
  const platform = cleanText(form.platform, "Facebook Reels");
  const niche = cleanText(form.niche, "AI tools");
  const audience = cleanText(form.audience, "Bangladeshi young audience");
  const goal = cleanText(form.goal, "views and followers");
  const creatorLevel = cleanText(form.creatorLevel, "Beginner");
  const contentStyle = cleanText(form.contentStyle, "Educational and practical");
  const market = cleanText(form.market, "Bangladesh");
  const language = cleanText(form.language, "Bangla");

  if (language === "Bangla") {
    return {
      content: `# ট্রেন্ডিং পরামর্শ রিপোর্ট

## Creator Snapshot
Platform: ${platform}
Niche: ${niche}
Target Audience: ${audience}
Creator Level: ${creatorLevel}
Main Goal: ${goal}
Market: ${market}
Content Style: ${contentStyle}

## সেরা কনটেন্ট অ্যাঙ্গেল
প্রথম ৩ সেকেন্ডে একটি নির্দিষ্ট সমস্যার কথা বলুন এবং পরে একটিমাত্র clear takeaway দিন। ${niche} niche-এর জন্য সবচেয়ে শক্তিশালী angle হলো ${audience}-এর জন্য practical, relatable, এবং দ্রুত কাজে লাগানো যায় এমন advice.

## Viral Hook
"আপনার ${platform} content views পাচ্ছে না? আগে এই ৩টা জিনিস ঠিক করুন।"

Alternative hooks:
1. "${niche} content beginner-রা সবচেয়ে বেশি এই ভুল করে।"
2. "আজ থেকে ${platform}-এ grow করতে হলে আমি এটা করতাম।"
3. "এটা save করুন, কারণ এই tip-টা growth-এর জন্য দরকার।"

## 30-60 Second Script
Opening:
"আপনার content ভালো হলেও hook, structure, বা CTA weak হলে views কম আসবে।"

Main:
"প্রথমে audience-এর pain point ধরুন। দ্বিতীয়ত, এক ভিডিওতে একটিই idea রাখুন। তৃতীয়ত, শেষে simple action দিন: comment, save, বা follow."

Closing:
"আপনার niche comment করুন, আমি একটি content idea দিয়ে দেব।"

## Caption
ট্রেন্ড helpful, কিন্তু useful content দ্রুত grow করে যখন সেটা real audience problem solve করে। একটিমাত্র problem দিয়ে শুরু করুন, useful answer দিন, আর next action clear রাখুন।

## Hashtags
#ContentCreator #${niche.replace(/\s+/g, "")} #ReelsGrowth #TikTokGrowth #CreatorTips #CareerPilotAI

## Posting Advice
৭ দিন ধরে ২টি posting window test করুন। Bangladesh audience হলে রাত ৭টা থেকে ১০টার মধ্যে শুরু করুন। শুধু views না, watch time, saves, comments, আর shares track করুন।

## Monetization Angle
এই niche-এ affiliate marketing, digital products, client services, sponsorships, templates, mini courses, বা paid consultation দিয়ে monetization করা যায়।

## 7-Day Content Series
Day 1: Common mistakes
Day 2: Beginner tips
Day 3: Free tools
Day 4: Content idea list
Day 5: Case study
Day 6: Do this, not that
Day 7: Step-by-step tutorial

## Common Mistakes To Avoid
- Strong hook ছাড়া শুরু করা
- এক ভিডিওতে অনেক idea ঢোকানো
- trend copy করে niche-এর সাথে না মেলানো
- random posting without tracking
- trust তৈরি হওয়ার আগে বেশি sell করা

## Final Action Plan
উপরের hooks ব্যবহার করে ৫টি video record করুন। ৭ দিনে publish করুন, best topic track করুন, তারপর সেই winning angle ঘিরে ৩টি নতুন video বানান।`.trim(),
    };
  }

  if (language === "Bangla + English") {
    return {
      content: `# Trending Advice Report

## Creator Snapshot
Platform: ${platform}
Niche: ${niche}
Target Audience: ${audience}
Creator Level: ${creatorLevel}
Main Goal: ${goal}
Market: ${market}
Content Style: ${contentStyle}

## Best Content Angle
Create short-form videos that solve one specific audience problem in the first 3 seconds and give one clear takeaway. For the ${niche} niche, your strongest angle is practical, fast, and relatable advice for ${audience}.

## Viral Hook
"If your ${platform} content is not getting views, fix these 3 things first."

Alternative hooks:
1. "Most beginners in ${niche} make this mistake."
2. "If I started ${niche} content today, I would do this."
3. "Save this if you want to grow on ${platform}."

## 30-60 Second Script
Opening:
"Your content may be good, but if your views are low, your hook, structure, or CTA may be weak."

Main:
"First, open with a clear pain point. Second, keep one idea per video. Third, end with a simple action like: comment your niche, save this, or follow for part two."

Closing:
"Comment your niche and I will share one content idea for it."

## Caption
Trends help, but useful content grows faster when it solves a real audience problem. Start with one pain point, give one useful answer, and make the next action clear.

## Hashtags
#ContentCreator #${niche.replace(/\s+/g, "")} #ReelsGrowth #TikTokGrowth #CreatorTips #CareerPilotAI

## Posting Advice
Test 2 posting windows for 7 days. For a Bangladesh-focused audience, start with evening slots between 7 PM and 10 PM. Track watch time, saves, comments, and shares instead of only views.

## Monetization Angle
This niche can be monetized through affiliate marketing, digital products, client services, sponsorships, templates, mini courses, or paid consultation.

## 7-Day Content Series
Day 1: Common mistakes
Day 2: Beginner tips
Day 3: Free tools
Day 4: Content idea list
Day 5: Case study
Day 6: Do this, not that
Day 7: Step-by-step tutorial

## Common Mistakes To Avoid
- Starting without a strong hook
- Trying to explain too many ideas in one video
- Copying trends without connecting them to your niche
- Posting randomly without tracking results
- Selling too early before building trust

## Final Action Plan
Record 5 videos using the hooks above. Publish them over 7 days, track the best-performing topic, then create 3 more videos around that winning angle.`.trim(),
    };
  }

  return {
    content: `# Trending Advice Report

## Creator Snapshot
Platform: ${platform}
Niche: ${niche}
Target Audience: ${audience}
Creator Level: ${creatorLevel}
Main Goal: ${goal}
Market: ${market}
Content Style: ${contentStyle}

## Best Content Angle
Create short-form videos that solve one specific audience problem in the first 3 seconds and give one clear takeaway. For the ${niche} niche, your strongest angle is practical, fast, and relatable advice for ${audience}.

## Viral Hook
"If your ${platform} content is not getting views, fix these 3 things first."

Alternative hooks:
1. "Most beginners in ${niche} make this mistake."
2. "If I started ${niche} content today, I would do this."
3. "Save this if you want to grow on ${platform}."

## 30-60 Second Script
Opening:
"Your content may be good, but if your views are low, your hook, structure, or CTA may be weak."

Main:
"First, open with a clear pain point. Second, keep one idea per video. Third, end with a simple action like: comment your niche, save this, or follow for part two."

Closing:
"Comment your niche and I will share one content idea for it."

## Caption
Trends help, but useful content grows faster when it solves a real audience problem. Start with one pain point, give one useful answer, and make the next action clear.

## Hashtags
#ContentCreator #${niche.replace(/\s+/g, "")} #ReelsGrowth #TikTokGrowth #CreatorTips #CareerPilotAI

## Posting Advice
Test 2 posting windows for 7 days. For a Bangladesh-focused audience, start with evening slots between 7 PM and 10 PM. Track watch time, saves, comments, and shares instead of only views.

## Monetization Angle
This niche can be monetized through affiliate marketing, digital products, client services, sponsorships, templates, mini courses, or paid consultation.

## 7-Day Content Series
Day 1: Common mistakes
Day 2: Beginner tips
Day 3: Free tools
Day 4: Content idea list
Day 5: Case study
Day 6: Do this, not that
Day 7: Step-by-step tutorial

## Common Mistakes To Avoid
- Starting without a strong hook
- Trying to explain too many ideas in one video
- Copying trends without connecting them to your niche
- Posting randomly without tracking results
- Selling too early before building trust

## Final Action Plan
Record 5 videos using the hooks above. Publish them over 7 days, track the best-performing topic, then create 3 more videos around that winning angle.`.trim(),
  };
};
export const generateTrendingAdvice = async (req, res) => {
  try {
    const { form = {} } = req.body;

    if (!form.platform || !form.niche || !form.audience || !form.goal) {
      return res.status(400).json({
        success: false,
        message: "Platform, niche, audience, and goal are required.",
      });
    }

    const user = await checkAndConsumeCredits(req.user._id);
    const openai = getOpenAIClient();

    let output;
    let source = "mock";

    if (!openai) {
      output = buildMockTrendingAdvice(form);
    } else {
      try {
        const prompt = `
You are CareerPilot AI, an expert short-form content strategist for TikTok, Facebook Reels, Instagram Reels, and YouTube Shorts.

Create a practical trending advice report for a creator.

User input:
Platform: ${form.platform}
Niche: ${form.niche}
Target Audience: ${form.audience}
Creator Level: ${form.creatorLevel || "Beginner"}
Main Goal: ${form.goal}
Country/Market: ${form.market || "Bangladesh and global audience"}
Content Style: ${form.contentStyle || "Educational and practical"}
Language: ${form.language || "English"}
Extra Details: ${form.extraDetails || "N/A"}

Language instruction:
${getLanguageInstruction(form.language)}

Return ONLY valid JSON:
{
  "content": "A complete formatted report using markdown-style headings but no code block."
}

The report must include:
1. Best content angle
2. Viral hook
3. 30-60 second script
4. Caption
5. Hashtags
6. Posting advice
7. Monetization angle
8. 7-day content series
9. Common mistakes to avoid
10. A final practical action plan

Rules:
- Make it practical, realistic, and income-focused.
- Do not claim access to live TikTok/Facebook/YouTube trend data.
- Use trend-style advice based on niche, audience, and creator behavior.
- Keep it useful for Bangladeshi creators.
- If Language is Bangla, write the entire report in natural Bangla script except for product names and platform names when necessary.
- If Language is Bangla + English, use a natural mixed Bangla-English style, not full English.
- Do not include text outside JSON.
`;

        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          messages: [
          {
            role: "system",
            content:
              "You are a practical creator growth strategist. Always return valid JSON only. Match the requested language exactly.",
          },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.75,
        });

        const rawContent = completion.choices[0]?.message?.content;

        if (!rawContent) {
          throw new Error("AI did not return any content.");
        }

        output = JSON.parse(rawContent);
        source = "openai";
      } catch (aiError) {
        console.error("Trending Advice OpenAI fallback:", aiError.message);
        output = buildMockTrendingAdvice(form);
        source = "mock";
      }
    }

    const document = await GeneratedDocument.create({
      user: req.user._id,
      type: "trending_advice",
      title: `${form.platform} - ${form.niche} Trending Advice`,
      language: form.language || "English",
      tone: "Creator Friendly",
      source,
      input: {
        ...form,
        creditsUsed: CREDIT_COST,
      },
      output,
    });

    return res.status(200).json({
      success: true,
      message: "Trending advice generated successfully.",
      data: {
        document,
        remainingCredits: user.aiCredits,
      },
    });
  } catch (error) {
    console.error("Trending advice generation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to generate trending advice.",
    });
  }
};

export const getTrendingAdviceHistory = async (req, res) => {
  try {
    const documents = await GeneratedDocument.find({
      user: req.user._id,
      type: "trending_advice",
    })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("Trending advice history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load trending advice history.",
    });
  }
};

export const deleteTrendingAdvice = async (req, res) => {
  try {
    const document = await GeneratedDocument.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
      type: "trending_advice",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Trending advice not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trending advice deleted successfully.",
    });
  } catch (error) {
    console.error("Trending advice delete error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete trending advice.",
    });
  }
};
