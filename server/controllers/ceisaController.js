const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

/**
 * Helper: Build CEISA Excel dari manifest data
 * 5 Sheets: HEADER, MASTER, HOUSE, BARANG, CONTAINER
 */
async function buildCeisaWorkbook(manifestData, metadata = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ManifestPro CEISA";

  // Count unique master BL and house BL
  const uniqueMasterBL = new Set(
    manifestData.map((item) => item.bl_number || "")
  );
  const uniqueHouseBL = new Set(
    manifestData.map((item) => item.house_bl_no || item.bl_number || "")
  );

  // ============ SHEET 1: HEADER ============
  const headerSheet = workbook.addWorksheet("HEADER");
  headerSheet.addRow([
    "kd_kantor",
    "tujuan",
    "jenis_bc",
    "no_manifest",
    "tgl_manifest",
    "voyage",
    "vessel",
    "call_sign",
    "jumlah_house",
    "jumlah_master",
  ]);

  headerSheet.addRow([
    metadata.kd_kantor || "502035",
    metadata.tujuan || "UNKNOWN",
    metadata.jenis_bc || "BC20",
    metadata.no_manifest || `MNF-${Date.now()}`,
    new Date().toISOString().split("T")[0],
    metadata.voyage || "UNKNOWN",
    metadata.vessel || "UNKNOWN",
    metadata.call_sign || "XXXX",
    uniqueHouseBL.size,
    uniqueMasterBL.size,
  ]);

  // ============ SHEET 2: MASTER BL ============
  const masterSheet = workbook.addWorksheet("MASTER");
  masterSheet.addRow([
    "master_bl_no",
    "tgl_master_bl",
    "shipper_name",
    "shipper_npwp",
    "consignee_name",
    "consignee_npwp",
    "total_qty",
    "total_weight",
    "total_volume",
    "jumlah_container",
  ]);

  // Group by master BL
  const masterBLMap = new Map();
  manifestData.forEach((item) => {
    const blNo = item.bl_number || "UNKNOWN";
    if (!masterBLMap.has(blNo)) {
      masterBLMap.set(blNo, {
        bl_number: blNo,
        tgl: item.bl_date || new Date().toISOString().split("T")[0],
        shipper: item.shipper || item.exporter || "",
        shipper_npwp:
          item.shipper_npwp || item.npwp || item.identity_number || "",
        consignee: item.consignee || item.importer || "",
        consignee_npwp: item.consignee_npwp || "",
        items: [],
        containers: new Set(),
      });
    }
    masterBLMap.get(blNo).items.push(item);
    if (item.container_number) {
      masterBLMap.get(blNo).containers.add(item.container_number);
    }
  });

  masterBLMap.forEach((master, blNo) => {
    const totalQty = master.items.reduce(
      (sum, item) => sum + (parseFloat(item.quantity) || 0),
      0
    );
    const totalWeight = master.items.reduce(
      (sum, item) => sum + (parseFloat(item.weight) || 0),
      0
    );
    const totalVolume = master.items.reduce(
      (sum, item) => sum + (parseFloat(item.volume) || 0),
      0
    );

    const row = masterSheet.addRow([
      blNo,
      master.tgl,
      master.shipper,
      master.shipper_npwp,
      master.consignee,
      master.consignee_npwp,
      totalQty,
      totalWeight,
      totalVolume,
      master.containers.size,
    ]);

    // Format numeric columns
    row.getCell(7).value = totalQty;
    row.getCell(8).value = totalWeight;
    row.getCell(9).value = totalVolume;
    row.getCell(10).value = master.containers.size;
  });

  // ============ SHEET 3: HOUSE BL ============
  const houseSheet = workbook.addWorksheet("HOUSE");
  houseSheet.addRow([
    "master_bl_no",
    "house_bl_no",
    "tgl_house_bl",
    "shipper_name",
    "consignee_name",
    "qty",
    "weight",
    "volume",
  ]);

  manifestData.forEach((item) => {
    const qty = parseFloat(item.quantity) || 0;
    const weight = parseFloat(item.weight) || 0;
    const volume = parseFloat(item.volume) || 0;

    const row = houseSheet.addRow([
      item.bl_number || "",
      item.house_bl_no || item.bl_number || "",
      item.bl_date || new Date().toISOString().split("T")[0],
      item.shipper || item.exporter || "",
      item.consignee || item.importer || "",
      qty,
      weight,
      volume,
    ]);

    // Format as numeric
    row.getCell(6).value = qty;
    row.getCell(7).value = weight;
    row.getCell(8).value = volume;
  });

  // ============ SHEET 4: BARANG ============
  const barangSheet = workbook.addWorksheet("BARANG");
  barangSheet.addRow([
    "house_bl_no",
    "hs_code",
    "description",
    "qty",
    "qty_unit",
    "gross_weight_kg",
    "volume_m3",
  ]);

  manifestData.forEach((item) => {
    const qty = parseFloat(item.quantity) || 0;
    const weight = parseFloat(item.weight) || 0;
    const volume = parseFloat(item.volume) || 0;

    const row = barangSheet.addRow([
      item.house_bl_no || item.bl_number || "",
      item.hs_code || "",
      item.description || "",
      qty,
      item.unit || "PCS",
      weight,
      volume,
    ]);

    // Format as numeric
    row.getCell(4).value = qty;
    row.getCell(6).value = weight;
    row.getCell(7).value = volume;
  });

  // ============ SHEET 5: CONTAINER ============
  const containerSheet = workbook.addWorksheet("CONTAINER");
  containerSheet.addRow([
    "master_bl_no",
    "container_no",
    "seal_no",
    "size_type",
    "marks",
  ]);

  // Track containers to avoid duplicates
  const containerMap = new Map();
  manifestData.forEach((item) => {
    if (item.container_number) {
      const containerKey = `${item.bl_number}_${item.container_number}`;
      if (!containerMap.has(containerKey)) {
        containerMap.set(containerKey, {
          master_bl: item.bl_number || "",
          container_no: item.container_number,
          seal_no: item.seal_number || item.container_number || "",
          size_type: item.container_type || "20FT",
          marks: item.marks || "",
        });
      }
    }
  });

  containerMap.forEach((container) => {
    containerSheet.addRow([
      container.master_bl,
      container.container_no,
      container.seal_no,
      container.size_type,
      container.marks,
    ]);
  });

  // ============ Format all sheets: No styling, just data ============
  [headerSheet, masterSheet, houseSheet, barangSheet, containerSheet].forEach(
    (sheet) => {
      // Set column widths but no styling (per CEISA requirement)
      sheet.columns.forEach((col) => {
        col.width = 15;
      });
    }
  );

  return workbook;
}

