import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini client
// Note: In a real app, ensure process.env.API_KEY is set.
const apiKey = process.env.API_KEY || 'dummy_key';
const ai = new GoogleGenAI({ apiKey });

export interface SelectorPrediction {
  container: string;
  name: string;
  price: string;
  image: string;
  strategyRecommendation: 'STATIC' | 'DYNAMIC' | 'API';
  confidence: number;
}

/**
 * Analyzes an HTML snippet to predict the best scraping selectors.
 */
export const analyzeHtmlForSelectors = async (htmlSnippet: string, url: string): Promise<SelectorPrediction> => {
  // Defensive check for API key to prevent crashing if not set in environment during demo
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key missing. Returning mock data.");
    return {
      container: '.product-card',
      name: '.product-title',
      price: '.current-price',
      image: 'img.product-thumb',
      strategyRecommendation: 'STATIC',
      confidence: 0.85
    };
  }

  const modelId = 'gemini-2.5-flash-latest';

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `
        You are an expert web scraping architect. 
        I will provide a snippet of HTML from an e-commerce site (${url}).
        
        Your goal is to find the most robust CSS selectors for scraping product data.
        
        Step 1: Analyze the DOM to find the repeating "Product Card" element. This is your 'container'.
        Step 2: Inside that container, identify unique selectors for the product name, price, and image.
        Step 3: Prefer class names (e.g. .product-title) over generic tags (e.g. h3). Avoid overly specific nth-child or extremely long chains if a simpler class exists.
        Step 4: Determine if the site requires a Headless Browser (DYNAMIC) or simple HTML parsing (STATIC).
        
        HTML Snippet:
        \`\`\`html
        ${htmlSnippet.substring(0, 50000)} 
        \`\`\`
      `,
      config: {
        // Enable thinking to allow the model to traverse the DOM structure logic
        thinkingConfig: {
            thinkingBudget: 1024
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            container: { type: Type.STRING, description: "CSS selector for the product card/container. Example: '.product-item' or 'div.card'" },
            name: { type: Type.STRING, description: "CSS selector for the product title relative to container. Example: '.title a'" },
            price: { type: Type.STRING, description: "CSS selector for the price relative to container. Example: '.price .current'" },
            image: { type: Type.STRING, description: "CSS selector for the image relative to container. Example: 'img.main-img'" },
            strategyRecommendation: { type: Type.STRING, enum: ['STATIC', 'DYNAMIC', 'API'] },
            confidence: { type: Type.NUMBER, description: "Confidence score between 0 and 1" }
          },
          required: ["container", "name", "price", "image", "strategyRecommendation"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as SelectorPrediction;
    }
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    // Fallback for demo stability
    return {
      container: 'div.product',
      name: 'h3',
      price: '.price',
      image: 'img',
      strategyRecommendation: 'DYNAMIC',
      confidence: 0.5
    };
  }
};