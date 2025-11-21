const express = require("express");
const router = express.Router();

const prosesController = require("../controllers/prosesController");
const pdfController = require("../controllers/pdfController");
const zipController = require("../controllers/zipController");
const ceisaController = require("../controllers/ceisaController");

router.post("/proses", (req, res, next) => {
  const upload = req.app.locals.upload;
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
    prosesController.proses(req, res);
  });
});

router.post("/generate-pdf", pdfController.generatePdf);
router.post("/generate-zip", zipController.generateZip);
router.post("/generate-excel", zipController.generateExcel);

router.post("/generate-ceisa", (req, res) => {
  const upload = req.app.locals.upload;
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    ceisaController.generateCEISA(req, res);
  });
});

router.post("/generate-ceisa-json", ceisaController.generateCEISAFromJson);

module.exports = router;
