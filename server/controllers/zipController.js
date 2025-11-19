const archiver = require("archiver");
const ExcelJS = require("exceljs");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { enrichWithHSCodes } = require("../utils/aiClient"); // Universal AI client

/**
 * POST /api/generate-zip - Production ready
 */
exports.generateZip = async (req, res) => {
  let browser = null;

  try {
    console.log("📦 Starting ZIP generation...");

    const { manifestData, includePDFs = false } = req.body;

    // Validation
    if (!manifestData || typeof manifestData !== "object") {
      return res.status(400).json({
        success: false,
        error: "Missing required field: manifestData",
      });
    }

    const groupedData = manifestData.groupedData || manifestData;
    const metadata = manifestData.metadata || {};

    console.log(`📋 Processing ${Object.keys(groupedData).length} B/L groups`);

    // Prepare all manifest data and filter out items without B/L numbers
    const allItems = [];
    Object.values(groupedData).forEach((items) => {
      items.forEach((item) => {
        // Skip items without B/L number (null, undefined, empty string)
        if (item.bl_number && item.bl_number.trim() !== "") {
          allItems.push(item);
        }
      });
    });

    console.log(`📊 Total items with B/L numbers: ${allItems.length}`);

    // Enrich all items with HS Codes once
    console.log(`🤖 Enriching ${allItems.length} items with HS Codes...`);
    const enrichedItems = await enrichWithHSCodes(allItems);
    console.log(`✅ HS Code enrichment complete`);

    // Create ZIP archive
    const archive = archiver("zip", { zlib: { level: 9 } });

    // Set response headers
    const timestamp = new Date().toISOString().slice(0, 10);
    const zipFilename = `Manifest_Complete_${timestamp}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${zipFilename}"`
    );

    // Pipe archive to response
    archive.pipe(res);

    // 1. Generate Laporan_Bagus.xlsx (styled Excel)
    console.log("📄 Creating Laporan_Bagus.xlsx...");
    const styledExcelBuffer = await createStyledExcel(enrichedItems, metadata);
    archive.append(styledExcelBuffer, { name: "Laporan_Bagus.xlsx" });

    // 2. Generate Data_BeaCukai.xlsx (raw data)
    console.log("📄 Creating Data_BeaCukai.xlsx...");
    const rawExcelBuffer = await createRawExcel(enrichedItems, metadata);
    archive.append(rawExcelBuffer, { name: "Data_BeaCukai.xlsx" });

    // 3. Generate PDFs per B/L (if requested)
    if (includePDFs) {
      console.log("📄 Generating PDFs for each B/L...");
      browser = await puppeteer.launch({
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      });

      for (const [blNumber, items] of Object.entries(groupedData)) {
        try {
          console.log(`📄 Generating PDF for B/L: ${blNumber}`);
          const pdfBuffer = await generatePDFBuffer(browser, blNumber, items);
          const safeBLName = blNumber.replace(/[\/\\?%*:|"<>]/g, "_");
          archive.append(pdfBuffer, {
            name: `PDFs/Manifest_${safeBLName}.pdf`,
          });
        } catch (pdfError) {
          console.error(
            `❌ Error generating PDF for ${blNumber}:`,
            pdfError.message
          );
          // Continue with other PDFs
        }
      }
    }

    // 4. Add summary report
    console.log("📄 Creating summary report...");
    const summaryBuffer = await createSummaryReport(groupedData, metadata);
    archive.append(summaryBuffer, { name: "Summary_Report.txt" });

    // Finalize the archive
    console.log("📦 Finalizing ZIP archive...");
    await archive.finalize();

    console.log("✅ ZIP generation completed successfully");
  } catch (error) {
    console.error("❌ Error generating ZIP:", error);

    // Close browser if still open
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
    }

    // Clean up temp files
    await cleanupTempFiles(tempFiles);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
};

/**
 * Create styled Excel report - PT. ALEXINDO YAKIN PRIMA Format
 */
async function createStyledExcel(enrichedItems, metadata) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PT. ALEXINDO YAKIN PRIMA";
  workbook.lastModifiedBy = "ManifestPro AI";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("MANIFEST", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  // Company Header - PT. ALEXINDO YAKIN PRIMA
  worksheet.mergeCells("A1:D1");
  const companyCell = worksheet.getCell("A1");
  companyCell.value = "PT. ALEXINDO YAKIN PRIMA";
  companyCell.font = {
    name: "Arial",
    size: 11,
    bold: true,
  };
  companyCell.alignment = {
    vertical: "middle",
    horizontal: "left",
  };

  // Perusahaan Pelayaran Nasional subtitle
  worksheet.mergeCells("A2:D2");
  const subtitleCell = worksheet.getCell("A2");
  subtitleCell.value = "Perusahaan Pelayaran Nasional";
  subtitleCell.font = {
    name: "Arial",
    size: 9,
    bold: false,
  };
  subtitleCell.alignment = {
    vertical: "middle",
    horizontal: "left",
  };

  // MANIFEST OF CARGO Title
  worksheet.mergeCells("A4:M4");
  const manifestCell = worksheet.getCell("A4");
  manifestCell.value = "MANIFEST OF CARGO";
  manifestCell.font = {
    name: "Arial",
    size: 14,
    bold: true,
  };
  manifestCell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  // Shipping Details Row (Row 5)
  const detailsRow = 5;

  // Left section - SHIPPED PER
  worksheet.getCell(`A${detailsRow}`).value = "SHIPPED PER :";
  worksheet.getCell(`A${detailsRow}`).font = { bold: true, size: 9 };
  worksheet.getCell(`B${detailsRow}`).value =
    metadata?.shipName || "KM. SUMBER ABADI 178";
  worksheet.getCell(`B${detailsRow}`).font = { bold: true, size: 9 };

  // Voy section
  worksheet.getCell(`C${detailsRow}`).value = "* Voy :";
  worksheet.getCell(`C${detailsRow}`).font = { bold: true, size: 9 };
  worksheet.getCell(`D${detailsRow}`).value = metadata?.voyage || "SA16JB-25";
  worksheet.getCell(`D${detailsRow}`).font = { bold: true, size: 9 };

  // Right section - NATIONALITY
  worksheet.getCell(`J${detailsRow}`).value = "NATIONALITY :";
  worksheet.getCell(`J${detailsRow}`).font = { bold: true, size: 9 };
  worksheet.getCell(`K${detailsRow}`).value = `"${
    metadata?.nationality || "INDONESIA"
  }"`;
  worksheet.getCell(`K${detailsRow}`).font = { bold: true, size: 9 };

  // MASTER
  worksheet.getCell(`L${detailsRow}`).value = "MASTER:";
  worksheet.getCell(`L${detailsRow}`).font = { bold: true, size: 9 };
  worksheet.getCell(`M${detailsRow}`).value =
    metadata?.masterName || "IVAN PRI HARYANTO";
  worksheet.getCell(`M${detailsRow}`).font = { bold: true, size: 9 };

  // Row 6 - FROM and TO info
  const fromToRow = 6;
  worksheet.getCell(`A${fromToRow}`).value = "FROM :";
  worksheet.getCell(`A${fromToRow}`).font = { bold: true, size: 9 };
  worksheet.mergeCells(`B${fromToRow}:E${fromToRow}`);
  worksheet.getCell(`B${fromToRow}`).value =
    metadata?.cargoFrom || "SUNDA KELAPA - JAKARTA";
  worksheet.getCell(`B${fromToRow}`).font = { size: 9 };

  worksheet.getCell(`J${fromToRow}`).value = "TO:";
  worksheet.getCell(`J${fromToRow}`).font = { bold: true, size: 9 };
  worksheet.getCell(`K${fromToRow}`).value =
    metadata?.cargoTo || "BATU AMPAR - BATAM";
  worksheet.getCell(`K${fromToRow}`).font = { size: 9 };

  worksheet.getCell(`L${fromToRow}`).value = "SAILING ON:";
  worksheet.getCell(`L${fromToRow}`).font = { bold: true, size: 9 };
  worksheet.getCell(`M${fromToRow}`).value =
    metadata?.sailedDate || "08 NOYEMBER 2025";
  worksheet.getCell(`M${fromToRow}`).font = { size: 9 };

  // Table Headers (Row 7-8: Two-row header style)
  const headerRow = 7;
  const headers = [
    "B/L\nNO.",
    "HS\nCODE",
    "MARK AND\nNUMBERS",
    "SEAL\nNO.",
    "DESCRIPTION OF GOODS",
    "WEIGHT",
    "SHIPPER",
    "ADDRESS",
    "CONSIGNEE",
    "ADDRESS",
    "NO. IDENTITAS\nCONSIGNEE",
    "NOTIFY PARTY\nCONSIGNEE",
    "ADDRESS",
  ];

  headers.forEach((header, index) => {
    const cell = worksheet.getCell(headerRow, index + 1);
    cell.value = header;
    cell.font = {
      bold: true,
      color: { argb: "FF000000" },
      size: 8,
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" }, // Light gray background
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });

  // Data rows with PT. ALEXINDO format (starting from row 8, removed hardcoded "1 Unit" row)
  const dataStartRow = 8;
  enrichedItems.forEach((item, index) => {
    const row = dataStartRow + index;
    const weightKg = item.weight ? parseFloat(item.weight).toFixed(3) : "0.000";

    const rowData = [
      item.bl_number || "",
      item.hs_code || "", // HS Code from Gemini AI
      item.marks || item.container_number || "",
      item.seal_number || item.container_number || "",
      item.description || "",
      weightKg,
      item.shipper || item.exporter || "",
      item.shipper_address || "",
      item.consignee || item.importer || "",
      item.consignee_address || "",
      item.identity_number || item.npwp || "",
      item.notify_party || item.consignee || item.importer || "",
      item.notify_address || item.consignee_address || "",
    ];

    rowData.forEach((value, colIndex) => {
      const cell = worksheet.getCell(row, colIndex + 1);
      cell.value = value;

      // Standard border styling
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };

      // Alignment for PT. ALEXINDO format (13 columns)
      if (
        colIndex === 0 ||
        colIndex === 1 ||
        colIndex === 3 ||
        colIndex === 5 ||
        colIndex === 10
      ) {
        // BL, HS Code, Seal No, Weight, Identity Number - center align
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        // Others - left align with wrap text for addresses and descriptions
        cell.alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true,
        };
      }

      cell.font = { size: 8 };
    });
  });

  // Set column widths for PT. ALEXINDO YAKIN PRIMA format (13 columns)
  const columnWidths = [8, 8, 12, 8, 28, 10, 15, 18, 15, 18, 12, 15, 18];
  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  // TOTAL row
  const totalRow = dataStartRow + enrichedItems.length;
  worksheet.mergeCells(`A${totalRow}:E${totalRow}`);
  const totalCell = worksheet.getCell(`A${totalRow}`);
  totalCell.value = "TOTAL";
  totalCell.font = { bold: true, size: 10 };
  totalCell.alignment = { horizontal: "center", vertical: "middle" };
  totalCell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  // Total calculations
  const totalWeight = enrichedItems.reduce(
    (sum, item) => sum + (parseFloat(item.weight) || 0),
    0
  );

  worksheet.getCell(`F${totalRow}`).value = `${totalWeight.toFixed(3)}`;

  // Style total weight cell
  const totalWeightCell = worksheet.getCell(`F${totalRow}`);
  totalWeightCell.font = { bold: true, size: 10 };
  totalWeightCell.alignment = { horizontal: "center", vertical: "middle" };
  totalWeightCell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  // Style remaining empty total row cells (G to M)
  for (let col = 7; col <= 13; col++) {
    const cell = worksheet.getCell(totalRow, col);
    cell.value = "";
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  }

  // Keterangan section
  const keteranganRow = totalRow + 3;
  worksheet.getCell(`A${keteranganRow}`).value = "Keterangan :";
  worksheet.getCell(`A${keteranganRow}`).font = { bold: true, size: 10 };

  worksheet.getCell(`A${keteranganRow + 2}`).value =
    "• Daftar muatan ini berdasarkan Berita Acara / Penimbangan barang";
  worksheet.getCell(`A${keteranganRow + 3}`).value =
    "  yang dimuat kedalam kapal / tongkang";
  worksheet.getCell(`A${keteranganRow + 4}`).value =
    "• Penyimpanan jumlah barang seperti yang tercantum dalam daftar muatan";
  worksheet.getCell(`A${keteranganRow + 5}`).value =
    "  ini tanggung jawab pemilik barang.";

  // Style keterangan
  for (let i = 2; i <= 5; i++) {
    worksheet.getCell(`A${keteranganRow + i}`).font = { size: 9 };
    worksheet.getCell(`A${keteranganRow + i}`).alignment = { wrapText: true };
  }

  return await workbook.xlsx.writeBuffer();
}

