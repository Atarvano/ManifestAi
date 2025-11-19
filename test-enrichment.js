require("dotenv").config();
const { excelToCSV } = require("./server/utils/excelUtils");
const { callAI } = require("./server/utils/apiUtils");
const { enrichWithHSCodes } = require("./server/utils/aiClient");
const {
  loadFormatStandar,
  buildAIPrompt,
  fillBLNumbers,
  parseAIResponse,
} = require("./server/utils/fileUtils");

async function test() {
  try {
    const testCsv = `item_no,description,quantity,weight,unit
1,Filmtec RO Membrane BW30 PRO-400IG,1,100,Unit
2,Engine MKS Steel Model SC828OD2,1,750,Unit`;

    console.log("1️⃣ Testing CSV parsing...");
    const formatStandar = loadFormatStandar();
    const prompt = buildAIPrompt(formatStandar, testCsv, "");

    console.log("2️⃣ Calling AI (trying groq, fallback to gemini)...");
    let aiResponse;
    try {
      aiResponse = await callAI("groq", prompt);
    } catch (groqError) {
      console.log("⚠️ Groq failed, trying Gemini...");
      aiResponse = await callAI("gemini", prompt);
    }

    console.log("3️⃣ Parsing AI response...");
    let manifestData = parseAIResponse(aiResponse);
    console.log(
      "Before enrichment:",
      JSON.stringify(manifestData.slice(0, 2), null, 2)
    );

    console.log("\n4️⃣ Enriching with HS Codes...");
    manifestData = await enrichWithHSCodes(manifestData);
    console.log(
      "After enrichment:",
      JSON.stringify(manifestData.slice(0, 2), null, 2)
    );
  } catch (err) {
    console.error("Error:", err.message);
  }
  process.exit(0);
}

test();
