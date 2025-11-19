const axios = require("axios");

async function callGemini(prompt, options = {}) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const model = options.model || "gemini-2.5-flash";
    const temperature = options.temperature || 0.3;
    const maxTokens = options.maxTokens || 32000; // Increased for large datasets

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      },
      { headers: { "Content-Type": "application/json" }, timeout: 120000 } // Increased timeout
    );

    const textResponse =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error("No text in Gemini response");

    return textResponse;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const message =
        error.response.data?.error?.message || error.response.statusText;
      if (status === 401) throw new Error("Invalid Gemini API key");
      if (status === 429) throw new Error("Rate limit exceeded");
      throw new Error(`Gemini API error (${status}): ${message}`);
    }
    if (error.request) throw new Error("No response from Gemini API");
    throw new Error(`Gemini error: ${error.message}`);
  }
}

async function callGeminiPro(prompt) {
  return callGemini(prompt, { model: "gemini-2.5-pro" });
}

async function callGeminiFlash(prompt) {
  return callGemini(prompt, { model: "gemini-2.5-flash" });
}

async function testGeminiConnection() {
  try {
    const response = await callGemini('Hello, respond with "OK"');
    return response.toLowerCase().includes("ok");
  } catch (error) {
    console.error("Gemini connection test failed:", error.message);
    return false;
  }
}

async function getHSCode(description) {
  try {
    const cleanDesc = description.substring(0, 80).trim();
    const prompt = `Give ONLY the HS tariff code number for: ${cleanDesc}\n\nAnswer with digits only (example: 3926900000):`;

    const response = await callGemini(prompt, {
      temperature: 0.0,
      maxTokens: 20,
    });

    const hsCode = response.replace(/\D/g, "").slice(0, 10);
    return hsCode.length >= 6 && hsCode.length <= 10 ? hsCode : "";
  } catch (error) {
    return "";
  }
}

async function enrichWithHSCodes(items) {
  const enrichedItems = [];

  for (const item of items) {
    try {
      if (item.description) {
        const hsCode = await getHSCode(item.description);
        if (hsCode) {
          item.hs_code = hsCode;
        }
      }
      enrichedItems.push(item);
    } catch (error) {
      console.error(`Error enriching item: ${error.message}`);
      enrichedItems.push(item);
    }
  }

  return enrichedItems;
}

module.exports = {
  callGemini,
  callGeminiPro,
  callGeminiFlash,
  testGeminiConnection,
  getHSCode,
  enrichWithHSCodes,
};
