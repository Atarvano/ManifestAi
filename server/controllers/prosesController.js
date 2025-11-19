const { excelToCSV } = require("../utils/excelUtils");
const { callAI } = require("../utils/apiUtils");
const { enrichWithHSCodes } = require("../utils/aiClient");
const {
  loadFormatStandar,
  buildAIPrompt,
  fillBLNumbers,
  deleteFile,
  parseAIResponse,
} = require("../utils/fileUtils");

exports.proses = async (req, res) => {
  let uploadedFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded. Please upload an Excel file.",
      });
    }

    uploadedFilePath = req.file.path;

    const modelSource = req.body.modelSource || "groq";
    if (!["gemini", "groq"].includes(modelSource)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid modelSource. Use "groq" or "gemini".',
      });
    }

    console.log(`Processing file: ${req.file.originalname}`);
    console.log(`Using AI model: ${modelSource}`);

    const csvData = excelToCSV(uploadedFilePath);
    if (!csvData?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Excel file is empty or could not be converted.",
      });
    }

    const formatStandar = loadFormatStandar();
    const userInstruction = req.body.instruction || "";
    const prompt = buildAIPrompt(formatStandar, csvData, userInstruction);

    console.log("Calling AI API...");
    const aiResponse = await callAI(modelSource, prompt);

    let manifestData;
    try {
      manifestData = parseAIResponse(aiResponse);
    } catch (parseError) {
      console.error("AI Response:", aiResponse);
      return res.status(500).json({
        success: false,
        error: "AI response is not valid JSON",
        details: parseError.message,
        rawResponse: aiResponse.substring(0, 500),
      });
    }

    if (!Array.isArray(manifestData)) {
      return res.status(500).json({
        success: false,
        error: "AI response is not an array",
        response: manifestData,
      });
    }

    manifestData.sort((a, b) => {
      const itemA = parseInt(a.item_no) || 0;
      const itemB = parseInt(b.item_no) || 0;
      return itemA - itemB;
    });

    const blStartNumber = parseInt(req.body.blStartNumber) || 1;
    const blFormatTengah = req.body.blFormatTengah || "TWN/BLW";
    const blTahun = parseInt(req.body.blTahun) || new Date().getFullYear();

    manifestData = fillBLNumbers(manifestData, {
      startNumber: blStartNumber,
      formatTengah: blFormatTengah,
      tahun: blTahun,
    });

    manifestData = await enrichWithHSCodes(manifestData);

    deleteFile(uploadedFilePath);

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
    if (uploadedFilePath) deleteFile(uploadedFilePath);

    console.error("Error in proses controller:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
