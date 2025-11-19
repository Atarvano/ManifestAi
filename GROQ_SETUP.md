# 🚀 Groq AI Setup - Super Fast & Free!

## Kenapa Groq?

✅ **GRATIS SELAMANYA** - No credit card needed  
✅ **SUPER CEPAT** - 10x lebih cepat dari Gemini  
✅ **GENEROUS FREE TIER** - 14,400 requests/day  
✅ **MODEL CANGGIH** - Llama 3.1 70B (sangat powerful)  
✅ **RELIABLE** - Uptime 99.9%

## Cara Daftar (5 Menit!)

### 1. Buat Akun Groq

1. Buka https://console.groq.com
2. Klik **"Sign Up"**
3. Login dengan:
   - Google Account, atau
   - GitHub Account, atau
   - Email biasa

### 2. Dapatkan API Key

1. Setelah login, klik **"API Keys"** di sidebar kiri
2. Klik tombol **"Create API Key"**
3. Beri nama key (contoh: `ManifestPro`)
4. Klik **"Submit"**
5. **COPY API KEY** yang muncul (contoh: `gsk_abc123...`)

⚠️ **PENTING**: API key hanya muncul 1x! Langsung copy dan simpan!

### 3. Setup di Project

1. Buka file `.env` di root folder project
2. Cari baris `GROQ_API_KEY=gsk_your_groq_api_key_here`
3. Ganti dengan API key yang sudah dicopy:

```env
GROQ_API_KEY=gsk_abc123xyz789_YOUR_REAL_KEY_HERE
```

4. Save file `.env`
5. Restart server: `node server/app.js`

## Testing

### Test di Browser

1. Buka http://localhost:3000/upload.html
2. Pilih model **"🚀 Groq (Llama 3.1 70B) - FAST & FREE"**
3. Upload file Excel manifest
4. Lihat hasilnya dengan HS Code otomatis! ⚡

### Test di Terminal

```bash
# Test koneksi Groq
node -e "require('./server/utils/groqClient').testGroqConnection().then(console.log)"
```

## Free Tier Limits

| Feature         | Limit              |
| --------------- | ------------------ |
| Requests/Day    | 14,400             |
| Requests/Minute | 30                 |
| Tokens/Minute   | 20,000             |
| Model Access    | Llama 3.1 8B & 70B |

**Cukup banget untuk project apapun!** 🎉

## Model yang Tersedia

### Llama 3.1 70B Versatile (Default)

- Model paling canggih
- Untuk tugas kompleks
- Speed: Fast

### Llama 3.1 8B Instant

- Model tercepat
- Untuk tugas sederhana (HS Code)
- Speed: Ultra fast ⚡

Project ini **otomatis memilih model yang tepat** untuk setiap tugas!

## Troubleshooting

### Error: "Invalid Groq API key"

- Cek API key di file `.env`
- Pastikan tidak ada spasi di awal/akhir
- Key harus diawali dengan `gsk_`

### Error: "Rate limit exceeded"

- Tunggu 1 menit
- Free tier: 30 request/menit
- Sudah cukup untuk 99% use case

### Error: "GROQ_API_KEY not configured"

- File `.env` belum di-update
- Restart server setelah update `.env`

## Links

- 📚 Docs: https://console.groq.com/docs
- 🔑 Get API Key: https://console.groq.com/keys
- 💬 Community: https://groq.com/community

---

**Happy Coding with Groq! 🚀**
