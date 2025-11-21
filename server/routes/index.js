const express = require("express");
const router = express.Router();

// Import controllers
const prosesController = require("../controllers/prosesController");
const pdfController = require("../controllers/pdfController");
const zipController = require("../controllers/zipController");
const ceisaController = require("../controllers/ceisaController");

// Routes
// POST /api/proses - Process Excel file with AI normalization
router.post("/proses", (req, res, next) => {
  // Get multer upload middleware from app.locals
  const upload = req.app.locals.upload;

  // Use multer middleware to handle single file upload
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
    // Pass to controller
    prosesController.proses(req, res);
  });
});

// POST /api/generate-pdf
router.post("/generate-pdf", pdfController.generatePdf);

// POST /api/generate-zip
router.post("/generate-zip", zipController.generateZip);

// POST /api/generate-excel - Generate single Excel file
router.post("/generate-excel", zipController.generateExcel);

// POST /api/generate-ceisa - Generate CEISA Manifest
router.post("/generate-ceisa", (req, res) => {
  const upload = req.app.locals.upload;
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    ceisaController.generateCEISA(req, res);
  });
});

// POST /api/generate-ceisa-json - Generate CEISA Manifest from JSON
router.post("/generate-ceisa-json", ceisaController.generateCEISAFromJson);

module.exports = router;