/**
 * Create raw Excel data (Data_BeaCukai.xlsx)
 */
async function createRawExcel(enrichedItems, metadata) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data Manifest");

  // Simple headers
  const headers = [
    "item_no",
    "description",
    "hs_code",
    "quantity",
    "unit",
    "unit_price",
    "total_price",
    "weight",
    "volume",
    "country_of_origin",
    "bl_number",
  ];

  // Add headers
  worksheet.addRow(headers);

  // Add data rows
  enrichedItems.forEach((item) => {
    const row = headers.map((header) => item[header] || "");
    worksheet.addRow(row);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value ? cell.value.toString().length : 0;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });
    column.width = Math.min(maxLength + 2, 50);
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Generate PDF buffer using Puppeteer
 */
async function generatePDFBuffer(browser, blNumber, items) {
  // Calculate totals
  const totals = items.reduce(
    (acc, item) => {
      acc.weight += parseFloat(item.weight) || 0;
      acc.volume += parseFloat(item.volume) || 0;
      acc.value += parseFloat(item.total_price) || 0;
      return acc;
    },
    { weight: 0, volume: 0, value: 0 }
  );

  // Prepare template data
  const templateData = {
    blNumber: blNumber,
    companyName: "MANIFES PROJECT",
    companyAddress: "Jl. Pelabuhan Raya No. 123, Jakarta 14470, Indonesia",
    companyPhone: "+62-21-1234567",
    companyEmail: "info@manifesproject.com",
    generatedDate: new Date().toLocaleDateString("id-ID"),
    generatedDateTime: new Date().toLocaleString("id-ID"),
    processedDate: new Date().toLocaleDateString("id-ID"),
    totalItems: items.length,
    totalWeight: formatNumber(totals.weight),
    totalVolume: formatNumber(totals.volume),
    totalValue: formatCurrency(totals.value),
    items: items.map((item) => ({
      ...item,
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || 0,
      weight: item.weight || 0,
      volume: item.volume || 0,
    })),
  };

  // Read and render template
  const templatePath = path.join(__dirname, "../templates/bl_template.html");
  let htmlTemplate = await fs.readFile(templatePath, "utf8");
  htmlTemplate = renderTemplate(htmlTemplate, templateData);

  const page = await browser.newPage();
  await page.setContent(htmlTemplate, {
    waitUntil: "networkidle0",
    timeout: 30000,
  });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "1cm",
      bottom: "1cm",
      left: "1cm",
      right: "1cm",
    },
  });

  await page.close();
  return pdfBuffer;
}

