import { XMLParser } from "fast-xml-parser";

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

const MARKET_MAP = [
  { pattern: /bangladesh|বাংলাদেশ|\bbd\b/i, country: "BD", timezone: "Asia/Dhaka" },
  { pattern: /india|ভারত|\bin\b/i, country: "IN", timezone: "Asia/Kolkata" },
  { pattern: /pakistan|পাকিস্তান|\bpk\b/i, country: "PK", timezone: "Asia/Karachi" },
  { pattern: /united kingdom|\buk\b|britain/i, country: "GB", timezone: "Europe/London" },
  { pattern: /united states|\busa?\b|america/i, country: "US", timezone: "America/New_York" },
  { pattern: /canada|\bca\b/i, country: "CA", timezone: "America/Toronto" },
  { pattern: /australia|\bau\b/i, country: "AU", timezone: "Australia/Sydney" },
];

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.createdAt > CACHE_TTL_MS) return null;
  return entry.value;
};

const setCached = (key, value) => {
  cache.set(key, { createdAt: Date.now(), value });
  return value;
};

const fetchJson = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`External data request failed (${response.status}).`);
  return response.json();
};

const getSearchTokens = (value) =>
  String(value || "")
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3)
    .slice(0, 8);

const trafficNumber = (value) =>
  Number(String(value || "0").replace(/[^0-9]/g, "")) || 0;

export const resolveMarket = (market = "Bangladesh") => {
  const match = MARKET_MAP.find(({ pattern }) => pattern.test(String(market)));
  return match
    ? { country: match.country, timezone: match.timezone }
    : { country: "BD", timezone: "Asia/Dhaka" };
};

export const fetchGoogleTrendingNow = async ({ country, niche }) => {
  const cacheKey = `google:${country}`;
  let items = getCached(cacheKey);

  if (!items) {
    const url = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(country)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Google Trends request failed (${response.status}).`);

    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
    const parsed = parser.parse(xml);

    items = asArray(parsed?.rss?.channel?.item).map((item) => ({
      title: String(item?.title || "Untitled trend"),
      traffic: String(item?.approx_traffic || "Not provided"),
      trafficNumber: trafficNumber(item?.approx_traffic),
      publishedAt: item?.pubDate ? new Date(item.pubDate).toISOString() : null,
      url: `https://trends.google.com/trending?geo=${encodeURIComponent(country)}`,
      news: asArray(item?.news_item)
        .slice(0, 2)
        .map((news) => ({
          title: String(news?.news_item_title || "Related news"),
          url: String(news?.news_item_url || ""),
          publisher: String(news?.news_item_source || "News source"),
        }))
        .filter((news) => /^https?:\/\//i.test(news.url)),
    }));

    setCached(cacheKey, items);
  }

  const tokens = getSearchTokens(niche);
  const ranked = items
    .map((item) => {
      const haystack = `${item.title} ${item.news.map((news) => news.title).join(" ")}`.toLocaleLowerCase();
      const relevance = tokens.reduce(
        (score, token) => score + (haystack.includes(token) ? 1 : 0),
        0
      );
      return { ...item, relevance };
    })
    .sort((a, b) => b.relevance - a.relevance || b.trafficNumber - a.trafficNumber)
    .slice(0, 12);

  return {
    provider: "Google Trends",
    available: true,
    updatedAt: ranked[0]?.publishedAt || new Date().toISOString(),
    sourceUrl: `https://trends.google.com/trending?geo=${encodeURIComponent(country)}`,
    items: ranked,
  };
};

