
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is missing. Quiz generation will fail.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });



export async function generateQuizQuestions(topic: string, count: number): Promise<any[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  try {
    const prompt = `
      Generate ${count} multiple-choice quiz questions about "${topic}".
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

    // Fallback/Mock Mode if API fails
    console.warn("⚠️ Switching to Mock/Fallback Mode due to AI Error.");

    const mockQuestions = Array(count).fill(null).map((_, i) => ({
      text: `(Sample) What is a key fact about ${topic}? (Q${i + 1})`,
      options: [
        `Fact A about ${topic}`,
        `Fact B about ${topic}`,
        `Fact C about ${topic}`,
        `Fact D about ${topic}`
      ],
      correctAnswer: 0
    }));

    return mockQuestions;
  }
}

