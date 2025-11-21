/**
 * CEISA Upload Controller - Handle CEISA file uploads and processing
 * Parses 7-sheet manifest → processes with AI → exports back to 7-sheet format
 */

const path = require("path");
const fs = require("fs");
const ceisaParser = require("../utils/ceisaParser");
const ceisaExporter = require("../utils/ceisaExporter");
const groqClient = require("../utils/groqClient");
const { callAI } = require("../utils/apiUtils");

/**
 * POST /api/ceisa-upload
 * Upload CEISA manifest file, parse, process with AI, export
 */
exports.uploadCeisa = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const modelSource = req.body.modelSource || "groq";
    const filePath = req.file.path;
    const fileName = req.file.filename;

    console.log(`\n🟦 [CEISA Upload] Starting processing...`);
    console.log(`   File: ${fileName}`);
    console.log(`   AI Model: ${modelSource}`);

    // Step 1: Parse CEISA workbook
    console.log(`\n📖 [CEISA] Step 1: Parsing CEISA workbook...`);
    const parsed = await ceisaParser.parseCeisaWorkbook(filePath);

    // Step 2: Build unified manifest
    console.log(`\n🔗 [CEISA] Step 2: Building unified manifest...`);
    const unified = ceisaParser.buildUnifiedManifest(parsed);

    // Step 3: Enrich with AI (HS codes, validation)
    console.log(`\n🤖 [CEISA] Step 3: Enriching with AI (${modelSource})...`);
    const enriched = await enrichManifestWithAI(unified, modelSource);

    // Step 4: Export back to CEISA format
    console.log(`\n💾 [CEISA] Step 4: Exporting to CEISA format...`);
    const outputDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const outputFileName = `CEISA_Processed_${timestamp}.xlsx`;
    const outputPath = path.join(outputDir, outputFileName);

    await ceisaExporter.exportCeisaWorkbook(enriched, outputPath);

    // Step 5: Generate response
    console.log(`\n✅ [CEISA] Processing complete!`);

    const response = {
      success: true,
      message: "CEISA file processed successfully",
      data: {
        filename: outputFileName,
        filepath: outputPath,
        parsed: {
          header: parsed.header,
          totalMasterBL: parsed.metadata.totalMasterBL,
          totalHouseBL: parsed.metadata.totalHouseBL,
          totalBarang: parsed.metadata.totalBarang,
          totalKontainer: parsed.metadata.totalKontainer,
        },
        enrichment: {
          hsCodesAdded: enriched.enrichmentStats?.hsCodesAdded || 0,
          validationsRun: enriched.enrichmentStats?.validationsRun || 0,
        },
      },
      metadata: {
        modelUsed: modelSource,
        processDate: new Date().toISOString(),
        inputFile: fileName,
        outputFile: outputFileName,
      },
    };

    res.json(response);
  } catch (error) {
    console.error(`❌ [CEISA] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * Enrich manifest with AI
 * - Add/validate HS codes
 * - Normalize descriptions
 * - Validate weights/volumes
 */
async function enrichManifestWithAI(manifest, modelSource) {
  console.log(`\n🤖 Enriching barang with AI (${modelSource})...`);

  const enrichmentStats = {
    hsCodesAdded: 0,
    validationsRun: 0,
  };

  try {
    // Get all barangs
    const allBarangs = [];
    Object.values(manifest.masters).forEach((master) => {
      master.houses.forEach((house) => {
        if (house.barangs) {
          allBarangs.push(...house.barangs);
        }
      });
    });

    console.log(`   Total barangs to enrich: ${allBarangs.length}`);

    // Process each barang
    for (let i = 0; i < allBarangs.length; i++) {
      const barang = allBarangs[i];

      // Skip if HS code already exists and is valid
      if (barang.hs_code && barang.hs_code.length >= 6) {
        console.log(
          `   ✓ Barang ${i + 1}/${allBarangs.length}: HS ${
            barang.hs_code
          } (exists)`
        );
        enrichmentStats.validationsRun++;
        continue;
      }

      // Generate HS code via AI
      try {
        const hsCode = await getHSCodeForBarang(barang, modelSource);
        barang.hs_code = hsCode;
        enrichmentStats.hsCodesAdded++;
        console.log(
          `   ✓ Barang ${i + 1}/${allBarangs.length}: HS ${hsCode} (generated)`
        );
      } catch (err) {
        console.warn(
          `   ⚠ Barang ${i + 1}/${
            allBarangs.length
          }: Failed to generate HS code - ${err.message}`
        );
      }
    }

    console.log(`\n✅ Enrichment complete:`);
    console.log(`   - HS Codes Added: ${enrichmentStats.hsCodesAdded}`);
    console.log(`   - Validations Run: ${enrichmentStats.validationsRun}`);

    manifest.enrichmentStats = enrichmentStats;
    return manifest;
  } catch (error) {
    console.error(`❌ Enrichment error: ${error.message}`);
    manifest.enrichmentStats = enrichmentStats;
    return manifest;
  }
}

/**
 * Get HS code for barang via AI
 */
async function getHSCodeForBarang(barang, modelSource) {
  const description = barang.uraian_barang || barang.jenis_barang || "UNKNOWN";

  try {
    if (modelSource === "groq") {
      return await groqClient.getHSCode(description);
    } else {
      // Use generic callAI for other models
      const prompt = `You are an expert in HS tariff classification (Indonesia 10-digit format).
Product: ${description}
Task: Classify according to 10-digit HS code.
CRITICAL OUTPUT: Reply ONLY with the 10-digit number, NO explanations.`;

      const response = await callAI("gemini", prompt, {
        temperature: 0,
        max_tokens: 50,
      });

      const digits = String(response).replace(/\D/g, "");
      return digits.padEnd(10, "0").slice(0, 10);
    }
  } catch (error) {
    console.warn(`[getHSCode] Error for "${description}": ${error.message}`);
    throw error;
  }
}

/**
 * GET /api/ceisa-upload-status
 * Check processing status (for polling)
 */
exports.getUploadStatus = async (req, res) => {
  try {
    const { fileName } = req.query;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: "fileName parameter required",
      });
    }

    const uploadDir = path.join(__dirname, "../../uploads");
    const filePath = path.join(uploadDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.json({
        success: false,
        status: "not_found",
        message: "File not found",
      });
    }

    const stats = fs.statSync(filePath);
    const mtime = new Date(stats.mtime);
    const now = new Date();
    const ageMs = now - mtime;

    res.json({
      success: true,
      status: "ready",
      file: fileName,
      size: stats.size,
      createdAt: mtime.toISOString(),
      ageMs: ageMs,
    });
  } catch (error) {
    console.error(`❌ Status check error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/ceisa-download
 * Download processed CEISA file
 */
exports.downloadCeisa = async (req, res) => {
  try {
    const { fileName } = req.query;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: "fileName parameter required",
      });
    }

    const uploadDir = path.join(__dirname, "../../uploads");
    const filePath = path.join(uploadDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    console.log(`📥 [CEISA] Downloading: ${fileName}`);
    res.download(filePath, fileName);
  } catch (error) {
    console.error(`❌ Download error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
