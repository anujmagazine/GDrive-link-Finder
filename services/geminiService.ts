
import { GoogleGenAI, Type } from "@google/genai";
import { GDriveLink, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Generates professional metadata (title, purpose, tags, category) based on a URL and user keywords.
 */
export const generateMetadataFromKeywords = async (url: string, keywords: string): Promise<{ title: string, purpose: string, tags: string[], category: Category }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional librarian and document organizer. 
      Input URL: ${url}
      User Keywords: ${keywords}
      
      Task:
      1. Create a professional Title that is exactly 5 to 8 words long.
      2. Write a detailed "Purpose" description (2-3 sentences) that explains what this link is for, using the keywords as a foundation. This description will be used later for natural language searching, so make it descriptive.
      3. Suggest 4-6 relevant tags.
      4. Select the most appropriate Category from: ['Work', 'Personal', 'Projects', 'Education', 'Other'].
      
      Return the result in valid JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            purpose: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            category: { type: Type.STRING }
          },
          required: ["title", "purpose", "tags", "category"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      title: result.title || "Document based on " + keywords,
      purpose: result.purpose || "Context provided: " + keywords,
      tags: result.tags || [],
      category: (result.category as Category) || 'Other'
    };
  } catch (error) {
    console.error("Metadata generation failed:", error);
    return { 
      title: "Document: " + keywords, 
      purpose: "Manual entry for keywords: " + keywords, 
      tags: keywords.split(',').map(k => k.trim()), 
      category: 'Other' 
    };
  }
};

/**
 * Standard refinement of existing metadata if the user manually edits.
 */
export const analyzeLinkPurpose = async (title: string, purpose: string): Promise<{ tags: string[], category: Category }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Refine tags and category for:
      Title: ${title}
      Description: ${purpose}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            category: { type: Type.STRING }
          },
          required: ["tags", "category"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      tags: result.tags || [],
      category: (result.category as Category) || 'Other'
    };
  } catch (error) {
    return { tags: [], category: 'Other' };
  }
};

/**
 * Natural language search implementation.
 */
export const findLinkWithAI = async (query: string, links: GDriveLink[]): Promise<string> => {
  const context = links.map(l => `ID: ${l.id} | Title: ${l.title} | Description: ${l.purpose} | Tags: ${l.tags.join(', ')}`).join('\n---\n');
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Use Pro for better reasoning over large lists
      contents: `You are an intelligent search agent for a private document repository.
      
      User is asking: "${query}"
      
      Below is the repository metadata:
      ${context}
      
      Task:
      Identify the most relevant link(s). Explain briefly why they match the query based on the 'Description' and 'Title'. 
      Return the answer in clear markdown. Mention the Titles specifically.`,
    });

    return response.text || "I couldn't find a matching link in your repository.";
  } catch (error) {
    console.error("Search failed:", error);
    return "Something went wrong while performing the AI search.";
  }
};
