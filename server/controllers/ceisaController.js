const path = require("path");
const fs = require("fs");
const { excelToJSON } = require("../utils/excelUtils");
const { mapToCEISA } = require("../utils/ceisaUtils");
const { generateCEISAExcel } = require("../utils/ceisaExcel");

exports.generateCEISA = async (req, res) => {
  let uploadedFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    uploadedFilePath = req.file.path;
    
    // 1. Parse Raw Excel
    const rawData = excelToJSON(uploadedFilePath);
    
    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ success: false, error: "Excel file is empty" });
    }

    // 2. Map to CEISA Structure
    // Extract metadata from request body
    const metadata = {
      nomorAju: req.body.nomorAju,
      npwp: req.body.npwp,
      saranaAngkut: req.body.saranaAngkut,
      callSign: req.body.callSign,
      noImo: req.body.noImo,
      mmsi: req.body.mmsi,
      negara: req.body.negara,
      kdGudang: req.body.kdGudang,
      kppbc: req.body.kppbc
    };

    const ceisaData = mapToCEISA(rawData, metadata);

    // 3. Generate Excel
    const timestamp = Date.now();
    const outputFileName = `CEISA_Manifest_${timestamp}.xlsx`;
    const outputDir = path.join(__dirname, "../../public/downloads");
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, outputFileName);
    await generateCEISAExcel(ceisaData, outputPath);

    // 4. Return Download Link
    const downloadUrl = `/downloads/${outputFileName}`;
    
    // Cleanup uploaded file
    if (fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }

    return res.json({
      success: true,
      message: "CEISA Manifest generated successfully",
      downloadUrl: downloadUrl,
      data: ceisaData // Optional: return preview data
    });

  } catch (error) {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }
    console.error("Error generating CEISA:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.generateCEISAFromJson = async (req, res) => {
  console.log("Received CEISA JSON generation request");
  try {
    const { manifestData, metadata } = req.body;
    console.log("Payload size:", JSON.stringify(req.body).length);
    console.log("Manifest items:", manifestData ? manifestData.length : 0);

    if (!manifestData || !Array.isArray(manifestData)) {
      console.error("Invalid manifest data received");
      return res.status(400).json({ success: false, error: "Invalid manifest data" });
    }

    // Map to CEISA Structure
    const ceisaData = mapToCEISA(manifestData, metadata);

    // Generate Excel
    const timestamp = Date.now();
    const outputFileName = `CEISA_Manifest_${timestamp}.xlsx`;
    const outputDir = path.join(__dirname, "../../public/downloads");
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, outputFileName);
    await generateCEISAExcel(ceisaData, outputPath);

    // Return Download Link
    const downloadUrl = `/downloads/${outputFileName}`;

    return res.json({
      success: true,
      message: "CEISA Manifest generated successfully",
      downloadUrl: downloadUrl
    });

  } catch (error) {
    console.error("Error generating CEISA from JSON:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
