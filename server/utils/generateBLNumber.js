// Utility untuk generate nomor B/L (Bill of Lading)

/**
 * Generate nomor B/L dengan format custom
 * @param {number} startNumber - Nomor dasar/awal (akan di-increment dengan index)
 * @param {string} formatTengah - Format bagian tengah (contoh: "TWN/BLW")
 * @param {number} tahun - Tahun (contoh: 2025)
 * @param {number} index - Index increment untuk loop
 * @returns {string} Nomor B/L dengan format: 01/TWN/BLW-XI/2025
 */
function generateBL(startNumber, formatTengah, tahun, index) {
  // Calculate nomor urut
  const nomorUrut = startNumber + index;

  // Format nomor urut dengan padding 2 digit
  const nomorFormatted = String(nomorUrut).padStart(2, "0");

  // Get bulan saat ini dalam Romawi
  const bulanRomawi = getBulanRomawi();

  // Generate nomor B/L
  const blNumber = `${nomorFormatted}/${formatTengah}-${bulanRomawi}/${tahun}`;

  return blNumber;
}

/**
 * Get bulan dalam format Romawi
 * @param {Date} date - Optional date object, default to current date
 * @returns {string} Bulan dalam format Romawi (I-XII)
 */
function getBulanRomawi(date = new Date()) {
  const bulan = date.getMonth() + 1; // 1-12

  const romawi = {
    1: "I",
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
    6: "VI",
    7: "VII",
    8: "VIII",
    9: "IX",
    10: "X",
    11: "XI",
    12: "XII",
  };

  return romawi[bulan] || "I";
}

/**
 * Generate nomor B/L dengan custom date
 * @param {number} startNumber - Nomor dasar/awal
 * @param {string} formatTengah - Format bagian tengah
 * @param {number} tahun - Tahun
 * @param {number} index - Index increment
 * @param {Date} customDate - Custom date untuk bulan
 * @returns {string} Nomor B/L
 */
function generateBLWithDate(
  startNumber,
  formatTengah,
  tahun,
  index,
  customDate
) {
  const nomorUrut = startNumber + index;
  const nomorFormatted = String(nomorUrut).padStart(2, "0");
  const bulanRomawi = getBulanRomawi(customDate);

  return `${nomorFormatted}/${formatTengah}-${bulanRomawi}/${tahun}`;
}

/**
 * Generate batch nomor B/L
 * @param {number} startNumber - Nomor awal
 * @param {string} formatTengah - Format bagian tengah
 * @param {number} tahun - Tahun
 * @param {number} count - Jumlah nomor yang akan di-generate
 * @returns {Array<string>} Array of B/L numbers
 */
function generateBLBatch(startNumber, formatTengah, tahun, count) {
  const blNumbers = [];

  for (let i = 0; i < count; i++) {
    blNumbers.push(generateBL(startNumber, formatTengah, tahun, i));
  }

  return blNumbers;
}

/**
 * Parse format tengah dari string (contoh: "TWN/BLW" atau "ABC/DEF")
 * @param {string} formatString - Format string
 * @returns {string} Validated format string
 */
function validateFormatTengah(formatString) {
  // Remove extra slashes and trim
  return formatString.trim().replace(/\/{2,}/g, "/");
}

/**
 * Generate nomor B/L untuk manifest items
 * @param {Array} manifestItems - Array of manifest items
 * @param {number} startNumber - Starting number
 * @param {string} formatTengah - Middle format (e.g., "TWN/BLW")
 * @param {number} tahun - Year
 * @returns {Array} Manifest items with bl_number filled
 */
function fillManifestBLNumbers(
  manifestItems,
  startNumber = 1,
  formatTengah = "TWN/BLW",
  tahun = new Date().getFullYear()
) {
  if (!Array.isArray(manifestItems)) {
    return manifestItems;
  }

  return manifestItems.map((item, index) => {
    // Only generate if bl_number is empty or null
    if (!item.bl_number || item.bl_number === "" || item.bl_number === null) {
      item.bl_number = generateBL(startNumber, formatTengah, tahun, index);
    }
    return item;
  });
}

module.exports = {
  generateBL,
  getBulanRomawi,
  generateBLWithDate,
  generateBLBatch,
  validateFormatTengah,
  fillManifestBLNumbers,
};
