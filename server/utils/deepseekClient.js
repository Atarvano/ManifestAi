// DeepSeek AI Client
const axios = require("axios");

/**
 * Call DeepSeek API
 * @param {string} prompt - The prompt to send to DeepSeek
 * @param {Object} options - Optional configuration
 * @param {string} options.model - Model to use (default: deepseek-chat)
 * @param {number} options.temperature - Temperature for generation (default: 0.3)
 * @param {number} options.maxTokens - Max tokens to generate (default: 8000)
 * @returns {Promise<string>} Text response from DeepSeek
 */
async function callDeepseek(prompt, options = {}) {
  try {
    // Get API key from environment
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY not found in environment variables");
    }

    // Configuration
    const model = options.model || "deepseek-chat"; // Default model
    const temperature = options.temperature || 0.3;
    const maxTokens = options.maxTokens || 8000;

    // DeepSeek API endpoint
    const url = "https://api.deepseek.com/v1/chat/completions";

    // Request payload
    const payload = {
      model: model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      stream: false,
    };

    // Make API call
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 60000, // 60 seconds timeout
    });

    // Extract text from response
    const choices = response.data.choices;
    if (!choices || choices.length === 0) {
      throw new Error("No choices in DeepSeek response");
    }

    const message = choices[0].message;
    if (!message || !message.content) {
      throw new Error("No message content in DeepSeek response");
    }

    return message.content;
  } catch (error) {
    // Handle different error types
    if (error.response) {
      // API returned error response
      const status = error.response.status;
      const message =
        error.response.data?.error?.message ||
        error.response.data?.message ||
        error.response.statusText;

      if (status === 400) {
        throw new Error(`DeepSeek API Bad Request: ${message}`);
      } else if (status === 401) {
        throw new Error("DeepSeek API: Invalid API key");
      } else if (status === 429) {
        throw new Error("DeepSeek API: Rate limit exceeded");
      } else if (status === 500) {
        throw new Error("DeepSeek API: Internal server error");
      } else {
        throw new Error(`DeepSeek API error (${status}): ${message}`);
      }
    } else if (error.request) {
      // Request made but no response
      throw new Error(
        "DeepSeek API: No response received (check internet connection)"
      );
    } else {
      // Other errors
      throw new Error(`DeepSeek client error: ${error.message}`);
    }
  }
}

/**
 * Call DeepSeek with Reasoner model (for complex reasoning tasks)
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} Text response
 */
async function callDeepseekReasoner(prompt) {
  return callDeepseek(prompt, { model: "deepseek-reasoner" });
}

/**
 * Call DeepSeek with Chat model (default, general purpose)
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} Text response
 */
async function callDeepseekChat(prompt) {
  return callDeepseek(prompt, { model: "deepseek-chat" });
}

/**
 * Test DeepSeek connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testDeepseekConnection() {
  try {
    const response = await callDeepseek('Hello, respond with "OK"');
    return response.toLowerCase().includes("ok");
  } catch (error) {
    console.error("DeepSeek connection test failed:", error.message);
    return false;
  }
}

module.exports = {
  callDeepseek,
  callDeepseekReasoner,
  callDeepseekChat,
  testDeepseekConnection,
};
