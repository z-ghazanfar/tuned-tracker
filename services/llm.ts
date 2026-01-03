
import { GoogleGenAI, Type } from "@google/genai";
import { Show } from "../types";

const callWithRetry = async (fn: () => Promise<any>, retries = 3, delay = 1000): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    const status = error.status || (error.message?.includes('429') ? 429 : 0);
    const isRateLimit = status === 429;
    if (retries > 0 && isRateLimit) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const generateShowAnalysis = async (show: Show) => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  return callWithRetry(async () => {
    try {
      const prompt = `Perform a high-frequency analysis for the series "${show.name}".
      Context: ${show.summary.replace(/<[^>]*>?/gm, '')}.
      Genres: ${show.genres.join(', ')}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are the 'Tuned' AI Media Curator. Your job is to analyze shows and provide hyper-personalized insights. Always return responses in valid JSON format.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              whyWatch: {
                type: Type.STRING,
                description: "A compelling paragraph on why this show is worth the user's time."
              },
              similarShows: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 show titles that share the same DNA"
              },
              targetAudience: {
                type: Type.STRING,
                description: "Define the specific niche of fans who would love this."
              },
              aiRating: {
                type: Type.NUMBER,
                description: "A score from 1.0 to 10.0 based on critical reception and genre impact"
              }
            },
            required: ["whyWatch", "similarShows", "targetAudience", "aiRating"]
          }
        }
      });

      const jsonStr = response.text?.trim();
      return jsonStr ? JSON.parse(jsonStr) : null;
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return null;
    }
  });
};

export const getAIRecommendation = async (userList: Show[]) => {
  if (!userList || userList.length === 0) return null;
  
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  const listNames = userList.slice(0, 15).map(s => s.name).join(', ');
  const prompt = `Based on this user's watchlist: ${listNames}, curate exactly 8 premium recommendations. 
  Focus on shows that match the tone, complexity, and genre profile of their list.`;

  return callWithRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are the 'Tuned' AI Media Curator. Your job is to curate premium recommendations for television enthusiasts. Always return responses in valid JSON format.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { 
                      type: Type.STRING,
                      description: "Exact show title"
                    },
                    reason: { 
                      type: Type.STRING,
                      description: "One-sentence personalized reason why it matches their taste"
                    },
                    matchPercentage: { 
                      type: Type.INTEGER,
                      description: "Match percentage (1-100)"
                    }
                  },
                  required: ["title", "reason", "matchPercentage"]
                }
              }
            },
            required: ["recommendations"]
          }
        }
      });

      const jsonStr = response.text?.trim();
      if (!jsonStr) return [];
      const parsed = JSON.parse(jsonStr);
      return parsed.recommendations || [];
    } catch (error) {
      console.error("Gemini Recommendation Error:", error);
      return null;
    }
  });
};
