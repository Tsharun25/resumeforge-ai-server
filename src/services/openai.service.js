import crypto from "crypto";
import OpenAI from "openai";

let openaiClient;

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openaiClient;
};

const getSafetyIdentifier = (userId) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(String(userId))
    .digest("hex");

const getProviderOrder = () => {
  const preferred = String(process.env.AI_PROVIDER || "auto").toLowerCase();
  if (preferred === "gemini") return ["gemini", "openai"];
  return ["openai", "gemini"];
};

const isProviderConfigured = (provider) =>
  provider === "openai"
    ? Boolean(process.env.OPENAI_API_KEY)
    : Boolean(process.env.GEMINI_API_KEY);

const tagProvider = (data, provider) => {
  Object.defineProperty(data, "__provider", {
    value: provider,
    enumerable: false,
  });
  return data;
};

const parseJsonText = (text) => {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  if (!cleaned) {
    const error = new Error("AI did not return a usable result.");
    error.statusCode = 502;
    throw error;
  }

  return JSON.parse(cleaned);
};

const callGemini = async ({ instructions, input, schema }) => {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: instructions }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: input }],
          },
        ],
        generationConfig: {
          ...(schema
            ? {
                responseMimeType: "application/json",
                responseJsonSchema: schema,
              }
            : {}),
          maxOutputTokens: 4096,
          temperature: 0.55,
        },
      }),
      signal: AbortSignal.timeout(90000),
    }
  );

  const body = await response.json();

  if (!response.ok) {
    const error = new Error("Gemini AI request failed.");
    error.statusCode = response.status === 429 ? 429 : 502;
    error.providerCode = body?.error?.status;
    throw error;
  }

  const text = (body?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || "")
    .join("")
    .trim();

  if (!text) {
    const error = new Error("Gemini AI returned an empty result.");
    error.statusCode = 502;
    throw error;
  }

  return text;
};

const runWithProviderFallback = async (handlers) => {
  let lastError;

  for (const provider of getProviderOrder()) {
    if (!isProviderConfigured(provider) || !handlers[provider]) continue;

    try {
      return await handlers[provider]();
    } catch (error) {
      lastError = error;
      console.warn(
        `${provider} generation unavailable (${error.statusCode || error.status || 500}).`
      );
    }
  }

  if (lastError) throw lastError;

  const error = new Error(
    "AI service is not configured. Add an OpenAI or Gemini API key."
  );
  error.statusCode = 503;
  throw error;
};

export const generateStructuredOutput = async ({
  userId,
  schemaName,
  schema,
  instructions,
  input,
}) =>
  runWithProviderFallback({
    openai: async () => {
      const response = await getOpenAIClient().responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
        instructions,
        input,
        safety_identifier: getSafetyIdentifier(userId),
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema,
          },
        },
      });

      return tagProvider(parseJsonText(response.output_text), "openai");
    },
    gemini: async () =>
      tagProvider(
        parseJsonText(await callGemini({ instructions, input, schema })),
        "gemini"
      ),
  });

export const generateTextOutput = async ({ userId, instructions, input }) =>
  runWithProviderFallback({
    openai: async () => {
      const response = await getOpenAIClient().responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
        instructions,
        input,
        safety_identifier: getSafetyIdentifier(userId),
        max_output_tokens: 3000,
      });

      if (!response.output_text) {
        const error = new Error("OpenAI returned an empty result.");
        error.statusCode = 502;
        throw error;
      }

      return { content: response.output_text, source: "openai" };
    },
    gemini: async () => ({
      content: await callGemini({ instructions, input }),
      source: "gemini",
    }),
  });

const getSourceTitle = (source) => {
  if (source?.title) return String(source.title).trim();

  try {
    return new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return "Web source";
  }
};

const collectWebSources = (response) => {
  const sources = new Map();

  const addSource = (source) => {
    const url = source?.url;
    if (!url || !/^https?:\/\//i.test(url) || sources.has(url)) return;

    sources.set(url, {
      title: getSourceTitle(source),
      url,
      publisher: (() => {
        try {
          return new URL(url).hostname.replace(/^www\./, "");
        } catch {
          return "Web";
        }
      })(),
      platform: "Web",
      publishedAt: null,
      observedAt: new Date().toISOString(),
      metric: "Live web result",
      direction: "current",
    });
  };

  for (const item of response.output || []) {
    if (item?.type === "web_search_call") {
      for (const source of item.action?.sources || []) addSource(source);
    }

    if (item?.type === "message") {
      for (const content of item.content || []) {
        for (const annotation of content.annotations || []) {
          addSource(annotation?.url_citation || annotation);
        }
      }
    }
  }

  return [...sources.values()];
};

export const generateWebGroundedStructuredOutput = async ({
  userId,
  schemaName,
  schema,
  instructions,
  input,
  country = "BD",
  timezone = "Asia/Dhaka",
}) =>
  runWithProviderFallback({
    openai: async () => {
      const response = await getOpenAIClient().responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
        instructions,
        input,
        safety_identifier: getSafetyIdentifier(userId),
        tools: [
          {
            type: "web_search",
            search_context_size: "medium",
            user_location: {
              type: "approximate",
              country,
              timezone,
            },
          },
        ],
        include: ["web_search_call.action.sources"],
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema,
          },
        },
      });

      return {
        data: tagProvider(parseJsonText(response.output_text), "openai"),
        sources: collectWebSources(response),
        provider: "openai",
      };
    },
    gemini: async () => ({
      data: tagProvider(
        parseJsonText(
          await callGemini({
            instructions: `${instructions}\n\nOpenAI live web search is unavailable. Base every current claim only on the supplied Google Trends, YouTube, and related-news snapshot. Do not claim that you performed any additional web search.`,
            input,
            schema,
          })
        ),
        "gemini"
      ),
      sources: [],
      provider: "gemini",
    }),
  });
