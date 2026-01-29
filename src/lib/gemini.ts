import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRandomQuestions } from "./questionBank";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is missing. Quiz generation will fail.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function generateQuizQuestions(topic: string, count: number, excludeTexts: string[] = []): Promise<any[]> {
  // If no API key, go straight to fallback
  if (!apiKey) {
    console.warn("No API Key configured, using Question Bank.");
    return getRandomQuestions(count, topic);
  }

  try {
    const excludeList = excludeTexts.length > 0
      ? `\nCRITICAL: Do NOT use or repeat any of these existing questions:\n${excludeTexts.map(t => `- ${t}`).join('\n')}`
      : "";

    const prompt = `
      Generate ${count} unique multiple-choice quiz questions about "${topic}".
      ${excludeList}

      Focus on unique, interesting, and lesser-known facts to keep the quiz fresh.
      Return strictly a JSON array of objects. 
      Each object must have:
      - "text": string (The question)
      - "options": string[] (Array of 4 options)
      - "correctAnswer": number (Index of the correct option, 0-3)

      Example format:
      [
        {
          "text": "What is the capital of France?",
          "options": ["London", "Berlin", "Paris", "Madrid"],
          "correctAnswer": 2
        }
      ]
      
      Do not include any markdown formatting (like \`\`\`json). Just the raw JSON array.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up potential markdown formatting if Gemini adds it
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const questions = JSON.parse(cleanText);

    // Basic validation
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid response structure from AI");
    }

    return questions.slice(0, count);
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);

    // Use Real Question Bank
    return getRandomQuestions(count, topic);
  }
}

export async function generateCardQuestion(theme: string): Promise<string> {
  const customKey = process.env.CARDS_API_KEY;
  if (!customKey) return ""; // Fallback to static

  try {
    const genAI_Cards = new GoogleGenerativeAI(customKey);
    const model_Cards = genAI_Cards.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Generate a short 4-word question for a "Choose the Winner" card game. Theme: ${theme}. Return ONLY the question text. Example: "Which Punk is Rare?"`;

    const result = await model_Cards.generateContent(prompt);
    const text = (await result.response).text();
    return text.trim().replace(/['"]/g, "");
  } catch (e) {
    console.error("Card AI Error:", e);
    return "";
  }
}
