# ManifesProject

Project untuk pemrosesan file Excel dengan Node.js + Express.

## Struktur Folder

```
ManifesProject/
├── server/
│   ├── app.js                  # Main application file
│   ├── routes/                 # API routes
│   │   └── index.js
│   ├── controllers/            # Route controllers
│   │   ├── prosesController.js
│   │   ├── pdfController.js
│   │   └── zipController.js
│   ├── utils/                  # Utility functions
│   │   ├── excelUtils.js
│   │   ├── apiUtils.js
│   │   └── fileUtils.js
│   └── templates/              # HTML templates
│       └── pdfTemplate.html
├── public/                     # Static files
│   ├── index.html
│   ├── hasil.html
│   └── hasil.js
├── format_standar.json         # Format configuration
├── .env                        # Environment variables
└── package.json
```

## API Routes

### `POST /api/proses` - Process Excel with AI Normalization

**Function**: Upload Excel file, normalize data using AI (Gemini/DeepSeek), return clean JSON

**Request**:

- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `file`: Excel file (.xlsx/.xls)
  - `modelSource`: "gemini" atau "deepseek"
  - `instruction`: (Optional) Instruksi tambahan untuk AI
  - `blNumber`: (Optional) Prefix untuk auto-generate B/L numbers

**Response**:

```json
{
  "success": true,
  "message": "File processed successfully",
  "data": [
    {
      "item_no": 1,
      "description": "Product Name",
      "hs_code": "1234567890",
      "quantity": 100,
      "unit": "PCS",
      "unit_price": 50.0,
      "total_price": 5000.0,
      "weight": 250.5,
      "volume": 1.5,
      "country_of_origin": "Indonesia",
      "bl_number": "BL202511180001"
    }
  ],
  "metadata": {
    "totalItems": 10,
    "modelUsed": "gemini",
    "filename": "manifest.xlsx"
  }
}
```

**Features**:

- ✅ Excel to CSV conversion
- ✅ AI-powered data normalization
- ✅ Auto-generate B/L numbers
- ✅ Data cleaning & validation
- ✅ Auto-sort by item_no

### `POST /api/generate-pdf` - Generate PDF

**Function**: Generate PDF dari data (TODO)

### `POST /api/generate-zip` - Generate ZIP

**Function**: Generate ZIP file (TODO)

## AI Prompt System

Project ini menggunakan AI untuk normalisasi data manifes kargo.

**Prompt Template**:

- Lokasi: `server/utils/fileUtils.js` → `buildAIPrompt()`
- Dokumentasi lengkap: Lihat `PROMPT_AI_GUIDE.md`

**Kolom Standar** (dari `format_standar.json`):

- item_no, description, hs_code, quantity, unit
- unit_price, total_price, weight, volume
- country_of_origin, bl_number

**Cara Kerja**:

1. Upload Excel → Convert ke CSV
2. Load kolom standar dari `format_standar.json`
3. Build prompt dengan instruksi normalisasi
4. Kirim ke AI (Gemini/DeepSeek)
5. Parse response JSON
6. Sort & generate B/L numbers
7. Return clean data

## Dependencies

- express - Web framework
- multer - File upload handling
- xlsx (sheetjs) - Excel file processing
- axios - HTTP client
- puppeteer - PDF generation
- exceljs - Advanced Excel operations
- archiver - ZIP file creation
- dotenv - Environment variables

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:

   ```
   GEMINI_API_KEY=""
   DEEPSEEK_API_KEY=""
   PORT=3000
   ```

3. Start server:

   ```bash
   npm start
   ```

4. Open browser:
   ```
   http://localhost:3000
   ```

## Testing

### Test Gemini Client

Test koneksi dan fungsionalitas Gemini API:

```bash
node test-gemini.js
```

Test dengan Pro model (optional, slower):

```bash
node test-gemini.js --pro
```

### Test DeepSeek Client

Test koneksi dan fungsionalitas DeepSeek API:

```bash
node test-deepseek.js
```

Test dengan Reasoner model (optional, slower):

```bash
node test-deepseek.js --reasoner
```

**Test Coverage:**

- ✅ Connection test
- ✅ Simple prompt test
- ✅ JSON output validation
- ✅ CSV normalization
- ✅ Custom options
- ✅ Pro/Reasoner model (optional)

## AI Clients

Project menggunakan dedicated AI clients untuk Gemini dan DeepSeek.

### Gemini Client

Location: `server/utils/geminiClient.js`

**Models:**

- 🚀 `gemini-2.5-flash-lite` - Default, ultra-fast, lightweight
- 🧠 `gemini-1.5-pro` - Advanced, more capable

**Features:**

- ✅ Automatic error handling
- ✅ Configurable temperature & max tokens
- ✅ 60-second timeout
- ✅ Safety settings for data processing
- ✅ Connection testing
- ✅ Connection testing

**Usage:**

```javascript
const {
  callGemini,
  callGeminiFlash,
  callGeminiPro,
} = require("./server/utils/geminiClient");

// Default (Flash)
const response = await callGemini(prompt);

// Explicit Flash
const response = await callGeminiFlash(prompt);

// Pro model
const response = await callGeminiPro(prompt);

// With custom options
const response = await callGemini(prompt, {
  model: "gemini-1.5-pro",
  temperature: 0.5,
  maxTokens: 10000,
});
```

**Documentation:** See `GEMINI_CLIENT_DOCS.md`

### DeepSeek Client

Location: `server/utils/deepseekClient.js`

**Models:**

- 🚀 `deepseek-chat` - Default, general purpose
- 🧠 `deepseek-reasoner` - Advanced reasoning capabilities

**Features:**

- ✅ Automatic error handling
- ✅ Configurable temperature & max tokens
- ✅ 60-second timeout
- ✅ OpenAI-compatible API
- ✅ Connection testing

**Usage:**

```javascript
const {
  callDeepseek,
  callDeepseekChat,
  callDeepseekReasoner,
} = require("./server/utils/deepseekClient");

// Default (Chat)
const response = await callDeepseek(prompt);

// Explicit Chat
const response = await callDeepseekChat(prompt);

// Reasoner model
const response = await callDeepseekReasoner(prompt);

// With custom options
const response = await callDeepseek(prompt, {
  model: "deepseek-reasoner",
  temperature: 0.5,
  maxTokens: 10000,
});
```

## Development

✅ **Endpoint `/api/proses` sudah fully functional!**

- Excel upload & processing ✅
- AI normalization (Gemini/DeepSeek) ✅
- B/L number generation ✅
- Data cleaning & sorting ✅

🚧 **TODO:**

- `/api/generate-pdf` - PDF generation
- `/api/generate-zip` - ZIP file creation
