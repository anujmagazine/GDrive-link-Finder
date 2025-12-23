
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

/**
 * Scans a GDrive URL and generates an appropriate title and description/purpose.
 * Uses Google Search grounding to find public context/metadata for the link.
 */
export const scanDriveLink = async (url: string): Promise<{ title: string, purpose: string, tags: string[], category: Category }> => {
  try {
    // We use gemini-3-pro-preview for higher quality reasoning and search tool support
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `You are a highly advanced Document Intelligence agent. I have a Google Drive link: ${url}. 
      
      Your goal is to perform a "deep scan" of this link. 
      1. Use Google Search to find if this link is referenced anywhere online (e.g., public forums, project pages, shared resource lists).
      2. Analyze the URL structure to identify if it's a Folder, Document, Spreadsheet, or Presentation.
      3. Extract or infer the most specific title possible. Avoid generic names like "Google Drive Folder" unless absolutely no other info exists.
      4. Write a "Purpose" description that explains what this asset is likely used for (e.g., "Project assets for the 2024 rebranding initiative" instead of "A shared folder").
      5. Categorize it accurately into: ['Work', 'Personal', 'Projects', 'Education', 'Other'].
      
      Provide your findings in JSON format.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Specific title of the file or folder." },
            purpose: { type: Type.STRING, description: "Detailed explanation of why this link is valuable and what it contains." },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-5 relevant keywords for indexing."
            },
            category: { type: Type.STRING, description: "One of the predefined categories." }
          },
          required: ["title", "purpose", "tags", "category"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      title: result.title || "Untitled Drive Resource",
      purpose: result.purpose || "No specific purpose could be inferred from the public link metadata.",
      tags: result.tags || ["needs-review"],
      category: (result.category as Category) || 'Other'
    };
  } catch (error) {
    console.error("Link scanning failed:", error);
    return { 
      title: "Auto-detected Document", 
      purpose: "Could not automatically scan the full content. The link might be private or newly created. Please provide manual context.", 
      tags: ["manual-entry"], 
      category: 'Other' 
    };
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
