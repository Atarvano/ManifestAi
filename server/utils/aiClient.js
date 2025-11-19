const geminiClient = require("./geminiClient");
const groqClient = require("./groqClient");

async function callAI(prompt, options = {}) {
  try {
    return await groqClient.callGroq(prompt, options);
  } catch (groqError) {
    console.warn("Groq failed, using Gemini:", groqError.message);
    return await geminiClient.callGemini(prompt, options);
  }
}

async function getHSCode(description) {
  try {
    const hsCode = await groqClient.getHSCode(description);
    if (hsCode && hsCode.length >= 6) return hsCode;
  } catch (error) {
    // Silent fallback to Gemini
  }

  try {
    const hsCode = await geminiClient.getHSCode(description);
    if (hsCode && hsCode.length >= 6) return hsCode;
  } catch (error) {
    // Silent fallback
  }

  return "";
}

async function enrichWithHSCodes(items) {
  try {
    return await groqClient.enrichWithHSCodes(items);
  } catch (groqErr) {
    console.warn(`Groq failed: ${groqErr.message}, falling back to Gemini`);
    return await geminiClient.enrichWithHSCodes(items);
  }
}

async function testAIConnection() {
  const results = { groq: false, gemini: false };

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
  groq: groqClient,
  gemini: geminiClient,
};
