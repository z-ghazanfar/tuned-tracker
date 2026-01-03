
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
      const prompt = `Provide an expert analysis for the series "${show.name}".
      Summary: ${show.summary.replace(/<[^>]*>?/gm, '')}.
      Genres: ${show.genres.join(', ')}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are a professional media analyst and curator for the 'Tuned' TV tracker app. Always return responses in valid JSON format.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              whyWatch: { type: Type.STRING },
              similarShows: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              targetAudience: { type: Type.STRING },
              aiRating: { type: Type.NUMBER }
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

  const listNames = userList.slice(0, 10).map(s => s.name).join(', ');
  const prompt = `Based on these shows the user likes: ${listNames}, suggest exactly 8 high-quality series or anime recommendations.`;

  return callWithRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are a professional media curator. Suggest premium series that match the user's existing taste. Always return responses in valid JSON format.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    matchPercentage: { type: Type.INTEGER }
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
      console.error("Gemini Rec Error:", error);
      return null;
    }
  });
};
