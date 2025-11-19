// Utility functions untuk API calls (Gemini, DeepSeek, Groq)
const axios = require("axios");
const { callGemini } = require("./geminiClient");
const { callDeepseek } = require("./deepseekClient");
const { callGroq } = require("./groqClient");

/**
 * Call Gemini API
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} AI response
 */
async function callGeminiAPI(prompt) {
  try {
    // Use the dedicated Gemini client (gemini-2.5-flash-lite by default)
    return await callGemini(prompt);
  } catch (error) {
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

/**
 * Call DeepSeek API
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} AI response
 */
async function callDeepSeekAPI(prompt) {
  try {
    // Use the dedicated DeepSeek client (deepseek-chat by default)
    return await callDeepseek(prompt);
  } catch (error) {
    throw new Error(`DeepSeek API error: ${error.message}`);
  }
}

/**
 * Call Groq API (Llama 3.1 - Fast & Free)
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} AI response
 */
async function callGroqAPI(prompt) {
  try {
    // Use the dedicated Groq client (llama-3.1-70b-versatile by default)
    return await callGroq(prompt);
  } catch (error) {
    throw new Error(`Groq API error: ${error.message}`);
  }
}

/**
 * Call AI based on model source
 * @param {string} modelSource - 'gemini', 'deepseek', or 'groq'
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} AI response
 */
async function callAI(modelSource, prompt) {
  if (modelSource === "gemini") {
    return await callGeminiAPI(prompt);
  } else if (modelSource === "deepseek") {
    return await callDeepSeekAPI(prompt);
  } else if (modelSource === "groq") {
    return await callGroqAPI(prompt);
  } else {
    throw new Error(
      `Invalid model source: ${modelSource}. Use 'gemini', 'deepseek', or 'groq'`
    );
  }
}

module.exports = {
  callGeminiAPI,
  callDeepSeekAPI,
  callGroqAPI,
  callAI,
};
