# CEISA Manifest AI Prompts

This document contains optimized prompts for batch-processing manifest data using various AI models (Gemini, Groq, DeepSeek, Qwen).

## 1. Gemini 1.5 Flash (Fast & Efficient)

**System Instruction:**

```text
You are a logistics data specialist. Your task is to normalize cargo manifest data into a strict JSON format for Indonesian Customs (CEISA).
```

**User Prompt:**

```text
Process the following raw cargo data.
Rules:
1. Clean B/L numbers: Remove special chars, keep only alphanumeric, /, -.
2. HS Code: Standardize to 8 digits (pad with 0 if needed).
3. Containers: Validate ISO 6346. If invalid, mark as "INVALID".
4. Description: Uppercase, remove garbage text.
5. Header Info: Extract 'voyage', 'vessel_name', 'call_sign', 'arrival_date' if present in the text.
6. Output: JSON Array of items, with header info repeated in each item if found.

Raw Data:
[INSERT_DATA_HERE]
```

## 2. Groq Llama 3.1 (High Speed)

**System Prompt:**

```text
You are an API that converts raw logistics text into CEISA-compliant JSON. Do not output any conversational text.
```

**User Prompt:**

```text
Convert this list to JSON:
- Fields: master_bl, house_bl, shipper, consignee, description, quantity, weight, volume, container_no, seal_no.
- Format:
  - Dates: YYYY-MM-DD
  - Numbers: No commas, use dots for decimals.
  - Missing fields: Use null.

Input:
[INSERT_DATA_HERE]
```

## 3. DeepSeek (Reasoning & Complex Parsing)

**System Prompt:**

```text
You are an expert in Indonesian Customs regulations (Peraturan Menteri Keuangan). Parse the provided packing list into a structured manifest.
```

**User Prompt:**

```text
Analyze the following unstructured text/CSV.
Identify:
- Shipper/Consignee (separate Name and Address)
- Goods Description (Extract generic name vs specific details)
- HS Code (Suggest 8-digit HS Code based on description if missing)

Output JSON structure:
{
  "header": { ... },
  "items": [ ... ]
}

Data:
[INSERT_DATA_HERE]
```

## 4. Qwen 2.5 (Multilingual & Robust)

**System Prompt:**

```text
You are a data extraction engine. Extract logistics entities from the provided document.
```

**User Prompt:**

```text
Extract and Normalize:
1. Port Codes (Convert City Name to UN/LOCODE, e.g., "Singapore" -> "SGSIN")
2. Package Types (Convert "Cartons" -> "CT", "Pallets" -> "PX")
3. Weights (Convert "1,200 kgs" -> 1200.0)

Input Data:
[INSERT_DATA_HERE]
```