/**
 * POST /api/export-ceisa
 * Export CEISA format (5 sheets) - accepts both file upload and JSON data
 */
exports.exportCeisa = async (req, res) => {
  try {
    const { manifestData, metadata = {} } = req.body;

    if (!manifestData || !Array.isArray(manifestData)) {
      return res.status(400).json({
        success: false,
        error: "Invalid manifest data",
      });
    }

    console.log(
      `🔵 [CEISA] Creating Excel for ${manifestData.length} items...`
    );

    const workbook = await buildCeisaWorkbook(manifestData, metadata);

    // Generate file
    const filename = `CEISA_${
      metadata.no_manifest || `MNF-${Date.now()}`
    }.xlsx`;
    const uploadDir = path.join(__dirname, "../../uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    await workbook.xlsx.writeFile(filepath);

    console.log(`✅ [CEISA] Excel created: ${filename}`);

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error(`Download error: ${err.message}`);
      }
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) console.error(`Delete error: ${unlinkErr.message}`);
      });
    });
  } catch (error) {
    console.error(`❌ [CEISA] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/ceisa-template
 * Download empty CEISA template with proper structure
 */
exports.getCeisaTemplate = async (req, res) => {
  try {
    console.log(`🔵 [CEISA-Template] Creating empty template...`);

    // Create empty workbook with just headers
    const emptyData = [
      {
        bl_number: "EXAMPLE-BL-001",
        house_bl_no: "EXAMPLE-HBL-001",
        bl_date: new Date().toISOString().split("T")[0],
        shipper: "PT. SHIPPER EXAMPLE",
        shipper_npwp: "12.345.678.9-123.000",
        exporter: "PT. SHIPPER EXAMPLE",
        consignee: "CONSIGNEE EXAMPLE",
        consignee_npwp: "98.765.432.1-987.000",
        importer: "CONSIGNEE EXAMPLE",
        description: "EXAMPLE GOODS DESCRIPTION",
        quantity: 100,
        unit: "PCS",
        weight: 500,
        volume: 2.5,
        hs_code: "1234567890",
        container_number: "EXAMPLE20FT001",
        container_type: "20FT",
        seal_number: "SEAL001",
        marks: "EXAMPLE MARKS",
      },
    ];

    const metadata = {
      kd_kantor: "502035",
      tujuan: "JAKARTA",
      jenis_bc: "BC20",
      no_manifest: "TEMPLATE",
      voyage: "SA16JB-25",
      vessel: "KM. SUMBER ABADI 178",
      call_sign: "MNAA",
    };

    const workbook = await buildCeisaWorkbook(emptyData, metadata);

    // Generate file
    const filename = `CEISA_Template_${Date.now()}.xlsx`;
    const uploadDir = path.join(__dirname, "../../uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    await workbook.xlsx.writeFile(filepath);

    console.log(`✅ [CEISA-Template] Excel created: ${filename}`);

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error(`Download error: ${err.message}`);
      }
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) console.error(`Delete error: ${unlinkErr.message}`);
      });
    });
  } catch (error) {
    console.error(`❌ [CEISA-Template] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
