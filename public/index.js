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

const blStartNumber = document.getElementById("blStartNumber");
const blFormatTengah = document.getElementById("blFormatTengah");
const blTahun = document.getElementById("blTahun");
const blPreview = document.getElementById("blPreview");

const modelSource = document.getElementById("modelSource");
const customInstructions = document.getElementById("customInstructions");

fileInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.remove("hidden");
  }
});

removeFile.addEventListener("click", function () {
  fileInput.value = "";
  fileInfo.classList.add("hidden");
});

function updateBLPreview() {
  const startNum = blStartNumber.value || "1";
  const formatTengah = blFormatTengah.value || "TWN/BLW";
  const tahun = blTahun.value || "2025";
  const monthRoman = getRomanMonth();

  const preview = `${startNum.padStart(2, "0")}/${formatTengah}-${monthRoman}/${tahun}`;
  blPreview.textContent = preview;
}

function getRomanMonth() {
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const month = new Date().getMonth();
  return romans[month];
}

blStartNumber.addEventListener("input", updateBLPreview);
blFormatTengah.addEventListener("input", updateBLPreview);
blTahun.addEventListener("input", updateBLPreview);

updateBLPreview();

uploadForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) {
    alert("⚠️ Silakan pilih file terlebih dahulu!");
    return;
  }

  const allowedTypes = [".xlsx", ".xls"];
  const fileExt = "." + file.name.split(".").pop().toLowerCase();
  if (!allowedTypes.includes(fileExt)) {
    alert("⚠️ File harus berformat .xlsx atau .xls!");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("modelSource", modelSource.value);
  formData.append("blStartNumber", blStartNumber.value || "1");
  formData.append("blFormatTengah", blFormatTengah.value || "TWN/BLW");
  formData.append("blTahun", blTahun.value || "2025");

  const pelabuhanAsal = document.getElementById("pelabuhanAsal");
  const pelabuhanTransit = document.getElementById("pelabuhanTransit");
  const pelabuhanBongkar = document.getElementById("pelabuhanBongkar");
  const pelabuhanSelanjutnya = document.getElementById("pelabuhanSelanjutnya");

  if (pelabuhanAsal.value.trim()) formData.append("pelabuhanAsal", pelabuhanAsal.value.trim().toUpperCase());
  if (pelabuhanTransit.value.trim()) formData.append("pelabuhanTransit", pelabuhanTransit.value.trim().toUpperCase());
  if (pelabuhanBongkar.value.trim()) formData.append("pelabuhanBongkar", pelabuhanBongkar.value.trim().toUpperCase());
  if (pelabuhanSelanjutnya.value.trim()) formData.append("pelabuhanSelanjutnya", pelabuhanSelanjutnya.value.trim().toUpperCase());

  const instructions = customInstructions.value.trim();
  if (instructions) {
    formData.append("customInstructions", instructions);
  }

  showLoading();

  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) progress = 90;
    progressFill.style.width = progress + "%";

    if (progress < 30) {
      progressText.textContent = "📤 Mengunggah file...";
    } else if (progress < 60) {
      progressText.textContent = "🤖 Memproses dengan AI...";
    } else {
      progressText.textContent = "✨ Normalisasi data...";
    }
  }, 200);

  try {
    const response = await fetch("/api/proses", {
      method: "POST",
      body: formData,
    });

    clearInterval(progressInterval);
    progressFill.style.width = "100%";
    progressText.textContent = "✅ Selesai!";

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Terjadi kesalahan saat memproses file");
    }

    const result = await response.json();
    sessionStorage.setItem("manifestData", JSON.stringify(result));
    await sleep(500);
    window.location.href = "hasil.html";
  } catch (error) {
    clearInterval(progressInterval);
    alert("❌ Error: " + error.message);
    hideLoading();
  }
});

function showLoading() {
  submitBtn.disabled = true;
  btnText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Memproses...';
  progressBar.classList.remove("hidden");
  progressFill.style.width = "0%";
}

function hideLoading() {
  submitBtn.disabled = false;
  btnText.innerHTML = '<i class="fas fa-cogs mr-2"></i>Proses Manifes';
  progressBar.classList.add("hidden");
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
