
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY is missing in .env.local");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  console.log("Fetching available models...");
  try {
    // For some reason listModels isn't directly on genAI in some versions or requires different handling
    // We will try to just generate content with a known fallback if listing fails, 
    // BUT the error message suggested calling ListModels.
    // Actually, checking documentation, it's usually on the client.
    // Let's try a direct fetch if SDK doesn't make it easy, or use the model manager if available.
    // Wait, the SDK has it? No, the simple SDK just has getGenerativeModel.
    // Let's try to run a simple generation with 'gemini-1.0-pro' which is often the explicit name.

    // Better approach: Try a few standard names and see which one works.
    const candidates = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];

    for (const modelName of candidates) {
      process.stdout.write(`Testing model: ${modelName} ... `);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        console.log("✅ SUCCESS!");
        return; // We found one!
      } catch (e) {
        console.log(`❌ Failed: ${e.message}`);
        if (e.response) {
          console.log(JSON.stringify(e.response, null, 2));
        }
      }
    }

  } catch (error) {
    console.error("Fatal Error:", error);
  }
}

listModels();
