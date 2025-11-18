// Utility functions untuk handling Excel files
const XLSX = require("xlsx");
const ExcelJS = require("exceljs");

/**
 * Convert Excel file to CSV string
 * @param {string} filePath - Path to Excel file
 * @returns {string} CSV string
 */
function excelToCSV(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to CSV
    const csvString = XLSX.utils.sheet_to_csv(worksheet);
    return csvString;
  } catch (error) {
    throw new Error(`Error converting Excel to CSV: ${error.message}`);
  }
}

/**
 * Convert Excel file to JSON array
 * @param {string} filePath - Path to Excel file
 * @returns {Array} Array of objects
 */
function excelToJSON(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    return jsonData;
  } catch (error) {
    throw new Error(`Error converting Excel to JSON: ${error.message}`);
  }
}

/**
 * Read Excel file and get basic info
 * @param {string} filePath - Path to Excel file
 * @returns {Object} Info about the Excel file
 */
function getExcelInfo(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    return {
      sheetNames: workbook.SheetNames,
      sheetCount: workbook.SheetNames.length,
    };
  } catch (error) {
    throw new Error(`Error reading Excel info: ${error.message}`);
  }
}

module.exports = {
  excelToCSV,
  excelToJSON,
  getExcelInfo,
};
