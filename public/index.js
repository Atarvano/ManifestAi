// DOM Elements
const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const removeFile = document.getElementById("removeFile");
const uploadForm = document.getElementById("uploadForm");
const submitBtn = document.getElementById("submitBtn");
const btnText = document.getElementById("btnText");
const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

// B/L Preview elements
const blStartNumber = document.getElementById("blStartNumber");
const blFormatTengah = document.getElementById("blFormatTengah");
const blTahun = document.getElementById("blTahun");
const blPreview = document.getElementById("blPreview");

// Model source
const modelSource = document.getElementById("modelSource");
const customInstructions = document.getElementById("customInstructions");

/**
 * File input change handler - show file info
 */
fileInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.remove("hidden");
  }
});

/**
 * Remove file handler
 */
removeFile.addEventListener("click", function () {
  fileInput.value = "";
  fileInfo.classList.add("hidden");
});

/**
 * Update B/L preview on input change
 */
function updateBLPreview() {
  const startNum = blStartNumber.value || "1";
  const formatTengah = blFormatTengah.value || "TWN/BLW";
  const tahun = blTahun.value || "2025";

  // Get current month in Roman numerals
  const monthRoman = getRomanMonth();

  // Format: 01/TWN/BLW-XI/2025
  const preview = `${startNum.padStart(
    2,
    "0"
  )}/${formatTengah}-${monthRoman}/${tahun}`;
  blPreview.textContent = preview;
}

/**
 * Get Roman numeral for current month
 */
function getRomanMonth() {
  const romans = [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
  ];
  const month = new Date().getMonth();
  return romans[month];
}

/**
 * Add event listeners for B/L inputs
 */
blStartNumber.addEventListener("input", updateBLPreview);
blFormatTengah.addEventListener("input", updateBLPreview);
blTahun.addEventListener("input", updateBLPreview);

/**
 * Initialize preview on page load
 */
updateBLPreview();

/**
 * Main form submit handler
 */
uploadForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  // Validate file
  const file = fileInput.files[0];
  if (!file) {
    alert("⚠️ Silakan pilih file terlebih dahulu!");
    return;
  }

  // Validate file type
  const allowedTypes = [".xlsx", ".xls"];
  const fileExt = "." + file.name.split(".").pop().toLowerCase();
  if (!allowedTypes.includes(fileExt)) {
    alert("⚠️ File harus berformat .xlsx atau .xls!");
    return;
  }

  // Prepare FormData with all fields
  const formData = new FormData();
  formData.append("file", file);
  formData.append("modelSource", modelSource.value);
  formData.append("blStartNumber", blStartNumber.value || "1");
  formData.append("blFormatTengah", blFormatTengah.value || "TWN/BLW");
  formData.append("blTahun", blTahun.value || "2025");

  // Add port information
  const pelabuhanAsal = document.getElementById("pelabuhanAsal");
  const pelabuhanTransit = document.getElementById("pelabuhanTransit");
  const pelabuhanBongkar = document.getElementById("pelabuhanBongkar");
  const pelabuhanSelanjutnya = document.getElementById("pelabuhanSelanjutnya");

  if (pelabuhanAsal.value.trim()) {
    formData.append("pelabuhanAsal", pelabuhanAsal.value.trim().toUpperCase());
  }
  if (pelabuhanTransit.value.trim()) {
    formData.append("pelabuhanTransit", pelabuhanTransit.value.trim().toUpperCase());
  }
  if (pelabuhanBongkar.value.trim()) {
    formData.append("pelabuhanBongkar", pelabuhanBongkar.value.trim().toUpperCase());
  }
  if (pelabuhanSelanjutnya.value.trim()) {
    formData.append("pelabuhanSelanjutnya", pelabuhanSelanjutnya.value.trim().toUpperCase());
  }

  // Add custom instructions if provided
  const instructions = customInstructions.value.trim();
  if (instructions) {
    formData.append("customInstructions", instructions);
  }

  // Show loading state
  showLoading();

  // Simulate progress animation
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) progress = 90;
    progressFill.style.width = progress + "%";

    // Update progress text based on progress
    if (progress < 30) {
      progressText.textContent = "📤 Mengunggah file...";
    } else if (progress < 60) {
      progressText.textContent = "🤖 Memproses dengan AI...";
    } else {
      progressText.textContent = "✨ Normalisasi data...";
    }
  }, 200);

  try {
    // Send POST request to /api/proses
    const response = await fetch("/api/proses", {
      method: "POST",
      body: formData,
    });

    // Stop progress animation
    clearInterval(progressInterval);
    progressFill.style.width = "100%";
    progressText.textContent = "✅ Selesai!";

    // Check response status
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Terjadi kesalahan saat memproses file");
    }

    // Parse result
    const result = await response.json();

    console.log("✅ Proses berhasil:", result);

    // Save to sessionStorage
    sessionStorage.setItem("manifestData", JSON.stringify(result));

    // Small delay to show success message
    await sleep(500);

    // Redirect to hasil.html
    window.location.href = "hasil.html";
  } catch (error) {
    // Stop progress on error
    clearInterval(progressInterval);

    console.error("❌ Error:", error);
    alert("❌ Error: " + error.message);

    // Reset form to normal state
    hideLoading();
  }
});

/**
 * Show loading state
 */
function showLoading() {
  submitBtn.disabled = true;
  btnText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Memproses...';
  progressBar.classList.remove("hidden");
  progressFill.style.width = "0%";
}

/**
 * Hide loading state
 */
function hideLoading() {
  submitBtn.disabled = false;
  btnText.innerHTML = '<i class="fas fa-cogs mr-2"></i>Proses Manifes';
  progressBar.classList.add("hidden");
}

/**
 * Format file size to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debug: Log FormData contents (for development)
 */
function debugFormData(formData) {
  console.log("📋 FormData contents:");
  for (let [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(
        `  ${key}: [File] ${value.name} (${formatFileSize(value.size)})`
      );
    } else {
      console.log(`  ${key}: ${value}`);
    }
  }
}
