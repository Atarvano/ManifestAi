// Controller untuk endpoint /api/proses
const { excelToCSV } = require("../utils/excelUtils");
const { callAI } = require("../utils/apiUtils");
const {
  loadFormatStandar,
  buildAIPrompt,
  fillBLNumbers,
  deleteFile,
  parseAIResponse,
} = require("../utils/fileUtils");

/**
 * POST /api/proses
 * Process Excel file and normalize data using AI
 */
exports.proses = async (req, res) => {
  let uploadedFilePath = null;

  try {
    // 1. Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded. Please upload an Excel file.",
      });
    }

    uploadedFilePath = req.file.path;

    // 2. Validate model source
    const modelSource = req.body.modelSource || "gemini";
    if (!["gemini", "deepseek"].includes(modelSource)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid modelSource. Use "gemini" or "deepseek".',
      });
    }

    console.log(`Processing file: ${req.file.originalname}`);
    console.log(`Using AI model: ${modelSource}`);

    // 3. Convert Excel to CSV
    const csvData = excelToCSV(uploadedFilePath);
    if (!csvData || csvData.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Excel file is empty or could not be converted.",
      });
    }

    // 4. Load format_standar.json
    const formatStandar = loadFormatStandar();

    // 5. Get user instruction (optional)
    const userInstruction = req.body.instruction || "";

    // 6. Build AI prompt
    const prompt = buildAIPrompt(formatStandar, csvData, userInstruction);

    // 7. Call AI API based on model source
    console.log("Calling AI API...");
    const aiResponse = await callAI(modelSource, prompt);

    // 8. Parse AI response to JSON
    let manifestData;
    try {
      manifestData = parseAIResponse(aiResponse);
    } catch (parseError) {
      console.error("AI Response:", aiResponse);
      return res.status(500).json({
        success: false,
        error: "AI response is not valid JSON",
        details: parseError.message,
        rawResponse: aiResponse.substring(0, 500), // First 500 chars for debugging
      });
    }

    // 9. Validate that response is an array
    if (!Array.isArray(manifestData)) {
      return res.status(500).json({
        success: false,
        error: "AI response is not an array",
        response: manifestData,
      });
    }

    // 10. Sort by item_no
    manifestData.sort((a, b) => {
      const itemA = parseInt(a.item_no) || 0;
      const itemB = parseInt(b.item_no) || 0;
      return itemA - itemB;
    });

    // 11. Fill missing B/L numbers with custom format
    const blStartNumber = parseInt(req.body.blStartNumber) || 1;
    const blFormatTengah = req.body.blFormatTengah || "TWN/BLW";
    const blTahun = parseInt(req.body.blTahun) || new Date().getFullYear();

    manifestData = fillBLNumbers(manifestData, {
      startNumber: blStartNumber,
      formatTengah: blFormatTengah,
      tahun: blTahun,
    });

    // 12. Clean up uploaded file
    deleteFile(uploadedFilePath);

    // 13. Return success response
    return res.json({
      success: true,
      message: "File processed successfully",
      data: manifestData,
      metadata: {
        totalItems: manifestData.length,
        modelUsed: modelSource,
        filename: req.file.originalname,
      },
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (uploadedFilePath) {
      deleteFile(uploadedFilePath);
    }

    console.error("Error in proses controller:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
