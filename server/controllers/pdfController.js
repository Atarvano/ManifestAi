const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

// Controller untuk endpoint /api/generate-pdf

exports.generatePdf = async (req, res) => {
  let browser = null;

  try {
    console.log("📄 Starting PDF generation...");

    const { blNumber, items } = req.body;

    // Validation
    if (!blNumber || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: blNumber and items array",
      });
    }

    console.log(
      `📋 Generating PDF for B/L: ${blNumber} (${items.length} items)`
    );

    // Calculate totals
    const totals = calculateTotals(items);

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

    // Simple template rendering (replace {{}} placeholders)
    htmlTemplate = renderTemplate(htmlTemplate, templateData);

    // Launch Puppeteer
    console.log("🚀 Launching Puppeteer...");
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

    const page = await browser.newPage();

    // Set content and generate PDF
    await page.setContent(htmlTemplate, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    console.log("📄 Generating PDF...");
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

    await browser.close();
    browser = null;

    console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);

    // Set response headers for file download
    const fileName = `Manifest_${blNumber.replace(/[\/\\?%*:|"<>]/g, "_")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ Error generating PDF:", error);

    // Close browser if still open
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Calculate totals from items array
 */
function calculateTotals(items) {
  return items.reduce(
    (acc, item) => {
      acc.weight += parseFloat(item.weight) || 0;
      acc.volume += parseFloat(item.volume) || 0;
      acc.value += parseFloat(item.total_price) || 0;
      return acc;
    },
    { weight: 0, volume: 0, value: 0 }
  );
}

/**
 * Simple template renderer
 */
function renderTemplate(template, data) {
  let rendered = template;

  // Replace simple variables {{variable}}
  Object.keys(data).forEach((key) => {
    if (key !== "items") {
      const regex = new RegExp(`{{${key}}}`, "g");
      rendered = rendered.replace(regex, data[key] || "");
    }
  });

  // Handle items loop {{#each items}}
  const itemsRegex = /{{#each items}}([\s\S]*?){{\/each}}/;
  const match = rendered.match(itemsRegex);

  if (match && data.items) {
    const itemTemplate = match[1];
    let itemsHtml = "";

    data.items.forEach((item, index) => {
      let itemHtml = itemTemplate;

      // Replace item properties
      Object.keys(item).forEach((prop) => {
        const regex = new RegExp(`{{${prop}}}`, "g");
        itemHtml = itemHtml.replace(regex, item[prop] || "");
      });

      // Handle formatters
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
 * Format number with thousand separators
 */
function formatNumber(num) {
  if (!num && num !== 0) return "-";
  return Number(num).toLocaleString("id-ID");
}

/**
 * Format currency (IDR)
 */
function formatCurrency(num) {
  if (!num && num !== 0) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
