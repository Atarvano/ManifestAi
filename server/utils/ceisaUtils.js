const { generateBL } = require("./generateBLNumber");

/**
 * CEISA Manifest Utilities
 * Handles normalization, validation, and mapping for CEISA format.
 */

// ==========================================
// 1. NORMALIZATION & VALIDATION
// ==========================================

function cleanBLNumber(bl) {
  if (!bl) return "";
  let cleaned = bl.toString().toUpperCase().replace(/[^A-Z0-9\/\-]/g, "");
  cleaned = cleaned.replace(/^[\/\-]+|[\/\-]+$/g, "");
  return cleaned;
}

function validateContainer(cntr) {
  if (!cntr) return { valid: false, cleaned: "", error: "Empty" };
  const cleaned = cntr.toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  if (cleaned.length !== 11) return { valid: false, cleaned, error: "Length != 11" };
  
  // Basic ISO check
  const owner = cleaned.substring(0, 4);
  if (!/^[A-Z]{4}$/.test(owner)) return { valid: false, cleaned, error: "Invalid Owner Code" };
  
  return { valid: true, cleaned, error: null };
}

function normalizeHSCode(hs) {
  if (!hs) return "";
  let digits = hs.toString().replace(/\D/g, "");
  if (digits.length < 4) return digits;
  if (digits.length === 6) digits += "00";
  if (digits.length > 8 && digits.length < 10) digits = digits.padEnd(10, "0");
  return digits;
}

function cleanMarks(marks) {
  if (!marks) return "NO MARK";
  let cleaned = marks.toString().trim().replace(/\s+/g, " ");
  cleaned = cleaned.replace(/^(MARKS?|NOS?|NUMBERS?|M\/N)[:\.]?\s*/i, "");
  return cleaned || "NO MARK";
}

function fixNumber(val) {
  if (!val) return 0;
  if (typeof val === "number") return val;
  let str = val.toString().trim();
  if (str.includes(",") && str.lastIndexOf(",") > str.lastIndexOf(".")) {
     str = str.replace(/\./g, "").replace(",", ".");
  } else {
     str = str.replace(/,/g, "");
  }
  return parseFloat(str) || 0;
}

// ==========================================
// 2. MAPPING TO CEISA STRUCTURE
// ==========================================

/**
 * Map normalized data to CEISA JSON structure
 * @param {Array} rawData - Array of objects from Excel/CSV
 * @param {Object} metadata - Additional info (Header info)
 */
function generateRandomDigits(length) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

/**
 * Map normalized data to CEISA JSON structure
 * @param {Array} rawData - Array of objects from Excel/CSV
 * @param {Object} metadata - Additional info (Header info)
 */