/**
 * Create summary report
 */
async function createSummaryReport(groupedData, metadata) {
  const timestamp = new Date().toLocaleString("id-ID");
  const totalBLs = Object.keys(groupedData).length;
  const totalItems = Object.values(groupedData).reduce(
    (sum, items) => sum + items.length,
    0
  );

  let report = `📋 MANIFEST SUMMARY REPORT
=====================================

📅 Generated: ${timestamp}
📁 Original File: ${metadata?.filename || "Unknown"}
🤖 AI Model Used: ${metadata?.modelUsed?.toUpperCase() || "Unknown"}

📊 STATISTICS:
- Total B/L Numbers: ${totalBLs}
- Total Items: ${totalItems}

📦 B/L BREAKDOWN:
`;

  Object.entries(groupedData).forEach(([blNumber, items]) => {
    const totalWeight = items.reduce(
      (sum, item) => sum + (parseFloat(item.weight) || 0),
      0
    );
    const totalVolume = items.reduce(
      (sum, item) => sum + (parseFloat(item.volume) || 0),
      0
    );
    const totalValue = items.reduce(
      (sum, item) => sum + (parseFloat(item.total_price) || 0),
      0
    );

    report += `
📄 ${blNumber}:
   Items: ${items.length}
   Weight: ${totalWeight.toFixed(2)} kg
   Volume: ${totalVolume.toFixed(2)} m³
   Value: Rp${totalValue.toLocaleString("id-ID")}`;
  });

  report += `

📁 FILES IN THIS ZIP:
- Laporan_Bagus.xlsx (Styled Excel report)
- Data_BeaCukai.xlsx (Raw data for customs)
- PDFs/ (Individual B/L manifests)
- Summary_Report.txt (This file)

🏢 Generated by Manifes Project AI System
   Developed for Indonesian logistics automation
`;

  return Buffer.from(report, "utf8");
}

