const express = require("express");
const router = express.Router();

// Import controllers
const prosesController = require("../controllers/prosesController");
const pdfController = require("../controllers/pdfController");
const zipController = require("../controllers/zipController");
const beacukaiController = require("../controllers/beacukaiController");
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

// POST /api/export-beacukai - Export to Beacukai format
router.post("/export-beacukai", beacukaiController.exportBeacukai);

// POST /api/export-ceisa - Export to CEISA Excel format
router.post("/export-ceisa", ceisaController.exportCeisa);

// GET /api/ceisa-template - Get CEISA template
router.get("/ceisa-template", ceisaController.getCeisaTemplate);

module.exports = router;