function mapToCEISA(rawData, metadata = {}) {
  const result = {
    header: [],
    master: [],
    detil: [],
    barang: [],
    dokumen: [],
    kontainer: [],
    respon_header: []
  };

  // Generate Session Prefix (8 digits) for this manifest
  // Example: 11569519
  const SESSION_PREFIX = generateRandomDigits(8);

  // Helper to generate full ID
  const generateID = () => SESSION_PREFIX + generateRandomDigits(8);

  // Common Data
  const NOMOR_AJU = "0000" + Date.now(); // Placeholder
  const ID_DATA = generateID();
  const KPPBC = metadata.kppbc || "";

  // Calculate Totals
  const totalPos = rawData.length;
  const totalKemasan = rawData.reduce((sum, row) => sum + fixNumber(row.quantity), 0);
  const totalKontainer = rawData.filter(row => row.container_no).length;
  const totalBruto = rawData.reduce((sum, row) => sum + fixNumber(row.gross_weight), 0);
  const totalVolume = rawData.reduce((sum, row) => sum + fixNumber(row.volume), 0);

  // 1. HEADER
  // Columns: NOMOR AJU, ID DATA, NPWP, JNS MANIFEST, KD JNS MANIFEST, KPPBC, NO BC 10, TGL BC 10, NO BC 11, TGL BC 11, NAMA SARANA ANGKUT, KODE MODA, CALL SIGN, NO IMO, NO_MMSI, NEGARA, NO VOYAGE / ARRIVAL, DEPARTURE FLIGHT, NAHKODA, HANDLING AGENT, PELABUHAN ASAL, PELABUHAN TRANSIT, PELABUHAN BONGKAR, PELABUHAN SELANJUTNYA, KADE, TGL TIBA, JAM TIBA, TGL KEDATANGAN, JAM KEDATANGAN, TGL BONGKAR, JAM BONGKAR, TGL MUAT, JAM MUAT, TGL KEBERANGKATAN, JAM KEBERANGKATAN, TOTAL POS, TOTAL KEMASAN, TOTAL KONTAINER, TOTAL MASTER BL/AWB, TOTAL BRUTO, TOTAL VOLUME, FLAG NIHIL, STATUS, NO PERBAIKAN, TGL PERBAIKAN, SERI PERBAIKAN, PEMBERITAHU, LENGKAP, USER, ID ASAL DATA, ID MODUL, WAKTU REKAM, WAKTU UPDATE, VERSI MODUL
  result.header.push({
    "NOMOR AJU": "18090503900520251106000560", // Example format
    "ID DATA": ID_DATA,
    "NPWP": "029839123215000",
    "JNS MANIFEST": "IS",
    "KD JNS MANIFEST": "RK",
    "KPPBC": KPPBC,
    "NO BC 10": "",
    "TGL BC 10": "",
    "NO BC 11": "",
    "TGL BC 11": "",
    "NAMA SARANA ANGKUT": metadata.saranaAngkut || "",
    "KODE MODA": "1", // 1=Laut
    "CALL SIGN": metadata.callSign || "",
    "NO IMO": metadata.noImo || "",
    "NO_MMSI": "",
    "NEGARA": "",
    "NO VOYAGE / ARRIVAL": rawData[0]?.voyage || "",
    "DEPARTURE FLIGHT": "",
    "NAHKODA": "",
    "HANDLING AGENT": "",
    "PELABUHAN ASAL": rawData[0]?.port_load || metadata.pelabuhanAsal || "",
    "PELABUHAN TRANSIT": rawData[0]?.port_transit || "",
    "PELABUHAN BONGKAR": rawData[0]?.port_discharge || metadata.pelabuhanBongkar || "",
    "PELABUHAN SELANJUTNYA": rawData[0]?.port_final || "",
    "KADE": "",
    "TGL TIBA": new Date().toISOString().split('T')[0],
    "JAM TIBA": "00:00:00",
    "TGL KEDATANGAN": new Date().toISOString().split('T')[0],
    "JAM KEDATANGAN": "00:00:00",
    "TGL BONGKAR": "",
    "JAM BONGKAR": "",
    "TGL MUAT": "",
    "JAM MUAT": "",
    "TGL KEBERANGKATAN": "",
    "JAM KEBERANGKATAN": "",
    "TOTAL POS": totalPos,
    "TOTAL KEMASAN": totalKemasan,
    "TOTAL KONTAINER": totalKontainer,
    "TOTAL MASTER BL/AWB": "1", // Assuming 1 Master BL for now
    "TOTAL BRUTO": totalBruto,
    "TOTAL VOLUME": totalVolume,
    "FLAG NIHIL": "N",
    "STATUS": "",
    "NO PERBAIKAN": "",
    "TGL PERBAIKAN": "",
    "SERI PERBAIKAN": "",
    "PEMBERITAHU": "",
    "LENGKAP": "Y",
    "USER": "",
    "ID ASAL DATA": "",
    "ID MODUL": "",
    "WAKTU REKAM": "",
    "WAKTU UPDATE": "",
    "VERSI MODUL": "2002"
  });

  // Process Rows
  let noPosCounter = 1;

  rawData.forEach((row, index) => {
    const mbl = cleanBLNumber(row.master_bl || row.NO_MASTER_BLAWB || row.MBL || "MBL-DEFAULT");
    const hbl = cleanBLNumber(row.house_bl || row.NO_HOUSE_BLAWB || row.HBL || `HBL-${index + 1}`);
    
    const ID_DETIL = generateID();
    const ID_MASTER = generateID(); 

    // 2. MASTER
    // Columns: ID MASTER, NOMOR AJU, KD KELOMPOK POS, NO MASTER BL/AWB, TGL MASTER BL/AWB, JML HOST BL/AWB, RESPON
    result.master.push({
      "ID MASTER": ID_MASTER,
      "NOMOR AJU": "18090503900520251106000560",
      "KD KELOMPOK POS": "",
      "NO MASTER BL/AWB": mbl,
      "TGL MASTER BL/AWB": "",
      "JML HOST BL/AWB": "1",
      "RESPON": ""
    });

    // 3. DETIL
    // Columns: ID DETIL, ID MASTER, NOMOR AJU, KD KELOMPOK POS, NO POS, NO SUB POS, NO SUB SUB POS, NO MASTER BLAWB, TGL MASTER BLAWB, NO HOST BLAWB, TGL HOST BLAWB, MOTHER VESSEL, NPWP CONSIGNEE, NAMA CONSIGNEE, ALMT CONSIGNEE, NEG CONSIGNEE, NPWP SHIPPER, NAMA SHIPPER, ALMT SHIPPER, NEG SHIPPER, NAMA NOTIFY, ALMT NOTIFY, NEG NOTIFY, PELABUHAN ASAL, PELABUHAN TRANSIT, PELABUHAN BONGKAR, PELABUHAN AKHIR, JUMLAH KEMASAN, JENIS KEMASAN, MERK KEMASAN, JUMLAH KONTAINER, BRUTO, VOLUME, FL PARTIAL, TOTAL KEMASAN, TOTAL KONTAINER, STATUS DETIL, FL KONSOLIDASI, FL PECAH, FL PERBAIKAN, JENIS ID SHIPPER, JENIS ID CONSIGNEE
    result.detil.push({
      "ID DETIL": ID_DETIL,
      "ID MASTER": ID_MASTER,
      "NOMOR AJU": NOMOR_AJU,
      "KD KELOMPOK POS": "",
      "NO POS": String(noPosCounter).padStart(4, '0'),
      "NO SUB POS": "0000",
      "NO SUB SUB POS": "0000",
      "NO MASTER BLAWB": mbl,
      "TGL MASTER BLAWB": "",
      "NO HOST BLAWB": hbl,
      "TGL HOST BLAWB": row.tgl_house || new Date().toISOString().split('T')[0],
      "MOTHER VESSEL": "",
      "NPWP CONSIGNEE": "",
      "NAMA CONSIGNEE": row.consignee || "",
      "ALMT CONSIGNEE": row.consignee_addr || "",
      "NEG CONSIGNEE": "",
      "NPWP SHIPPER": "",
      "NAMA SHIPPER": row.shipper || "",
      "ALMT SHIPPER": row.shipper_addr || "",
      "NEG SHIPPER": "",
      "NAMA NOTIFY": row.notify || "",
      "ALMT NOTIFY": row.notify_addr || "",
      "NEG NOTIFY": "",
      "PELABUHAN ASAL": row.port_load || "",
      "PELABUHAN TRANSIT": "",
      "PELABUHAN BONGKAR": row.port_discharge || "",
      "PELABUHAN AKHIR": row.port_final || "",
      "JUMLAH KEMASAN": fixNumber(row.quantity),
      "JENIS KEMASAN": row.package_type || "PK",
      "MERK KEMASAN": cleanMarks(row.marks),
      "JUMLAH KONTAINER": row.container_no ? 1 : 0,
      "BRUTO": fixNumber(row.gross_weight),
      "VOLUME": fixNumber(row.volume),
      "FL PARTIAL": "N",
      "TOTAL KEMASAN": fixNumber(row.quantity),
      "TOTAL KONTAINER": row.container_no ? 1 : 0,
      "STATUS DETIL": "LENGKAP",
      "FL KONSOLIDASI": "Y",
      "FL PECAH": "",
      "FL PERBAIKAN": "",
      "JENIS ID SHIPPER": "",
      "JENIS ID CONSIGNEE": ""
    });

    // 4. BARANG
    // Columns: ID BARANG, ID DETIL, SERI BARANG, HS CODE, URAIAN BARANG
    result.barang.push({
      "ID BARANG": generateID(),
      "ID DETIL": ID_DETIL,
      "SERI BARANG": "1",
      "HS CODE": normalizeHSCode(row.hs_code),
      "URAIAN BARANG": row.description || ""
    });

    // 5. DOKUMEN
    // Columns: ID DOKUMEN, ID DETIL, KODE DOKUMEN, NOMOR DOKUMEN, TANGGAL DOKUMEN, KODE KANTOR
    result.dokumen.push({
      "ID DOKUMEN": generateID(),
      "ID DETIL": ID_DETIL,
      "KODE DOKUMEN": "705", // Kode Invoice usually
      "NOMOR DOKUMEN": "INV-" + hbl,
      "TANGGAL DOKUMEN": new Date().toISOString().split('T')[0],
      "KODE KANTOR": KPPBC
    });

    // 6. KONTAINER
    // Columns: ID KONTAINER, ID DETIL, SERI KONTAINER, NOMOR KONTAINER, UKURAN KONTAINER, TIPE KONTAINER, JENIS KONTAINER, NOMOR SEGEL, STATUS KONTAINER
    if (row.container_no) {
      const cntrVal = validateContainer(row.container_no);
      result.kontainer.push({
        "ID KONTAINER": generateID(),
        "ID DETIL": ID_DETIL,
        "SERI KONTAINER": "1",
        "NOMOR KONTAINER": cntrVal.cleaned,
        "UKURAN KONTAINER": row.container_size || "20",
        "TIPE KONTAINER": "1", // General Purpose
        "JENIS KONTAINER": "",
        "NOMOR SEGEL": "",
        "STATUS KONTAINER": "FCL"
      });
    }

    noPosCounter++;
  });

  return result;
}

module.exports = {
  cleanBLNumber,
  validateContainer,
  normalizeHSCode,
  cleanMarks,
  fixNumber,
  mapToCEISA
};
