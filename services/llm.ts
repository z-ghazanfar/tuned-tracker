
import { GoogleGenAI, Type } from "@google/genai";
import { Show } from "../types";

const ANALYSIS_MODEL = "gemini-2.5-flash-lite";
const RECOMMENDATION_MODEL = "gemini-2.5-flash-lite";
const ANALYSIS_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const RECOMMENDATION_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

type CachedValue<T> = {
  expiresAt: number;
  value: T;
};

type ShowAnalysis = {
  whyWatch: string;
  targetAudience: string;
  aiRating: number;
};

const callWithRetry = async (
  fn: () => Promise<any>,
  retries = 3,
  delay = 1000
): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    const status = error.status || (error.message?.includes("429") ? 429 : 0);
    const isRateLimit = status === 429;
    if (retries > 0 && isRateLimit) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

const getApiKey = () => {
  const env = (import.meta as any).env || {};
  return env.VITE_GEMINI_API_KEY || env.VITE_API_KEY || process.env.API_KEY || "";
};

const getCache = <T>(key: string): T | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedValue<T>;
    if (!parsed || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
};

const setCache = <T>(key: string, value: T, ttlMs: number) => {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const payload: CachedValue<T> = {
      expiresAt: Date.now() + ttlMs,
      value,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
};

const cleanSummary = (summary: string) =>
  summary.replace(/<[^>]*>?/gm, "").replace(/\s+/g, " ").trim();

const createAnalysisCacheKey = (show: Show) =>
  `tuned:ai:analysis:${show.id}:${show.updated}`;

const createRecommendationCacheKey = (userList: Show[]) => {
  const signature = userList
    .slice(0, 15)
    .map((show) => `${show.id}:${show.updated}:${show.name.toLowerCase()}`)
    .sort()
    .join("|");

  return `tuned:ai:recs:${signature}`;
};

export const generateShowAnalysis = async (show: Show) => {
  const cacheKey = createAnalysisCacheKey(show);
  const cached = getCache<ShowAnalysis>(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  return callWithRetry(async () => {
    try {
      const prompt = [
        `Analyze "${show.name}" for a TV tracking app.`,
        `Summary: ${cleanSummary(show.summary).slice(0, 1800) || "Not available."}`,
        `Genres: ${show.genres.join(", ") || "Unknown"}.`,
        "Return concise JSON only.",
        'Keep "whyWatch" under 45 words and "targetAudience" under 12 words.',
      ].join("\n");

      const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
          systemInstruction:
            "You are a concise TV curator. Return valid JSON only.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              whyWatch: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              aiRating: { type: Type.NUMBER },
            },
            required: ["whyWatch", "targetAudience", "aiRating"],
          },
        },
      });

      const jsonStr = response.text?.trim();
      const parsed = jsonStr ? (JSON.parse(jsonStr) as ShowAnalysis) : null;
      if (parsed) {
        setCache(cacheKey, parsed, ANALYSIS_CACHE_TTL_MS);
      }
      return parsed;
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return null;
    }
  });
};

export const getAIRecommendation = async (userList: Show[]) => {
  if (!userList || userList.length === 0) return null;

  const cacheKey = createRecommendationCacheKey(userList);
  const cached = getCache<string[]>(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  const listNames = userList
    .slice(0, 15)
    .map((show) => show.name)
    .join(", ");

  const prompt = [
    `Based on this watchlist: ${listNames}.`,
    "Return exactly 8 TV series or anime titles only.",
    "Prefer well-known titles that can be found in TVMaze search.",
    "No explanations.",
  ].join(" ");

  return callWithRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: RECOMMENDATION_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
          systemInstruction:
            "You recommend TV series and anime. Return valid JSON only.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
            },
            required: ["recommendations"],
          },
        },
      });

      const jsonStr = response.text?.trim();
      if (!jsonStr) return [];

      const parsed = JSON.parse(jsonStr) as { recommendations?: string[] };
      const recommendations = (parsed.recommendations || []).slice(0, 8);
      setCache(cacheKey, recommendations, RECOMMENDATION_CACHE_TTL_MS);
      return recommendations;
    } catch (error) {
      console.error("Gemini Recommendation Error:", error);
      return null;
    }
  });
};
