// AI Client - Universal wrapper with automatic fallback
const geminiClient = require("./geminiClient");
const groqClient = require("./groqClient");

/**
 * Universal AI call with automatic fallback
 * Priority: Groq (fast & reliable) -> Gemini (fallback)
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Optional configuration
 * @returns {Promise<string>} Text response from AI
 */
async function callAI(prompt, options = {}) {
  const errors = [];

  // Try Groq first (faster and more reliable)
  try {
    console.log("🤖 Trying Groq AI (Llama 3.1)...");
    const response = await groqClient.callGroq(prompt, options);
    console.log("✅ Groq AI response received");
    return response;
  } catch (groqError) {
    console.warn("⚠️ Groq failed:", groqError.message);
    errors.push(`Groq: ${groqError.message}`);
  }

  // Fallback to Gemini
  try {
    console.log("🤖 Trying Gemini AI (fallback)...");
    const response = await geminiClient.callGemini(prompt, options);
    console.log("✅ Gemini AI response received");
    return response;
  } catch (geminiError) {
    console.warn("⚠️ Gemini failed:", geminiError.message);
    errors.push(`Gemini: ${geminiError.message}`);
  }

  // Both failed
  throw new Error(`All AI providers failed:\n${errors.join("\n")}`);
}

/**
 * Get HS Code with auto-fallback (Groq → Gemini)
 */
async function getHSCode(description) {
  // Try Groq first
  try {
    const hsCode = await groqClient.getHSCode(description);
    if (hsCode && hsCode.length >= 6) return hsCode;
  } catch (error) {
    // Silent fallback
  }

  // Fallback to Gemini
  try {
    const hsCode = await geminiClient.getHSCode(description);
    if (hsCode && hsCode.length >= 6) return hsCode;
  } catch (error) {
    // Silent fallback
  }

  return "";
}

/**
 * Enrich items with HS Codes (auto-fallback)
 */
async function enrichWithHSCodes(items) {
  console.log(`🤖 Starting HS Code enrichment for ${items.length} items...`);

  // Try Groq first
  try {
    return await groqClient.enrichWithHSCodes(items);
  } catch (error) {
    console.warn("⚠️ Groq failed, trying Gemini...");
  }

  // Fallback to Gemini
  try {
    return await geminiClient.enrichWithHSCodes(items);
  } catch (error) {
    console.error("❌ All AI providers failed");
    return items;
  }
}

/**
 * Test AI connection (both providers)
 * @returns {Promise<Object>} Status of each provider
 */
async function testAIConnection() {
  const results = {
    groq: false,
    gemini: false,
  };

  try {
    results.groq = await groqClient.testGroqConnection();
    console.log(results.groq ? "✅ Groq: Connected" : "❌ Groq: Failed");
  } catch (error) {
    console.error("❌ Groq test failed:", error.message);
  }

  try {
    results.gemini = await geminiClient.testGeminiConnection();
    console.log(results.gemini ? "✅ Gemini: Connected" : "❌ Gemini: Failed");
  } catch (error) {
    console.error("❌ Gemini test failed:", error.message);
  }

  return results;
}

module.exports = {
  callAI,
  getHSCode,
  enrichWithHSCodes,
  testAIConnection,

  // Direct access to specific providers
  groq: groqClient,
  gemini: geminiClient,
};