/**
 * Template renderer (reused from PDF controller)
 */
function renderTemplate(template, data) {
  let rendered = template;

  // Replace simple variables
  Object.keys(data).forEach((key) => {
    if (key !== "items") {
      const regex = new RegExp(`{{${key}}}`, "g");
      rendered = rendered.replace(regex, data[key] || "");
    }
  });

  // Handle items loop
  const itemsRegex = /{{#each items}}([\s\S]*?){{\/each}}/;
  const match = rendered.match(itemsRegex);

  if (match && data.items) {
    const itemTemplate = match[1];
    let itemsHtml = "";

    data.items.forEach((item) => {
      let itemHtml = itemTemplate;

      Object.keys(item).forEach((prop) => {
        const regex = new RegExp(`{{${prop}}}`, "g");
        itemHtml = itemHtml.replace(regex, item[prop] || "");
      });

      itemHtml = itemHtml.replace(
        /{{formatNumber\s+(\w+)}}/g,
        (match, prop) => {
          return formatNumber(item[prop]);
        }
      );

      itemHtml = itemHtml.replace(
        /{{formatCurrency\s+(\w+)}}/g,
        (match, prop) => {
          return formatCurrency(item[prop]);
        }
      );

      itemsHtml += itemHtml;
    });

    rendered = rendered.replace(itemsRegex, itemsHtml);
  }

  return rendered;
}

/**
 * Format utilities
 */
function formatNumber(num) {
  if (!num && num !== 0) return "-";
  return Number(num).toLocaleString("id-ID");
}

function formatCurrency(num) {
  if (!num && num !== 0) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Cleanup temp files
 */
async function cleanupTempFiles(files) {
  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch (error) {
      console.error(`Error deleting temp file ${file}:`, error.message);
    }
  }
}

/**
 * POST /api/generate-excel - Generate single Excel file with PT. Alam Raya format
 */
exports.generateExcel = async (req, res) => {
  try {
    console.log("📄 Starting Excel generation...");

    const { manifestData } = req.body;

    // Validation
    if (!manifestData || typeof manifestData !== "object") {
      return res.status(400).json({
        success: false,
        error: "Missing required field: manifestData",
      });
    }

    const groupedData = manifestData.groupedData || manifestData;
    const metadata = manifestData.metadata || {};

    // Prepare manifest items
    const allItems = [];
    Object.values(groupedData).forEach((items) => {
      allItems.push(...items);
    });

    console.log(
      `📊 Generating Excel for ${allItems.length} items from ${
        Object.keys(groupedData).length
      } B/L groups`
    );

    // Generate Excel
    const excelBuffer = await createStyledExcel(allItems, metadata);

    // Set response headers for Excel download
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Laporan_Bagus_${timestamp}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Send Excel file
    res.send(excelBuffer);

    console.log("✅ Excel generation completed successfully");
  } catch (error) {
    console.error("❌ Error generating Excel:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Failed to generate Excel file",
        details: error.message,
      });
    }
  }
};
