const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

/**
 * POST /api/export-beacukai - Export manifest to Beacukai Excel format
 */
exports.exportBeacukai = async (req, res) => {
  try {
    const { manifestData, metadata = {} } = req.body;

    if (!manifestData || !Array.isArray(manifestData)) {
      return res.status(400).json({
        success: false,
        error: "Invalid manifest data - expected array",
      });
    }

    console.log(
      `🔵 [Beacukai] Creating Excel for ${manifestData.length} items...`
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ManifestPro";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet("BEACUKAI", {
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToHeight: 1,
        fitToWidth: 2,
      },
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.75,
        bottom: 0.75,
      },
    });

    // Title
    const titleRow = worksheet.addRow(["BERITA ACARA CUKAI (BEACUKAI)"]);
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: "center", vertical: "center" };
    worksheet.mergeCells(`A${titleRow.number}:K${titleRow.number}`);

    // Metadata rows
    const dateRow = worksheet.addRow([
      `Tanggal: ${new Date().toLocaleDateString("id-ID")}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    worksheet.mergeCells(`A${dateRow.number}:K${dateRow.number}`);

    // Empty row
    worksheet.addRow([]);

    // Column headers
    const headers = [
      "NO.",
      "TGHU",
      "DESKRIPSI BARANG",
      "QTY",
      "UNIT",
      "HARGA SATUAN",
      "JUMLAH",
      "ASAL NEGARA",
      "HS CODE",
      "BERAT (KG)",
      "KETERANGAN",
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    headerRow.alignment = {
      horizontal: "center",
      vertical: "center",
      wrapText: true,
    };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF366092" },
    };
    headerRow.height = 25;

    // Apply border to header
    headers.forEach((_, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    });

    // Set column widths
    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 12;
    worksheet.getColumn(3).width = 28;
    worksheet.getColumn(4).width = 8;
    worksheet.getColumn(5).width = 8;
    worksheet.getColumn(6).width = 14;
    worksheet.getColumn(7).width = 14;
    worksheet.getColumn(8).width = 12;
    worksheet.getColumn(9).width = 12;
    worksheet.getColumn(10).width = 12;
    worksheet.getColumn(11).width = 18;

    // Data rows
    const startRow = worksheet.rowCount + 1;
    manifestData.forEach((item, idx) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const total = quantity * unitPrice;
      const weight = parseFloat(item.weight) || 0;

      const row = worksheet.addRow([
        idx + 1,
        item.tghu || item.bl_number || "",
        item.description || "",
        quantity,
        item.unit || "PCS",
        unitPrice > 0 ? unitPrice : "",
        total > 0 ? total : "",
        item.country_of_origin || "INDONESIA",
        item.hs_code || "",
        weight,
        item.notes || "",
      ]);

      // Alignment
      row.getCell(1).alignment = { horizontal: "center", vertical: "center" };
      row.getCell(2).alignment = { horizontal: "center", vertical: "center" };
      row.getCell(3).alignment = {
        horizontal: "left",
        vertical: "center",
        wrapText: true,
      };
      row.getCell(4).alignment = { horizontal: "center", vertical: "center" };
      row.getCell(5).alignment = { horizontal: "center", vertical: "center" };
      row.getCell(6).alignment = { horizontal: "right", vertical: "center" };
      row.getCell(7).alignment = { horizontal: "right", vertical: "center" };
      row.getCell(8).alignment = { horizontal: "center", vertical: "center" };
      row.getCell(9).alignment = { horizontal: "center", vertical: "center" };
      row.getCell(10).alignment = { horizontal: "right", vertical: "center" };
      row.getCell(11).alignment = {
        horizontal: "left",
        vertical: "center",
        wrapText: true,
      };

      // Number format
      row.getCell(6).numFmt = "#,##0.00";
      row.getCell(7).numFmt = "#,##0.00";
      row.getCell(10).numFmt = "#,##0.000";

      // Border
      for (let col = 1; col <= 11; col++) {
        const cell = row.getCell(col);
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
      }

      row.height = 18;
    });

    // TOTAL row
    const totalRow = worksheet.addRow([
      "",
      "",
      "TOTAL",
      `=SUM(D${startRow}:D${startRow + manifestData.length - 1})`,
      "",
      "",
      `=SUM(G${startRow}:G${startRow + manifestData.length - 1})`,
      "",
      "",
      `=SUM(J${startRow}:J${startRow + manifestData.length - 1})`,
      "",
    ]);

    totalRow.font = { bold: true, size: 11 };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFCC" },
    };
    totalRow.getCell(4).numFmt = "0";
    totalRow.getCell(7).numFmt = "#,##0.00";
    totalRow.getCell(10).numFmt = "#,##0.000";

    // Border for total row
    for (let col = 1; col <= 11; col++) {
      const cell = totalRow.getCell(col);
      cell.border = {
        top: { style: "medium", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "medium", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    }

    // Empty row
    worksheet.addRow([]);

    // Signature section
    const sig1 = worksheet.addRow([
      "Dibuat oleh:",
      "",
      "",
      "",
      "",
      "",
      "Diperiksa oleh:",
      "",
      "",
      "",
      "Disetujui oleh:",
    ]);
    worksheet.mergeCells(`A${sig1.number}:B${sig1.number}`);
    worksheet.mergeCells(`G${sig1.number}:H${sig1.number}`);
    worksheet.mergeCells(`K${sig1.number}:K${sig1.number}`);

    // Empty lines for signature
    for (let i = 0; i < 3; i++) {
      worksheet.addRow([]);
    }

    const nameRow = worksheet.addRow([
      "___________________",
      "",
      "",
      "",
      "",
      "",
      "___________________",
      "",
      "",
      "",
      "___________________",
    ]);
    worksheet.mergeCells(`A${nameRow.number}:B${nameRow.number}`);
    worksheet.mergeCells(`G${nameRow.number}:H${nameRow.number}`);
    worksheet.mergeCells(`K${nameRow.number}:K${nameRow.number}`);

    // Generate file
    const filename = `Beacukai_${Date.now()}.xlsx`;
    const uploadDir = path.join(__dirname, "../../uploads");

    // Create uploads directory if not exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);

    await workbook.xlsx.writeFile(filepath);

    console.log(`✅ [Beacukai] Excel created: ${filename}`);

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error(`Download error: ${err.message}`);
      }
      // Delete file after download
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) console.error(`Delete error: ${unlinkErr.message}`);
      });
    });
  } catch (error) {
    console.error(`❌ [Beacukai] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
