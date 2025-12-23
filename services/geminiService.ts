
import { GoogleGenAI, Type } from "@google/genai";
import { GDriveLink, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeLinkPurpose = async (title: string, purpose: string): Promise<{ tags: string[], category: Category }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this Google Drive link metadata and suggest appropriate tags (max 5) and one category from ['Work', 'Personal', 'Projects', 'Education', 'Other'].
      Title: ${title}
      Purpose: ${purpose}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            category: {
              type: Type.STRING,
            }
          },
          required: ["tags", "category"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      tags: result.tags || [],
      category: result.category as Category || 'Other'
    };
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return { tags: [], category: 'Other' };
  }
};

export const findLinkWithAI = async (query: string, links: GDriveLink[]): Promise<string> => {
  const context = links.map(l => `ID: ${l.id} | Title: ${l.title} | Purpose: ${l.purpose} | Tags: ${l.tags.join(', ')}`).join('\n');
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a helpful assistant managing a link repository. 
      User Query: "${query}"
      
      Available Links:
      ${context}
      
      Instructions: Based on the query, identify the most relevant Link ID. If multiple are relevant, list them. If none are relevant, say "No relevant links found". Briefly explain why.`,
    });

    return response.text || "I couldn't find a matching link.";
  } catch (error) {
    console.error("Search failed:", error);
    return "Something went wrong while searching.";
  }
};
