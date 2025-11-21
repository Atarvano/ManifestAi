const axios = require("axios");

async function callGroq(prompt, options = {}) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "gsk_your_groq_api_key_here") {
      throw new Error("GROQ_API_KEY not configured");
    }

    const model = options.model || "llama-3.3-70b-versatile";
    const temperature = options.temperature || 0.3;
    const maxTokens = options.maxTokens || 8000;

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a logistics and customs expert specializing in Indonesian shipping manifest data normalization and HS code classification.",
          },
          { role: "user", content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        top_p: 0.95,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    if (response.data?.choices?.[0]?.message?.content) {
      const content = response.data.choices[0].message.content.trim();
      if (!content) throw new Error("Empty response from Groq");
      return content;
    }

    throw new Error("Invalid response structure");
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;
      if (status === 401) throw new Error("Invalid Groq API key");
      if (status === 429) throw new Error("Rate limit exceeded");
      throw new Error(`Groq API error (${status}): ${message}`);
    }
    if (error.code === "ECONNABORTED") throw new Error("Request timeout");
    throw new Error(`Groq error: ${error.message}`);
  }
}

async function callGroqFast(prompt) {
  return callGroq(prompt, { model: "llama-3.1-8b-instant" });
}

async function callGroqPro(prompt) {
  return callGroq(prompt, { model: "llama-3.3-70b-versatile" });
}

async function getHSCode(description) {
  try {
    if (!description?.trim()) {
      console.log(`[getHSCode] Empty description`);
      return "";
    }

    const cleanDesc = description.substring(0, 80).trim();
    const prompt = `What is the 10-digit HS tariff code for: ${cleanDesc}

CRITICAL: Reply with ONLY the 10-digit number. No text, no explanation, just numbers.
Example correct format: 8421290000`;

    console.log(`[getHSCode] Calling Groq for: "${cleanDesc}"`);

    const response = await callGroq(prompt, {
      model: "llama-3.1-8b-instant",
      temperature: 0.0,
      maxTokens: 50,
    });

    console.log(`[getHSCode] Raw response: "${response}"`);

    let hsCode = response.replace(/\D/g, "");

    if (hsCode.length >= 4 && hsCode.length < 6) {
      hsCode = hsCode.padEnd(10, "0");
    }

    hsCode = hsCode.slice(0, 10);
    const isValid = hsCode.length >= 6 && hsCode.length <= 10;
    console.log(`[getHSCode] Final: "${hsCode}" (valid=${isValid})`);
    return isValid ? hsCode : "";
  } catch (error) {
    console.error(`HS Code error: ${error.message}`);
    return "";
  }
}

async function enrichWithHSCodesBatch(items) {
  try {
    const validItems = items.filter((item) => item.description);
    if (validItems.length === 0) return items;

    console.log(
      `\n🚀 [Batch] Processing ${validItems.length} items in 1 request...`
    );

    const itemsList = validItems
      .map((item, idx) => `${idx + 1}. ${item.description.substring(0, 100)}`)
      .join("\n");

    const prompt = `Generate 10-digit HS tariff codes for these products (Indonesia format).

Products:
${itemsList}

CRITICAL OUTPUT - Reply ONLY with valid JSON array, no explanation:
[
  {"index": 1, "hs_code": "8421290000"},
  {"index": 2, "hs_code": "8409991000"}
]

Rules:
- Exactly 10 digits
- Valid HS code structure
- NO text outside JSON`;

    const response = await callGroq(prompt, {
      model: "llama-3.1-70b-versatile",
      temperature: 0.1,
      maxTokens: validItems.length * 100 + 500,
    });

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in response");

    const hsCodes = JSON.parse(jsonMatch[0]);
    console.log(`✅ [Batch] Parsed ${hsCodes.length} HS codes`);

    let enrichedCount = 0;
    items.forEach((item, itemIdx) => {
      if (item.description) {
        const validItemIdx = validItems.findIndex((v) => v === item);
        const hsData = hsCodes.find((h) => h.index === validItemIdx + 1);

        if (hsData?.hs_code) {
          const cleaned = hsData.hs_code
            .toString()
            .replace(/\D/g, "")
            .slice(0, 10);
          if (cleaned.length >= 6) {
            item.hs_code = cleaned.padEnd(10, "0");
            enrichedCount++;
          }
        }
      }
    });

    console.log(`🎉 [Batch] Enriched ${enrichedCount}/${items.length} items\n`);
    return items;
  } catch (error) {
    console.error(`❌ [Batch] Failed: ${error.message}`);
    console.log(`⚠️ [Batch] Falling back to sequential with delay...\n`);
    return await enrichWithHSCodesSequential(items);
  }
}

async function enrichWithHSCodesSequential(items) {
  const enrichedItems = [];
  console.log(
    `🐢 [Sequential] Processing ${items.length} items with 2s delay...`
  );

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (item.description) {
        const hsCode = await getHSCode(item.description);
        if (hsCode) {
          item.hs_code = hsCode;
          console.log(`✅ Item ${i + 1}/${items.length}: ${hsCode}`);
        }

        if (i < items.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      enrichedItems.push(item);
    } catch (error) {
      console.error(`❌ Item ${i + 1}: ${error.message}`);
      enrichedItems.push(item);
    }
  }

  return enrichedItems;
}

async function enrichWithHSCodes(items) {
  const enrichedItems = [];

  console.log(`\n🤖 Processing ${items.length} items with sequential mode...`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (item.description) {
        const hsCode = await getHSCode(item.description);
        if (hsCode) {
          item.hs_code = hsCode;
          console.log(`✅ Item ${i + 1}/${items.length}: ${hsCode}`);
        }
      }
      enrichedItems.push(item);
    } catch (error) {
      console.error(`❌ Item ${i + 1}: ${error.message}`);
      enrichedItems.push(item);
    }
  }

  console.log(
    `\n✅ Enrichment complete: ${enrichedItems.length} items processed`
  );
  return enrichedItems;
}

async function testGroqConnection() {
  try {
    const response = await callGroqFast('Respond with "OK"');
    return response.toLowerCase().includes("ok");
  } catch (error) {
    console.error("Groq connection test failed:", error.message);
    return false;
  }
}

module.exports = {
  callGroq,
  callGroqFast,
  callGroqPro,
  getHSCode,
  enrichWithHSCodes,
  enrichWithHSCodesBatch,
  enrichWithHSCodesSequential,
  testGroqConnection,
};
