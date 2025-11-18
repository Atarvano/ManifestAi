const archiver = require("archiver");
const ExcelJS = require("exceljs");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

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

    // Prepare all manifest data
    const allItems = [];
    Object.values(groupedData).forEach((items) => {
      allItems.push(...items);
    });

    console.log(`📊 Total items: ${allItems.length}`);

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
    const styledExcelBuffer = await createStyledExcel(allItems, metadata);
    archive.append(styledExcelBuffer, { name: "Laporan_Bagus.xlsx" });

    // 2. Generate Data_BeaCukai.xlsx (raw data)
    console.log("📄 Creating Data_BeaCukai.xlsx...");
    const rawExcelBuffer = await createRawExcel(allItems, metadata);
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
 * Create styled Excel report (Laporan_Bagus.xlsx)
 */
async function createStyledExcel(allItems, metadata) {
  const workbook = new ExcelJS.Workbook();

  // Set workbook properties
  workbook.creator = "PT. Alam Raya Indonesia";
  workbook.lastModifiedBy = "Manifes Project";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("MANIFEST", {
    pageSetup: { paperSize: 9, orientation: "landscape" }, // A4 landscape
  });

  // Company Header - PT. Alam Raya Indonesia
  worksheet.mergeCells("A1:G4");
  const companyCell = worksheet.getCell("A1");
  companyCell.value =
    "PT. Alam Raya Indonesia\nBellagio Office Park\nQL2/50-52 Mega Kuningan\nJakarta 12950 - Indonesia\nPhone: +62 21 30455153 - 53\nFax: +62 21 30455154\nEmail: shipping@ptari.com / ho@ptari.com";
  companyCell.font = {
    name: "Arial",
    size: 10,
    bold: false,
  };
  companyCell.alignment = {
    vertical: "top",
    horizontal: "left",
    wrapText: true,
  };

  // Document Title
  worksheet.mergeCells("A6:G6");
  const titleCell1 = worksheet.getCell("A6");
  titleCell1.value = "PERUSAHAAN PELAYARAN";
  titleCell1.font = {
    name: "Arial",
    size: 12,
    bold: true,
  };
  titleCell1.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  worksheet.mergeCells("A7:G7");
  const titleCell2 = worksheet.getCell("A7");
  titleCell2.value = "PT. ALAM RAYA INDONESIA";
  titleCell2.font = {
    name: "Arial",
    size: 14,
    bold: true,
  };
  titleCell2.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  worksheet.mergeCells("A8:G8");
  const manifestCell = worksheet.getCell("A8");
  manifestCell.value = "MANIFEST";
  manifestCell.font = {
    name: "Arial",
    size: 16,
    bold: true,
    underline: true,
  };
  manifestCell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  // Ship Details Section (Left Side)
  const detailsRow = 10;
  worksheet.getCell(`A${detailsRow}`).value = "Name of ship";
  worksheet.getCell(`B${detailsRow}`).value = ":";
  worksheet.getCell(`C${detailsRow}`).value = metadata?.shipName || "";

  worksheet.getCell(`A${detailsRow + 1}`).value = "Master of Ship";
  worksheet.getCell(`B${detailsRow + 1}`).value = ":";
  worksheet.getCell(`C${detailsRow + 1}`).value = metadata?.masterName || "";

  worksheet.getCell(`A${detailsRow + 2}`).value = "Sailed On";
  worksheet.getCell(`B${detailsRow + 2}`).value = ":";
  worksheet.getCell(`C${detailsRow + 2}`).value =
    metadata?.sailedDate || new Date().toLocaleDateString("id-ID");

  // Cargo Details Section (Right Side)
  worksheet.getCell(`E${detailsRow}`).value = "Cargo Shipped From";
  worksheet.getCell(`F${detailsRow}`).value = ":";
  worksheet.getCell(`G${detailsRow}`).value = metadata?.cargoFrom || "";

  worksheet.getCell(`E${detailsRow + 1}`).value = "Cargo Shipped To";
  worksheet.getCell(`F${detailsRow + 1}`).value = ":";
  worksheet.getCell(`G${detailsRow + 1}`).value = metadata?.cargoTo || "";

  worksheet.getCell(`E${detailsRow + 2}`).value = "Nationality";
  worksheet.getCell(`F${detailsRow + 2}`).value = ":";
  worksheet.getCell(`G${detailsRow + 2}`).value =
    metadata?.nationality || "Indonesia";

  // Style the detail labels
  for (let i = 0; i < 3; i++) {
    worksheet.getCell(`A${detailsRow + i}`).font = { bold: true, size: 10 };
    worksheet.getCell(`E${detailsRow + i}`).font = { bold: true, size: 10 };
  }

  // Table Headers (Standard Manifest Format)
  const headerRow = detailsRow + 5;
  const headers = [
    "BL No.",
    "Description Of Goods",
    "Shipper",
    "Consignee",
    "Collies",
    "Weight (Ton / M³)",
    "Remarks",
  ];

  headers.forEach((header, index) => {
    const cell = worksheet.getCell(headerRow, index + 1);
    cell.value = header;
    cell.font = {
      bold: true,
      color: { argb: "FF000000" },
      size: 11,
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF000000" } },
      left: { style: "medium", color: { argb: "FF000000" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      right: { style: "medium", color: { argb: "FF000000" } },
    };
  });

  // Data rows with standard manifest format
  allItems.forEach((item, index) => {
    const row = headerRow + 1 + index;
    const weightTon = item.weight
      ? (parseFloat(item.weight) / 1000).toFixed(3)
      : "0.000";
    const volumeM3 = item.volume ? parseFloat(item.volume).toFixed(3) : "0.000";

    const rowData = [
      item.bl_number || "",
      item.description || "",
      item.shipper || item.exporter || "",
      item.consignee || item.importer || "",
      item.quantity || "",
      `${weightTon} T / ${volumeM3} M³`,
      item.remarks || "",
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

      // Alignment
      if (colIndex === 0 || colIndex === 4) {
        // BL No. and Collies - center align
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colIndex === 5) {
        // Weight - center align
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        // Others - left align
        cell.alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true,
        };
      }

      cell.font = { size: 10 };
    });
  });

  // Set column widths for standard manifest format
  const columnWidths = [12, 30, 20, 20, 8, 15, 15];
  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  // TOTAL row
  const totalRow = headerRow + allItems.length + 1;
  worksheet.mergeCells(`A${totalRow}:D${totalRow}`);
  const totalCell = worksheet.getCell(`A${totalRow}`);
  totalCell.value = "TOTAL";
  totalCell.font = { bold: true, size: 11 };
  totalCell.alignment = { horizontal: "center", vertical: "middle" };
  totalCell.border = {
    top: { style: "medium", color: { argb: "FF000000" } },
    left: { style: "medium", color: { argb: "FF000000" } },
    bottom: { style: "medium", color: { argb: "FF000000" } },
    right: { style: "medium", color: { argb: "FF000000" } },
  };

  // Total calculations
  const totalWeight =
    allItems.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0) /
    1000; // Convert to tons
  const totalVolume = allItems.reduce(
    (sum, item) => sum + (parseFloat(item.volume) || 0),
    0
  );
  const totalCollies = allItems.reduce(
    (sum, item) => sum + (parseInt(item.quantity) || 0),
    0
  );

  worksheet.getCell(`E${totalRow}`).value = totalCollies;
  worksheet.getCell(`F${totalRow}`).value = `${totalWeight.toFixed(
    3
  )} T / ${totalVolume.toFixed(3)} M³`;
  worksheet.getCell(`G${totalRow}`).value = "";

  // Style total row cells
  for (let col = 5; col <= 7; col++) {
    const cell = worksheet.getCell(totalRow, col);
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "medium", color: { argb: "FF000000" } },
      left: { style: "medium", color: { argb: "FF000000" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      right: { style: "medium", color: { argb: "FF000000" } },
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
async function createRawExcel(allItems, metadata) {
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
  allItems.forEach((item) => {
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

    console.log(
      "🔍 Debug manifestData:",
      JSON.stringify(manifestData, null, 2)
    );
    console.log("🔍 Debug groupedData:", JSON.stringify(groupedData, null, 2));
    console.log(`📋 Processing ${Object.keys(groupedData).length} B/L groups`);

    // Prepare all manifest data
    const allItems = [];
    Object.values(groupedData).forEach((items) => {
      allItems.push(...items);
    });

    console.log(`📊 Total items: ${allItems.length}`);

    // Generate styled Excel with PT. Alam Raya Indonesia format
    console.log("📄 Creating Laporan_Bagus.xlsx...");
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
