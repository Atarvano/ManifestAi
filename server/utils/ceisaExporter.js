/**
 * CEISA Exporter - Export unified manifest back to 7-sheet Excel structure
 * Exports with validation and normalization
 */

const ExcelJS = require("exceljs");

/**
 * Export unified manifest to CEISA 7-sheet Excel workbook
 * @param {Object} manifest - Unified manifest object
 * @param {string} outputPath - Output file path
 * @returns {Promise<void>}
 */
async function exportCeisaWorkbook(manifest, outputPath) {
  console.log(`📝 [CEISA Exporter] Creating workbook...`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CEISA Parser v1.0";
  workbook.created = new Date();

  // Create all 7 sheets
  createHeaderSheet(workbook, manifest);
  createMasterEntrySheet(workbook, manifest);
  createDetilSheet(workbook, manifest);
  createBarangSheet(workbook, manifest);
  createDokumenSheet(workbook, manifest);
  createKontainerSheet(workbook, manifest);
  createResponHeaderSheet(workbook, manifest);

  // Write to file
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ [CEISA Exporter] Workbook saved: ${outputPath}`);
}

/**
 * Create HEADER sheet
 */
function createHeaderSheet(workbook, manifest) {
  const sheet = workbook.addWorksheet("Header");

  // Add header row
  const headerRow = [
    "NOMOR AJU",
    "ID DATA",
    "NPWP",
    "JNS MANIFEST",
    "KD JNS MANIFEST",
    "KPPBC",
    "NO BC 10",
    "TGL BC 10",
    "NO BC 11",
    "TGL BC 11",
    "NAMA SARANA ANGKUT",
    "KODE MODA",
    "CALL SIGN",
    "NO IMO",
    "NO_MMSI",
    "NEGARA",
    "TANGGAL TIBA",
    "PEL TUP",
    "PEL MUAT",
    "PEL TRANSIT",
    "PEL BONGKAR",
    "VOYAGE",
    "VOYAGE OUT",
    "TANGGAL BERANGKAT",
    "NO FLIGHT",
    "NO INVOICE",
    "NO CO",
    "TGL CO",
    "TGL BC12",
    "NO BC12",
    "VERSI",
    "FLAG BATAL",
    "NO POS DOKUMEN",
    "TGL POS DOKUMEN",
    "KODE BENDERA",
    "KODE GUDANG",
    "TOTAL KONT",
    "TOTAL BARANG",
    "TOTAL MASTER",
    "TOTAL HOUSE",
    "TOTAL BERAT",
    "TOTAL VOLUME",
    "KD TPS",
  ];

  sheet.addRow(headerRow);

  // Add data row
  if (manifest.header) {
    const h = manifest.header;
    sheet.addRow([
      h.nomor_aju,
      h.id_data,
      h.npwp,
      h.jns_manifest,
      h.kd_jns_manifest,
      h.kppbc,
      h.no_bc_10,
      h.tgl_bc_10,
      h.no_bc_11,
      h.tgl_bc_11,
      h.nama_sarana_angkut,
      h.kode_moda,
      h.call_sign,
      h.no_imo,
      h.no_mmsi,
      h.negara,
      h.tanggal_tiba,
      h.pel_tup,
      h.pel_muat,
      h.pel_transit,
      h.pel_bongkar,
      h.voyage,
      h.voyage_out,
      h.tanggal_berangkat,
      h.no_flight,
      h.no_invoice,
      h.no_co,
      h.tgl_co,
      h.tgl_bc12,
      h.no_bc12,
      h.versi,
      h.flag_batal,
      h.no_pos_dokumen,
      h.tgl_pos_dokumen,
      h.kode_bendera,
      h.kode_gudang,
      h.total_kont,
      h.total_barang,
      h.total_master,
      h.total_house,
      h.total_berat,
      h.total_volume,
      h.kd_tps,
    ]);
  }

  formatSheetColumns(sheet, headerRow.length);
}

/**
 * Create MASTER ENTRY sheet
 */
function createMasterEntrySheet(workbook, manifest) {
  const sheet = workbook.addWorksheet("Master Entry");

  // Header
  const headers = [
    "ID DATA",
    "ID MASTER",
    "NO MASTER BL",
    "TGL MASTER BL",
    "NAMA SHIPPER",
    "NAMA CONSIGNEE",
    "JUMLAH HOUSE",
    "TOTAL KONTAINER",
    "TOTAL BERAT",
    "TOTAL VOLUME",
    "PEL MUAT",
    "PEL TRANSIT",
    "PEL BONGKAR",
  ];

  sheet.addRow(headers);

  // Data rows
  Object.values(manifest.masters).forEach((master) => {
    sheet.addRow([
      master.id_data,
      master.id_master,
      master.no_master_bl,
      master.tgl_master_bl,
      master.nama_shipper,
      master.nama_consignee,
      master.jumlah_house,
      master.total_kontainer,
      master.total_berat,
      master.total_volume,
      master.pel_muat,
      master.pel_transit,
      master.pel_bongkar,
    ]);
  });

  formatSheetColumns(sheet, headers.length);
}

/**
 * Create DETIL sheet (House BL + Item details)
 */
function createDetilSheet(workbook, manifest) {
  const sheet = workbook.addWorksheet("Detil");

  // Header
  const headers = [
    "ID DATA",
    "ID DETIL",
    "ID MASTER",
    "NO MASTER BL",
    "NO HOUSE BL",
    "TGL HOUSE BL",
    "NAMA SHIPPER",
    "NPWP SHIPPER",
    "NAMA CONSIGNEE",
    "NPWP CONSIGNEE",
    "ALAMAT CONSIGNEE",
    "JENIS BARANG",
    "JUMLAH",
    "SATUAN JUMLAH",
    "BERAT KOTOR",
    "VOLUME",
    "MARKS",
    "NOMOR KONTAINER",
  ];

  sheet.addRow(headers);

  // Data rows - flatten houses from masters
  Object.values(manifest.masters).forEach((master) => {
    master.houses.forEach((house) => {
      sheet.addRow([
        house.id_data,
        house.id_detil,
        house.id_master,
        house.no_master_bl,
        house.no_house_bl,
        house.tgl_house_bl,
        house.nama_shipper,
        house.npwp_shipper,
        house.nama_consignee,
        house.npwp_consignee,
        house.alamat_consignee,
        house.jenis_barang,
        house.jumlah,
        house.satuan_jumlah,
        house.berat_kotor,
        house.volume,
        house.marks,
        house.nomor_kontainer,
      ]);
    });
  });

  formatSheetColumns(sheet, headers.length);
}

/**
 * Create BARANG sheet (Items with HS codes)
 */
function createBarangSheet(workbook, manifest) {
  const sheet = workbook.addWorksheet("Barang");

  // Header
  const headers = [
    "ID DATA",
    "ID DETIL",
    "NO HOUSE BL",
    "HS CODE",
    "URAIAN BARANG",
    "JUMLAH",
    "SATUAN JUMLAH",
    "BERAT KOTOR",
    "VOLUME",
  ];

  sheet.addRow(headers);

  // Data rows - collect all barangs
  const allBarangs = [];
  Object.values(manifest.masters).forEach((master) => {
    master.houses.forEach((house) => {
      if (house.barangs) {
        allBarangs.push(...house.barangs);
      }
    });
  });

  allBarangs.forEach((barang) => {
    sheet.addRow([
      barang.id_data,
      barang.id_detil,
      barang.no_house_bl,
      barang.hs_code,
      barang.uraian_barang,
      barang.jumlah,
      barang.satuan_jumlah,
      barang.berat_kotor,
      barang.volume,
    ]);
  });

  formatSheetColumns(sheet, headers.length);
}

/**
 * Create DOKUMEN sheet
 */
function createDokumenSheet(workbook, manifest) {
  const sheet = workbook.addWorksheet("Dokumen");

  // Header
  const headers = [
    "ID DATA",
    "ID DOKUMEN",
    "NO MASTER BL",
    "NO HOUSE BL",
    "JENIS DOKUMEN",
    "NOMOR DOKUMEN",
    "TANGGAL DOKUMEN",
  ];

  sheet.addRow(headers);

  // Data rows - collect all dokumens
  const allDokumens = [];
  Object.values(manifest.masters).forEach((master) => {
    master.houses.forEach((house) => {
      if (house.dokumens) {
        allDokumens.push(...house.dokumens);
      }
    });
  });

  allDokumens.forEach((dokumen) => {
    sheet.addRow([
      dokumen.id_data,
      dokumen.id_dokumen,
      dokumen.no_master_bl,
      dokumen.no_house_bl,
      dokumen.jenis_dokumen,
      dokumen.nomor_dokumen,
      dokumen.tanggal_dokumen,
    ]);
  });

  formatSheetColumns(sheet, headers.length);
}

/**
 * Create KONTAINER sheet
 */
function createKontainerSheet(workbook, manifest) {
  const sheet = workbook.addWorksheet("Kontainer");

  // Header
  const headers = [
    "ID DATA",
    "ID KONTAINER",
    "NO MASTER BL",
    "NO HOUSE BL",
    "NOMOR KONTAINER",
    "UKURAN KONTAINER",
    "TIPE KONTAINER",
    "JENIS KONTAINER",
    "NOMOR SEGEL",
    "STATUS KONTAINER",
  ];

  sheet.addRow(headers);

  // Data rows - collect all kontainers
  const allKontainers = [];
  Object.values(manifest.masters).forEach((master) => {
    master.houses.forEach((house) => {
      if (house.containers) {
        allKontainers.push(...house.containers);
      }
    });
  });

  allKontainers.forEach((kontainer) => {
    sheet.addRow([
      kontainer.id_data,
      kontainer.id_kontainer,
      kontainer.no_master_bl,
      kontainer.no_house_bl,
      kontainer.nomor_kontainer,
      kontainer.ukuran_kontainer,
      kontainer.tipe_kontainer,
      kontainer.jenis_kontainer,
      kontainer.nomor_segel,
      kontainer.status_kontainer,
    ]);
  });

  formatSheetColumns(sheet, headers.length);
}

/**
 * Create RESPON HEADER sheet (empty by default)
 */
function createResponHeaderSheet(workbook, manifest) {
  const sheet = workbook.addWorksheet("Respon Header");

  // Header only
  const headers = [
    "ID RESPON",
    "NOMOR AJU",
    "KODE RESPON",
    "TANGGAL RESPON",
    "WAKTU RESPON",
    "NOMOR DOKUMEN RESPON",
    "TANGGAL DOKUMEN RESPON",
    "KODE KANTOR",
    "BYTE STREAM PDF",
    "FLAG BACA",
  ];

  sheet.addRow(headers);

  // Add response data if available
  if (manifest.responHeader && manifest.responHeader.length > 0) {
    manifest.responHeader.forEach((respon) => {
      sheet.addRow([
        respon.id_respon,
        respon.nomor_aju,
        respon.kode_respon,
        respon.tanggal_respon,
        respon.waktu_respon,
        respon.nomor_dokumen_respon,
        respon.tanggal_dokumen_respon,
        respon.kode_kantor,
        respon.byte_stream_pdf,
        respon.flag_baca,
      ]);
    });
  }

  formatSheetColumns(sheet, headers.length);
}

/**
 * Format sheet columns - set width and header styling
 */
function formatSheetColumns(sheet, columnCount) {
  for (let i = 1; i <= columnCount; i++) {
    const col = sheet.getColumn(i);
    col.width = 18;
  }

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E78" },
  };
  headerRow.alignment = {
    horizontal: "center",
    vertical: "center",
    wrapText: true,
  };
}

module.exports = {
  exportCeisaWorkbook,
  createHeaderSheet,
  createMasterEntrySheet,
  createDetilSheet,
  createBarangSheet,
  createDokumenSheet,
  createKontainerSheet,
  createResponHeaderSheet,
};
