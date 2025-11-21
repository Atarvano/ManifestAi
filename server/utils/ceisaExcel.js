const ExcelJS = require("exceljs");

/**
 * Generate CEISA Excel File
 * Creates a 7-sheet workbook matching the strict user-provided structure.
 * @param {Object} data - The mapped CEISA data object
 * @param {string} outputPath - Path to save the file
 */
async function generateCEISAExcel(data, outputPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ManifestPro AI";
  workbook.created = new Date();

  // Helper to add columns
  const addColumns = (sheet, colDefs) => {
    sheet.columns = colDefs.map(name => ({ header: name, key: name, width: 20 }));
  };

  // 1. Header
  const sheetHeader = workbook.addWorksheet("Header");
  addColumns(sheetHeader, [
    "NOMOR AJU", "ID DATA", "NPWP", "JNS MANIFEST", "KD JNS MANIFEST", 
    "KPPBC", "NO BC 10", "TGL BC 10", "NO BC 11", "TGL BC 11", 
    "NAMA SARANA ANGKUT", "KODE MODA", "CALL SIGN", "NO IMO", "NO_MMSI", "NEGARA",
    "NO VOYAGE / ARRIVAL", "DEPARTURE FLIGHT", "NAHKODA", "HANDLING AGENT", 
    "PELABUHAN ASAL", "PELABUHAN TRANSIT", "PELABUHAN BONGKAR", "PELABUHAN SELANJUTNYA", 
    "KADE", "TGL TIBA", "JAM TIBA", "TGL KEDATANGAN", "JAM KEDATANGAN", 
    "TGL BONGKAR", "JAM BONGKAR", "TGL MUAT", "JAM MUAT", 
    "TGL KEBERANGKATAN", "JAM KEBERANGKATAN", 
    "TOTAL POS", "TOTAL KEMASAN", "TOTAL KONTAINER", "TOTAL MASTER BL/AWB", 
    "TOTAL BRUTO", "TOTAL VOLUME", "FLAG NIHIL", "STATUS", 
    "NO PERBAIKAN", "TGL PERBAIKAN", "SERI PERBAIKAN", 
    "PEMBERITAHU", "LENGKAP", "USER", "ID ASAL DATA", "ID MODUL", 
    "WAKTU REKAM", "WAKTU UPDATE", "VERSI MODUL"
  ]);
  if (data.header) sheetHeader.addRows(data.header);

  // 2. Master
  const sheetMaster = workbook.addWorksheet("Master entry");
  addColumns(sheetMaster, [
    "ID MASTER", "NOMOR AJU", "KD KELOMPOK POS", 
    "NO MASTER BL/AWB", "TGL MASTER BL/AWB", "JML HOST BL/AWB", 
    "RESPON"
  ]);
  if (data.master) sheetMaster.addRows(data.master);

  // 3. Detil
  const sheetDetil = workbook.addWorksheet("Detil");
  addColumns(sheetDetil, [
    "ID DETIL", "ID MASTER", "NOMOR AJU", "KD KELOMPOK POS", 
    "NO POS", "NO SUB POS", "NO SUB SUB POS", 
    "NO MASTER BLAWB", "TGL MASTER BLAWB", "NO HOST BLAWB", "TGL HOST BLAWB", 
    "MOTHER VESSEL", 
    "NPWP CONSIGNEE", "NAMA CONSIGNEE", "ALMT CONSIGNEE", "NEG CONSIGNEE", 
    "NPWP SHIPPER", "NAMA SHIPPER", "ALMT SHIPPER", "NEG SHIPPER", 
    "NAMA NOTIFY", "ALMT NOTIFY", "NEG NOTIFY", 
    "PELABUHAN ASAL", "PELABUHAN TRANSIT", "PELABUHAN BONGKAR", "PELABUHAN AKHIR", 
    "JUMLAH KEMASAN", "JENIS KEMASAN", "MERK KEMASAN", 
    "JUMLAH KONTAINER", "BRUTO", "VOLUME", "FL PARTIAL", 
    "TOTAL KEMASAN", "TOTAL KONTAINER", "STATUS DETIL", 
    "FL KONSOLIDASI", "FL PECAH", "FL PERBAIKAN", 
    "JENIS ID SHIPPER", "JENIS ID CONSIGNEE"
  ]);
  if (data.detil) sheetDetil.addRows(data.detil);

  // 4. Barang
  const sheetBarang = workbook.addWorksheet("Barang");
  addColumns(sheetBarang, [
    "ID BARANG", "ID DETIL", "SERI BARANG", "HS CODE", "URAIAN BARANG"
  ]);
  if (data.barang) sheetBarang.addRows(data.barang);

  // 5. Dokumen
  const sheetDokumen = workbook.addWorksheet("Dokumen");
  addColumns(sheetDokumen, [
    "ID DOKUMEN", "ID DETIL", "KODE DOKUMEN", "NOMOR DOKUMEN", "TANGGAL DOKUMEN", "KODE KANTOR"
  ]);
  if (data.dokumen) sheetDokumen.addRows(data.dokumen);

  // 6. Kontainer
  const sheetKontainer = workbook.addWorksheet("Kontainer");
  addColumns(sheetKontainer, [
    "ID KONTAINER", "ID DETIL", "SERI KONTAINER", "NOMOR KONTAINER", 
    "UKURAN KONTAINER", "TIPE KONTAINER", "JENIS KONTAINER", 
    "NOMOR SEGEL", "STATUS KONTAINER"
  ]);
  if (data.kontainer) sheetKontainer.addRows(data.kontainer);

  // 7. Respon Header
  const sheetRespon = workbook.addWorksheet("Respon Header");
  addColumns(sheetRespon, [
    "ID RESPON", "NOMOR AJU", "KODE RESPON", "TANGGAL RESPON", 
    "WAKTU RESPON", "NOMOR DOKUMEN RESPON", "TANGGAL DOKUMEN RESPON", 
    "KODE KANTOR", "BYTE STREAM PDF", "FLAG BACA"
  ]);
  if (data.respon_header) sheetRespon.addRows(data.respon_header);

  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

module.exports = { generateCEISAExcel };
