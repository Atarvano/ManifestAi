// Gemini AI Client
const axios = require("axios");

/**
 * Call Gemini API with the latest model
 * @param {string} prompt - The prompt to send to Gemini
 * @param {Object} options - Optional configuration
 * @param {string} options.model - Model to use (default: gemini-2.5-flash)
 * @param {number} options.temperature - Temperature for generation (default: 0.3)
 * @param {number} options.maxTokens - Max tokens to generate (default: 8000)
 * @returns {Promise<string>} Text response from Gemini
 */
async function callGemini(prompt, options = {}) {
  try {
    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables");
    }

    // Configuration
    const model = options.model || "gemini-2.5-flash"; // Use available flash model
    const temperature = options.temperature || 0.3;
    const maxTokens = options.maxTokens || 8000;

    // Gemini API endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Request payload
    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
    };

    // Make API call
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 60000, // 60 seconds timeout
    });

    // Extract text from response
    const candidates = response.data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates in Gemini response");
    }

    const content = candidates[0].content;
    if (!content || !content.parts || content.parts.length === 0) {
      throw new Error("No content parts in Gemini response");
    }

    const textResponse = content.parts[0].text;
    if (!textResponse) {
      throw new Error("No text in Gemini response");
    }

    return textResponse;
  } catch (error) {
    // Handle different error types
    if (error.response) {
      // API returned error response
      const status = error.response.status;
      const message =
        error.response.data?.error?.message || error.response.statusText;

      if (status === 400) {
        throw new Error(`Gemini API Bad Request: ${message}`);
      } else if (status === 401) {
        throw new Error("Gemini API: Invalid API key");
      } else if (status === 429) {
        throw new Error("Gemini API: Rate limit exceeded");
      } else if (status === 500) {
        throw new Error("Gemini API: Internal server error");
      } else {
        throw new Error(`Gemini API error (${status}): ${message}`);
      }
    } else if (error.request) {
      // Request made but no response
      throw new Error(
        "Gemini API: No response received (check internet connection)"
      );
    } else {
      // Other errors
      throw new Error(`Gemini client error: ${error.message}`);
    }
  }
}

/**
 * Call Gemini with Pro model (more capable, slower)
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} Text response
 */
async function callGeminiPro(prompt) {
  return callGemini(prompt, { model: "gemini-2.5-pro" });
}

/**
 * Call Gemini with Flash model (faster, good for most tasks)
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} Text response
 */
async function callGeminiFlash(prompt) {
  return callGemini(prompt, { model: "gemini-2.5-flash" });
}

/**
 * Test Gemini connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testGeminiConnection() {
  try {
    const response = await callGemini('Hello, respond with "OK"');
    return response.toLowerCase().includes("ok");
  } catch (error) {
    console.error("Gemini connection test failed:", error.message);
    return false;
  }
}

module.exports = {
  callGemini,
  callGeminiPro,
  callGeminiFlash,
  testGeminiConnection,
};
