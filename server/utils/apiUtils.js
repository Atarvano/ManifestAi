const { callGemini } = require("./geminiClient");
const { callGroq } = require("./groqClient");

async function callAI(modelSource, prompt) {
  try {
    if (modelSource === "groq") {
      return await callGroq(prompt);
    }
    if (modelSource === "gemini") {
      return await callGemini(prompt);
    }

    return await callGroq(prompt);
  } catch (error) {
    // Auto fallback on error
    if (modelSource === "groq") {
      console.warn("Groq failed, trying Gemini...");
      try {
        return await callGemini(prompt);
      } catch (geminiError) {
        throw new Error(
          `All AI providers failed. Groq: ${error.message}, Gemini: ${geminiError.message}`
        );
      }
    }

    console.error(`AI API error (${modelSource}):`, error.message);
    throw new Error(`${modelSource} API error: ${error.message}`);
  }
}

module.exports = { callAI };