export const fetchYouTubeSignals = async ({ country, niche, platform }) => {
  if (!process.env.YOUTUBE_API_KEY) {
    return {
      provider: "YouTube Data API",
      available: false,
      reason: "YOUTUBE_API_KEY is not configured.",
      updatedAt: new Date().toISOString(),
      items: [],
    };
  }

  const query = `${niche} ${platform || "video"}`.trim();
  const cacheKey = `youtube:${country}:${query.toLocaleLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const publishedAfter = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const searchParams = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    order: "date",
    maxResults: "10",
    publishedAfter,
    regionCode: country,
    safeSearch: "moderate",
    key: process.env.YOUTUBE_API_KEY,
  });
  const searchData = await fetchJson(
    `https://www.googleapis.com/youtube/v3/search?${searchParams}`
  );
  const videoIds = asArray(searchData?.items)
    .map((item) => item?.id?.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) {
    return setCached(cacheKey, {
      provider: "YouTube Data API",
      available: true,
      updatedAt: new Date().toISOString(),
      items: [],
    });
  }

  const videoParams = new URLSearchParams({
    part: "snippet,statistics",
    id: videoIds.join(","),
    key: process.env.YOUTUBE_API_KEY,
  });
  const videoData = await fetchJson(
    `https://www.googleapis.com/youtube/v3/videos?${videoParams}`
  );
  const observedAt = new Date();
  const items = asArray(videoData?.items).map((item) => {
    const publishedAt = new Date(item?.snippet?.publishedAt || observedAt);
    const ageHours = Math.max(1, (observedAt - publishedAt) / 3600000);
    const views = Number(item?.statistics?.viewCount || 0);
    const viewsPerHour = Math.round(views / ageHours);

    return {
      title: String(item?.snippet?.title || "YouTube video"),
      channel: String(item?.snippet?.channelTitle || "YouTube"),
      url: `https://www.youtube.com/watch?v=${item.id}`,
      publishedAt: publishedAt.toISOString(),
      views,
      likes: Number(item?.statistics?.likeCount || 0),
      comments: Number(item?.statistics?.commentCount || 0),
      viewsPerHour,
      direction: viewsPerHour >= 1000 ? "rising" : viewsPerHour >= 100 ? "active" : "early_signal",
    };
  });

  return setCached(cacheKey, {
    provider: "YouTube Data API",
    available: true,
    updatedAt: observedAt.toISOString(),
    items,
  });
};

export const collectTrendData = async (form) => {
  const market = resolveMarket(form.market);
  const results = await Promise.allSettled([
    fetchGoogleTrendingNow({ country: market.country, niche: form.niche }),
    fetchYouTubeSignals({
      country: market.country,
      niche: form.niche,
      platform: form.platform,
    }),
  ]);

  const google =
    results[0].status === "fulfilled"
      ? results[0].value
      : {
          provider: "Google Trends",
          available: false,
          reason: results[0].reason?.message || "Google Trends is unavailable.",
          updatedAt: new Date().toISOString(),
          items: [],
        };
  const youtube =
    results[1].status === "fulfilled"
      ? results[1].value
      : {
          provider: "YouTube Data API",
          available: false,
          reason: results[1].reason?.message || "YouTube data is unavailable.",
          updatedAt: new Date().toISOString(),
          items: [],
        };

  return { market, google, youtube, observedAt: new Date().toISOString() };
};

export const buildProviderSources = ({ google, youtube, observedAt }) => {
  const sources = [];

  if (google.available) {
    sources.push({
      title: `Google Trends — Trending now (${google.items.length} signals checked)`,
      url: google.sourceUrl,
      publisher: "Google Trends",
      platform: "Google",
      publishedAt: google.updatedAt,
      observedAt,
      metric: "Recent surge in Google Search interest",
      direction: "surging",
    });

    for (const trend of google.items.filter((item) => item.relevance > 0).slice(0, 4)) {
      for (const news of trend.news.slice(0, 1)) {
        sources.push({
          title: news.title,
          url: news.url,
          publisher: news.publisher,
          platform: "News",
          publishedAt: trend.publishedAt,
          observedAt,
          metric: `Related to Google trend “${trend.title}” (${trend.traffic})`,
          direction: "current",
        });
      }
    }
  }

  for (const video of youtube.items.slice(0, 8)) {
    sources.push({
      title: video.title,
      url: video.url,
      publisher: video.channel,
      platform: "YouTube",
      publishedAt: video.publishedAt,
      observedAt,
      metric: `${video.views.toLocaleString("en-US")} views · ${video.viewsPerHour.toLocaleString("en-US")} views/hour`,
      direction: video.direction,
    });
  }

  return sources;
};
