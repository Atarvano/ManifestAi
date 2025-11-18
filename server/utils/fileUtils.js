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

  let prompt = `Anda adalah asisten untuk membersihkan dan menstrukturkan data manifes kargo.

TUGAS ANDA:
1. Ambil data CSV mentah di bawah ini
2. Normalisasikan berdasarkan kolom standar yang diberikan
3. Ekstrak item_no dari urutan baris (jika tidak ada, buat berurutan dari 1)
4. Pastikan setiap kolom terisi sesuai standar (jika kosong, gunakan null atau string kosong)
5. Jika ada data gabungan (misalnya: nama + alamat + NPWP dalam satu kolom), pisahkan secara logis ke kolom yang sesuai
6. Bersihkan whitespace, karakter tidak valid, dan format data yang tidak konsisten
7. Hasil akhir wajib berupa JSON array yang valid
8. JANGAN menambahkan komentar, penjelasan, atau markdown formatting - HANYA JSON valid

KOLOM STANDAR:
${columnsList}

${userInstruction ? `INSTRUKSI TAMBAHAN USER:\n${userInstruction}\n` : ""}

DATA CSV MENTAH:
${csvData}

ATURAN OUTPUT:
- Response WAJIB berupa JSON array murni
- Setiap item adalah object dengan kolom standar di atas
- item_no harus berupa angka dan berurutan
- Jangan gunakan markdown code blocks atau formatting apapun
- Jangan tambahkan teks penjelasan
- Format angka dengan benar (quantity, price, weight, volume sebagai number)
- Format string dengan konsisten (trim whitespace)

CONTOH FORMAT OUTPUT:
[
  {
    "item_no": 1,
    "description": "Barang Contoh",
    "hs_code": "1234567890",
    "quantity": 100,
    "unit": "PCS",
    "unit_price": 50.00,
    "total_price": 5000.00,
    "weight": 250.5,
    "volume": 1.5,
    "country_of_origin": "Indonesia",
    "bl_number": null
  }
]

Output Anda (hanya JSON array):`;

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
