/**
 * CEISA Parser - Parse multi-sheet manifest Excel file
 * Supports: Header, Master Entry, Detil, Barang, Dokumen, Kontainer, Respon Header
 */

const ExcelJS = require("exceljs");

/**
 * Parse CEISA Excel workbook
 * @param {string} filePath - Path to Excel file
 * @returns {Promise<Object>} Parsed manifest data
 */
async function parseCeisaWorkbook(filePath) {
  console.log(`📖 [CEISA Parser] Reading file: ${filePath}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // Initialize result object
  const manifest = {
    header: null,
    masterEntries: [],
    detils: [],
    barangs: [],
    dokumens: [],
    kontainers: [],
    responHeader: [],
    metadata: {
      totalMasterBL: 0,
      totalHouseBL: 0,
      totalBarang: 0,
      totalKontainer: 0,
      parseDate: new Date().toISOString(),
    },
  };

  // Parse each sheet
  manifest.header = parseHeaderSheet(workbook.getWorksheet("Header"));
  manifest.masterEntries = parseMasterEntrySheet(
    workbook.getWorksheet("Master Entry")
  );
  manifest.detils = parseDetilSheet(workbook.getWorksheet("Detil"));
  manifest.barangs = parseBarangSheet(workbook.getWorksheet("Barang"));
  manifest.dokumens = parseDokumenSheet(workbook.getWorksheet("Dokumen"));
  manifest.kontainers = parseKontainerSheet(workbook.getWorksheet("Kontainer"));
  manifest.responHeader = parseResponHeaderSheet(
    workbook.getWorksheet("Respon Header")
  );

  // Calculate metadata
  manifest.metadata.totalMasterBL = new Set(
    manifest.masterEntries.map((m) => m.no_master_bl)
  ).size;
  manifest.metadata.totalHouseBL = new Set(
    manifest.detils.map((d) => d.no_house_bl)
  ).size;
  manifest.metadata.totalBarang = manifest.barangs.length;
  manifest.metadata.totalKontainer = new Set(
    manifest.kontainers.map((k) => k.nomor_kontainer)
  ).size;

  console.log(`✅ [CEISA Parser] Parsed:`);
  console.log(
    `   - Header: 1 row, NOMOR AJU: ${manifest.header?.nomor_aju || "N/A"}`
  );
  console.log(
    `   - Master Entries: ${manifest.masterEntries.length} rows, ${manifest.metadata.totalMasterBL} unique MBL`
  );
  console.log(
    `   - Detils: ${manifest.detils.length} rows, ${manifest.metadata.totalHouseBL} unique HBL`
  );
  console.log(`   - Barangs: ${manifest.barangs.length} rows`);
  console.log(`   - Dokumens: ${manifest.dokumens.length} rows`);
  console.log(
    `   - Kontainers: ${manifest.kontainers.length} rows, ${manifest.metadata.totalKontainer} unique containers`
  );

  return manifest;
}

/**
 * Parse Header sheet (row 2 contains data)
 */
function parseHeaderSheet(worksheet) {
  if (!worksheet) {
    console.warn("⚠️ Header sheet not found");
    return null;
  }

  const row = worksheet.getRow(2); // Row 2 contains data
  if (!row || !row.values) return null;

  return {
    nomor_aju: rowValue(row, 1),
    id_data: rowValue(row, 2),
    npwp: rowValue(row, 3),
    jns_manifest: rowValue(row, 4),
    kd_jns_manifest: rowValue(row, 5),
    kppbc: rowValue(row, 6),
    no_bc_10: rowValue(row, 7),
    tgl_bc_10: rowValue(row, 8),
    no_bc_11: rowValue(row, 9),
    tgl_bc_11: rowValue(row, 10),
    nama_sarana_angkut: rowValue(row, 11),
    kode_moda: rowValue(row, 12),
    call_sign: rowValue(row, 13),
    no_imo: rowValue(row, 14),
    no_mmsi: rowValue(row, 15),
    negara: rowValue(row, 16),
    tanggal_tiba: rowValue(row, 17),
    pel_tup: rowValue(row, 18),
    pel_muat: rowValue(row, 19),
    pel_transit: rowValue(row, 20),
    pel_bongkar: rowValue(row, 21),
    voyage: rowValue(row, 22),
    voyage_out: rowValue(row, 23),
    tanggal_berangkat: rowValue(row, 24),
    no_flight: rowValue(row, 25),
    no_invoice: rowValue(row, 26),
    no_co: rowValue(row, 27),
    tgl_co: rowValue(row, 28),
    tgl_bc12: rowValue(row, 29),
    no_bc12: rowValue(row, 30),
    versi: rowValue(row, 31),
    flag_batal: rowValue(row, 32),
    no_pos_dokumen: rowValue(row, 33),
    tgl_pos_dokumen: rowValue(row, 34),
    kode_bendera: rowValue(row, 35),
    kode_gudang: rowValue(row, 36),
    total_kont: parseNumber(rowValue(row, 37)),
    total_barang: parseNumber(rowValue(row, 38)),
    total_master: parseNumber(rowValue(row, 39)),
    total_house: parseNumber(rowValue(row, 40)),
    total_berat: parseNumber(rowValue(row, 41)),
    total_volume: parseNumber(rowValue(row, 42)),
    kd_tps: rowValue(row, 43),
  };
}

/**
 * Parse Master Entry sheet
 */
function parseMasterEntrySheet(worksheet) {
  if (!worksheet) {
    console.warn("⚠️ Master Entry sheet not found");
    return [];
  }

  const entries = [];
  let rowNum = 2; // Start from row 2 (row 1 is header)

  while (true) {
    const row = worksheet.getRow(rowNum);
    if (!row || !row.values || !rowValue(row, 1)) break;

    entries.push({
      id_data: rowValue(row, 1),
      id_master: rowValue(row, 2),
      no_master_bl: rowValue(row, 3),
      tgl_master_bl: rowValue(row, 4),
      nama_shipper: rowValue(row, 5),
      nama_consignee: rowValue(row, 6),
      jumlah_house: parseNumber(rowValue(row, 7)),
      total_kontainer: parseNumber(rowValue(row, 8)),
      total_berat: parseNumber(rowValue(row, 9)),
      total_volume: parseNumber(rowValue(row, 10)),
      pel_muat: rowValue(row, 11),
      pel_transit: rowValue(row, 12),
      pel_bongkar: rowValue(row, 13),
    });

    rowNum++;
  }

  return entries;
}

/**
 * Parse Detil sheet (House BL + Item details)
 */
function parseDetilSheet(worksheet) {
  if (!worksheet) {
    console.warn("⚠️ Detil sheet not found");
    return [];
  }

  const detils = [];
  let rowNum = 2;

  while (true) {
    const row = worksheet.getRow(rowNum);
    if (!row || !row.values || !rowValue(row, 1)) break;

    detils.push({
      id_data: rowValue(row, 1),
      id_detil: rowValue(row, 2),
      id_master: rowValue(row, 3),
      no_master_bl: rowValue(row, 4),
      no_house_bl: rowValue(row, 5),
      tgl_house_bl: rowValue(row, 6),
      nama_shipper: rowValue(row, 7),
      npwp_shipper: rowValue(row, 8),
      nama_consignee: rowValue(row, 9),
      npwp_consignee: rowValue(row, 10),
      alamat_consignee: rowValue(row, 11),
      jenis_barang: rowValue(row, 12),
      jumlah: parseNumber(rowValue(row, 13)),
      satuan_jumlah: rowValue(row, 14),
      berat_kotor: parseNumber(rowValue(row, 15)),
      volume: parseNumber(rowValue(row, 16)),
      marks: rowValue(row, 17),
      nomor_kontainer: rowValue(row, 18),
    });

    rowNum++;
  }

  return detils;
}

/**
 * Parse Barang sheet (Items with HS codes)
 */
function parseBarangSheet(worksheet) {
  if (!worksheet) {
    console.warn("⚠️ Barang sheet not found");
    return [];
  }

  const barangs = [];
  let rowNum = 2;

  while (true) {
    const row = worksheet.getRow(rowNum);
    if (!row || !row.values || !rowValue(row, 1)) break;

    barangs.push({
      id_data: rowValue(row, 1),
      id_detil: rowValue(row, 2),
      no_house_bl: rowValue(row, 3),
      hs_code: normalizeHSCode(rowValue(row, 4)),
      uraian_barang: rowValue(row, 5),
      jumlah: parseNumber(rowValue(row, 6)),
      satuan_jumlah: rowValue(row, 7),
      berat_kotor: parseNumber(rowValue(row, 8)),
      volume: parseNumber(rowValue(row, 9)),
    });

    rowNum++;
  }

  return barangs;
}

/**
 * Parse Dokumen sheet
 */
function parseDokumenSheet(worksheet) {
  if (!worksheet) {
    console.warn("⚠️ Dokumen sheet not found");
    return [];
  }

  const dokumens = [];
  let rowNum = 2;

  while (true) {
    const row = worksheet.getRow(rowNum);
    if (!row || !row.values || !rowValue(row, 1)) break;

    dokumens.push({
      id_data: rowValue(row, 1),
      id_dokumen: rowValue(row, 2),
      no_master_bl: rowValue(row, 3),
      no_house_bl: rowValue(row, 4),
      jenis_dokumen: rowValue(row, 5),
      nomor_dokumen: rowValue(row, 6),
      tanggal_dokumen: rowValue(row, 7),
    });

    rowNum++;
  }

  return dokumens;
}

/**
 * Parse Kontainer sheet
 */
function parseKontainerSheet(worksheet) {
  if (!worksheet) {
    console.warn("⚠️ Kontainer sheet not found");
    return [];
  }

  const kontainers = [];
  let rowNum = 2;

  while (true) {
    const row = worksheet.getRow(rowNum);
    if (!row || !row.values || !rowValue(row, 1)) break;

    kontainers.push({
      id_data: rowValue(row, 1),
      id_kontainer: rowValue(row, 2),
      no_master_bl: rowValue(row, 3),
      no_house_bl: rowValue(row, 4),
      nomor_kontainer: normalizeContainerNumber(rowValue(row, 5)),
      ukuran_kontainer: rowValue(row, 6),
      tipe_kontainer: rowValue(row, 7),
      jenis_kontainer: rowValue(row, 8),
      nomor_segel: rowValue(row, 9),
      status_kontainer: rowValue(row, 10),
    });

    rowNum++;
  }

  return kontainers;
}

/**
 * Parse Respon Header sheet
 */
function parseResponHeaderSheet(worksheet) {
  if (!worksheet) {
    console.warn("⚠️ Respon Header sheet not found");
    return [];
  }

  const respons = [];
  let rowNum = 2;

  while (true) {
    const row = worksheet.getRow(rowNum);
    if (!row || !row.values || !rowValue(row, 1)) break;

    respons.push({
      id_respon: rowValue(row, 1),
      nomor_aju: rowValue(row, 2),
      kode_respon: rowValue(row, 3),
      tanggal_respon: rowValue(row, 4),
      waktu_respon: rowValue(row, 5),
      nomor_dokumen_respon: rowValue(row, 6),
      tanggal_dokumen_respon: rowValue(row, 7),
      kode_kantor: rowValue(row, 8),
      byte_stream_pdf: rowValue(row, 9),
      flag_baca: rowValue(row, 10),
    });

    rowNum++;
  }

  return respons;
}

/**
 * Build unified manifest object linking Master BL → House BL → Items → Containers
 */
function buildUnifiedManifest(parsed) {
  console.log(`🔗 [CEISA Parser] Building unified manifest...`);

  const manifest = {
    header: parsed.header,
    masters: {},
  };

  // Group detils by Master BL
  const detilsByMaster = {};
  parsed.detils.forEach((detil) => {
    const mbl = detil.no_master_bl;
    if (!detilsByMaster[mbl]) detilsByMaster[mbl] = [];
    detilsByMaster[mbl].push(detil);
  });

  // Build master entries with linked data
  parsed.masterEntries.forEach((master) => {
    const mbl = master.no_master_bl;
    const detils = detilsByMaster[mbl] || [];

    // Group detils by House BL
    const houseMap = {};
    detils.forEach((detil) => {
      const hbl = detil.no_house_bl;
      if (!houseMap[hbl]) {
        houseMap[hbl] = {
          ...detil,
          items: [],
          containers: [],
          dokumens: [],
        };
      }
      houseMap[hbl].items.push(detil);
    });

    // Link barangs to houses
    parsed.barangs.forEach((barang) => {
      const hbl = barang.no_house_bl;
      if (houseMap[hbl]) {
        houseMap[hbl].barangs = houseMap[hbl].barangs || [];
        houseMap[hbl].barangs.push(barang);
      }
    });

    // Link kontainers to houses
    parsed.kontainers.forEach((kontainer) => {
      if (kontainer.no_master_bl === mbl) {
        const hbl = kontainer.no_house_bl;
        if (houseMap[hbl]) {
          houseMap[hbl].containers.push(kontainer);
        }
      }
    });

    // Link dokumens to houses
    parsed.dokumens.forEach((dokumen) => {
      if (dokumen.no_master_bl === mbl) {
        const hbl = dokumen.no_house_bl;
        if (houseMap[hbl]) {
          houseMap[hbl].dokumens.push(dokumen);
        }
      }
    });

    manifest.masters[mbl] = {
      ...master,
      houses: Object.values(houseMap),
    };
  });

  console.log(
    `✅ [CEISA Parser] Unified manifest built with ${
      Object.keys(manifest.masters).length
    } master BLs`
  );

  return manifest;
}

// ============ Helper Functions ============

/**
 * Get value from row cell (1-indexed column)
 */
function rowValue(row, col) {
  const val = row.getCell(col).value;
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

/**
 * Parse string to number or 0
 */
function parseNumber(val) {
  if (!val) return 0;
  const num = parseFloat(String(val).replace(/,/g, "."));
  return isNaN(num) ? 0 : num;
}

/**
 * Normalize HS Code to 10 digits
 */
function normalizeHSCode(code) {
  if (!code) return "";
  const digits = String(code).replace(/\D/g, "");
  return digits.padEnd(10, "0");
}

/**
 * Normalize container number format
 * Expected: XXXX0000000-0 (4 letters + 6 digits + check digit - position digit)
 */
function normalizeContainerNumber(num) {
  if (!num) return "";
  return String(num).toUpperCase().trim();
}

module.exports = {
  parseCeisaWorkbook,
  buildUnifiedManifest,
  parseHeaderSheet,
  parseMasterEntrySheet,
  parseDetilSheet,
  parseBarangSheet,
  parseDokumenSheet,
  parseKontainerSheet,
  parseResponHeaderSheet,
};
