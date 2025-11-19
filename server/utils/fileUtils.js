// Utility untuk file operations
const fs = require("fs");
const path = require("path");
const { generateBL, fillManifestBLNumbers } = require("./generateBLNumber");

/**
 * Load format_standar.json
 * @returns {Object} Format standar configuration
 */
function loadFormatStandar() {
  try {
    const formatPath = path.join(__dirname, "../../format_standar.json");
    const data = fs.readFileSync(formatPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Error loading format_standar.json: ${error.message}`);
  }
}

/**
 * Build AI prompt for data normalization
 * @param {Object} formatStandar - Format configuration
 * @param {string} csvData - CSV data from Excel
 * @param {string} userInstruction - Additional user instruction
 * @returns {string} Complete prompt for AI
 */
function buildAIPrompt(formatStandar, csvData, userInstruction = "") {
  const columns = formatStandar.format_standar?.columns || [];
  const columnsList =
    columns.length > 0
      ? columns.join(", ")
      : "item_no, description, quantity, unit, price";

  let prompt = `You are an expert logistics data specialist for Indonesian shipping manifests. Transform messy Excel data into clean, professional cargo manifest format.

CONTEXT: Input data is POOR quality - expect typos, inconsistent formats, abbreviations, missing fields.

CLEANING TASKS:
1. Fix typos & expand abbreviations (Flmtec→Filmtec)
2. Standardize units: PCS, CT, BX, KG, L, UNIT, SET, ROLL, PK
3. Extract quantity as NUMBER, unit separately
4. Clean descriptions: professional format, remove junk text
5. Format companies properly (PT., Ltd, Inc)
6. Split combined data intelligently (name+address+NPWP → separate fields)
7. NPWP format: XX.XXX.XXX.X-XXX.XXX or null

STANDARD COLUMNS: ${columnsList}

${userInstruction ? `USER INSTRUCTIONS:\n${userInstruction}\n` : ""}
RAW CSV DATA:
${csvData}

OUTPUT RULES:
✓ ONLY valid JSON array - NO markdown, NO text outside JSON
✓ Each object has all standard columns (use null/"" if missing)
✓ item_no: sequential numbers (1,2,3...)
✓ quantity/price/weight/volume: numbers (not strings)
✓ bl_number: null (auto-generated later)
✓ hs_code: null or "" (auto-generated later)
✓ Trim strings, capitalize properly

CONCISE EXAMPLE:
[{"item_no":1,"description":"Filmtec RO Membrane BW30","quantity":4,"unit":"CT","weight":100.0,"shipper":"PT. Hantech","consignee":"ABC Ltd","bl_number":null,"hs_code":null}]

Your complete JSON array (all ${csvData.split("\n").length} items):`;

  return prompt;
}

/**
 * Generate B/L (Bill of Lading) number with custom format
 * @param {number} startNumber - Start number
 * @param {string} formatTengah - Middle format (e.g., "TWN/BLW")
 * @param {number} tahun - Year
 * @param {number} index - Index for sequential numbering
 * @returns {string} Generated B/L number (format: 01/TWN/BLW-XI/2025)
 */
function generateBLNumber(
  startNumber = 1,
  formatTengah = "TWN/BLW",
  tahun = new Date().getFullYear(),
  index = 0
) {
  return generateBL(startNumber, formatTengah, tahun, index);
}

/**
 * Fill missing B/L numbers in manifest data
 * @param {Array} manifestData - Array of manifest items
 * @param {Object} blConfig - B/L configuration
 * @param {number} blConfig.startNumber - Starting number (default: 1)
 * @param {string} blConfig.formatTengah - Middle format (default: "TWN/BLW")
 * @param {number} blConfig.tahun - Year (default: current year)
 * @returns {Array} Manifest data with filled B/L numbers
 */
function fillBLNumbers(manifestData, blConfig = {}) {
  if (!Array.isArray(manifestData)) {
    return manifestData;
  }

  const {
    startNumber = 1,
    formatTengah = "TWN/BLW",
    tahun = new Date().getFullYear(),
  } = blConfig;

  return fillManifestBLNumbers(manifestData, startNumber, formatTengah, tahun);
}

/**
 * Delete file safely
 * @param {string} filePath - Path to file to delete
 */
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error.message);
  }
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 * @param {string} aiResponse - Raw response from AI
 * @returns {Object|Array} Parsed JSON
 */
function parseAIResponse(aiResponse) {
  try {
    // Remove markdown code blocks if present
    let cleaned = aiResponse.trim();

    // Remove ```json and ``` if present
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Parse JSON
    return JSON.parse(cleaned.trim());
  } catch (error) {
    throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
  }
}

module.exports = {
  loadFormatStandar,
  buildAIPrompt,
  generateBLNumber,
  fillBLNumbers,
  deleteFile,
  parseAIResponse,
};
