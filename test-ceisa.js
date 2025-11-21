const { mapToCEISA } = require("./server/utils/ceisaUtils");
const { generateCEISAExcel } = require("./server/utils/ceisaExcel");
const path = require("path");
const fs = require("fs");

// Mock Data
const rawData = [
  {
    "master_bl": "MBL123456",
    "house_bl": "HBL001",
    "shipper": "SHIPPER A",
    "consignee": "CONSIGNEE A",
    "description": "AUTO PARTS",
    "quantity": 100,
    "gross_weight": 500,
    "volume": 2.5,
    "container_no": "TCLU1234567", // Invalid check digit example
    "hs_code": "870899"
  },
  {
    "master_bl": "MBL123456",
    "house_bl": "HBL002",
    "shipper": "SHIPPER B",
    "consignee": "CONSIGNEE B",
    "description": "ELECTRONICS",
    "quantity": 50,
    "gross_weight": 200,
    "volume": 1.0,
    "container_no": "MSKU1234560", // Potentially valid
    "hs_code": "854442"
  }
];

const metadata = {
  nomorAju: "000000-000000-20250101-000001",
  saranaAngkut: "KM. TEST VESSEL",
  callSign: "TEST",
  kdGudang: "GUDANG1"
};

async function runTest() {
  console.log("1. Mapping Data...");
  const ceisaData = mapToCEISA(rawData, metadata);
  console.log("Mapped Data:", JSON.stringify(ceisaData, null, 2));

  console.log("\n2. Generating Excel...");
  const outputDir = path.join(__dirname, "test_output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  
  const outputPath = path.join(outputDir, "Test_CEISA.xlsx");
  await generateCEISAExcel(ceisaData, outputPath);
  
  console.log(`\n✅ Excel generated at: ${outputPath}`);
}

runTest().catch(console.error);
