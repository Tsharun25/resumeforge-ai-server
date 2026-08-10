import GeneratedDocument from "../models/GeneratedDocument.js";
import { reserveCredits, refundCredits } from "../services/credit.service.js";
import { generateWebGroundedStructuredOutput } from "../services/openai.service.js";
import {
  buildProviderSources,
  collectTrendData,
} from "../services/trend-data.service.js";

const CREDIT_COST = 3;

const trendReportSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "trendStatus",
    "confidence",
    "signalInterpretation",
    "content",
    "limitations",
  ],
  properties: {
    summary: { type: "string" },
    trendStatus: {
      type: "string",
      enum: ["rising", "peaking", "stable", "declining", "insufficient_data"],
    },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    signalInterpretation: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "direction", "evidence"],
        properties: {
          title: { type: "string" },
          direction: {
            type: "string",
            enum: ["rising", "peaking", "stable", "declining", "early_signal", "unclear"],
          },
          evidence: { type: "string" },
        },
      },
    },
    content: { type: "string" },
    limitations: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
  },
};

const getLanguageInstruction = (language) => {
  if (language === "Bangla") {
    return "Write every narrative section in natural Bengali script. Keep platform and product names in their standard form when useful.";
  }
  if (language === "Bangla + English") {
    return "Write in a natural Bengali-English mixed style for Bangladeshi creators.";
  }
  return "Write in clear, practical English.";
};

const deduplicateSources = (sources) => {
  const unique = new Map();
  for (const source of sources) {
    if (source?.url && !unique.has(source.url)) unique.set(source.url, source);
  }
  return [...unique.values()].slice(0, 20);
};

export const generateTrendingAdvice = async (req, res) => {
  let creditsReserved = false;

  try {
    const { form = {} } = req.body;

    if (!form.platform || !form.niche || !form.audience || !form.goal) {
      return res.status(400).json({
        success: false,
        message: "Platform, niche, audience, and goal are required.",
      });
    }

    const liveData = await collectTrendData(form);
    const user = await reserveCredits(req.user._id, CREDIT_COST);
    creditsReserved = true;

    const generated = await generateWebGroundedStructuredOutput({
      userId: req.user._id,
      schemaName: "careerpilot_live_trend_report",
      schema: trendReportSchema,
      country: liveData.market.country,
      timezone: liveData.market.timezone,
      instructions: `You are CareerPilot AI's evidence-first live trend analyst for creators.

Search the live web for recent, relevant evidence about the requested niche, platform, audience, and market. Prefer primary platform pages, current videos, reputable news, and sources published in the last 30 days. Cross-check important claims. Never invent a trend, statistic, source, date, or URL.

The supplied Google Trends RSS data represents searches currently experiencing a recent surge; it is not a historical time-series. YouTube views-per-hour is a server-calculated velocity signal, not an official YouTube trend label. Distinguish measured facts from inference. If evidence is weak or conflicting, use insufficient_data or unclear and explain the limitation.

${getLanguageInstruction(form.language)}

The content field must be a complete creator-ready report with markdown-style headings (no code fence) containing: live trend verdict, evidence summary, 3 evidence-based content angles, 5 hooks, a 30–60 second script, caption, hashtags, posting/test plan, monetization angle, a 7-day content plan, and what to measure next. Refer to evidence by source/publisher name; do not place unsupported URLs in the prose.`,
      input: `Current server time: ${liveData.observedAt}

Creator request:
${JSON.stringify(form, null, 2)}

Google Trends live RSS snapshot:
${JSON.stringify(liveData.google, null, 2)}

YouTube Data API snapshot:
${JSON.stringify(liveData.youtube, null, 2)}

Use the live web search tool now to find additional current web/news/platform evidence before producing the report.`,
    });

    const providerSources = buildProviderSources(liveData);
    const sources = deduplicateSources([...providerSources, ...generated.sources]);
    const output = {
      ...generated.data,
      asOf: liveData.observedAt,
      dataMode: "live_grounded",
      sources,
      coverage: {
        googleTrends: {
          available: liveData.google.available,
          updatedAt: liveData.google.updatedAt,
          signalCount: liveData.google.items.length,
          note: liveData.google.reason || "Google Trending now RSS checked.",
        },
        youtube: {
          available: liveData.youtube.available,
          updatedAt: liveData.youtube.updatedAt,
          signalCount: liveData.youtube.items.length,
          note: liveData.youtube.reason || "YouTube Data API checked.",
        },
        web: {
          available: generated.sources.length > 0,
          updatedAt: liveData.observedAt,
          signalCount: generated.sources.length,
          note: "OpenAI live web search checked.",
        },
      },
    };

    const document = await GeneratedDocument.create({
      user: req.user._id,
      type: "trending_advice",
      title: `${form.platform} - ${form.niche} Live Trend Radar`,
      language: form.language || "English",
      tone: "Evidence First",
      source: generated.provider || generated.data.__provider || "openai",
      input: { ...form, creditsUsed: CREDIT_COST },
      output,
    });

    creditsReserved = false;

    return res.status(200).json({
      success: true,
      message: "Live trend report generated successfully.",
      data: { document, remainingCredits: user.aiCredits },
    });
  } catch (error) {
    if (creditsReserved) {
      try {
        await refundCredits(req.user._id, CREDIT_COST);
      } catch (refundError) {
        console.error("Live trend credit refund error:", refundError);
      }
    }

    console.error("Live trend generation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode === 403
          ? error.message
          : "Live trend sources could not be verified. No AI credits were charged.",
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

    return res.status(200).json({ success: true, data: documents });
  } catch (error) {
    console.error("Live trend history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load live trend history.",
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
      return res.status(404).json({ success: false, message: "Trend report not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Trend report deleted successfully.",
    });
  } catch (error) {
    console.error("Live trend delete error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete trend report." });
  }
};
