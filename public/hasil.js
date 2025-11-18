// Global variables
let manifestData = null;
let groupedData = {};

/**
 * Initialize page when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", function () {
  loadManifestData();
});

/**
 * Load manifest data from sessionStorage
 */
function loadManifestData() {
  try {
    const data = sessionStorage.getItem("manifestData");
    if (!data) {
      showNoDataState();
      return;
    }

    manifestData = JSON.parse(data);
    console.log("📋 Loaded manifest data:", manifestData);

    // Update summary
    updateSummary();

    // Group data by B/L number
    groupDataByBL();

    // Render tables
    renderGroupedTables();

    // Hide loading state
    hideLoadingState();
  } catch (error) {
    console.error("❌ Error loading data:", error);
    showNoDataState();
  }
}

/**
 * Update summary cards
 */
function updateSummary() {
  const totalItems = manifestData.data ? manifestData.data.length : 0;
  const modelUsed = manifestData.metadata?.modelUsed || "Unknown";
  const fileName = manifestData.metadata?.filename || "Unknown";

  document.getElementById("totalItems").textContent = totalItems;
  document.getElementById("modelUsed").textContent = modelUsed.toUpperCase();
  document.getElementById("fileName").textContent = fileName;

  // Count unique B/L numbers
  const uniqueBL = new Set();
  if (manifestData.data) {
    manifestData.data.forEach((item) => {
      if (item.bl_number) {
        uniqueBL.add(item.bl_number);
      }
    });
  }
  document.getElementById("totalBL").textContent = uniqueBL.size;
}

/**
 * Group data by B/L number
 */
function groupDataByBL() {
  groupedData = {};

  if (!manifestData.data) return;

  manifestData.data.forEach((item) => {
    const blNumber = item.bl_number || "No B/L";

    if (!groupedData[blNumber]) {
      groupedData[blNumber] = [];
    }

    groupedData[blNumber].push(item);
  });

  console.log("📊 Grouped data by B/L:", groupedData);
}

/**
 * Render grouped tables
 */
function renderGroupedTables() {
  const container = document.getElementById("dataContainer");

  // Clear existing content
  container.innerHTML = "";

  // Sort B/L numbers
  const sortedBLNumbers = Object.keys(groupedData).sort();

  sortedBLNumbers.forEach((blNumber) => {
    const items = groupedData[blNumber];
    const tableCard = createTableCard(blNumber, items);
    container.appendChild(tableCard);
  });
}

/**
 * Create table card for each B/L group
 */
function createTableCard(blNumber, items) {
  const card = document.createElement("div");
  card.className = "bg-white rounded-2xl shadow-lg mb-6 overflow-hidden";

  const header = document.createElement("div");
  header.className =
    "bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6";
  header.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold mb-1">
                    <i class="fas fa-file-invoice mr-2"></i>B/L: ${blNumber}
                </h2>
                <p class="text-indigo-100">${items.length} item(s)</p>
            </div>
            <div class="flex gap-3">
                <button onclick="generatePDFForBL('${blNumber}')" class="bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                    <i class="fas fa-file-pdf mr-2"></i>Buat PDF
                </button>
            </div>
        </div>
    `;

  const tableContainer = document.createElement("div");
  tableContainer.className = "overflow-x-auto";

  const table = document.createElement("table");
  table.className = "w-full";

  // Table header
  const thead = document.createElement("thead");
  thead.className = "bg-gray-50";
  thead.innerHTML = `
        <tr>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HS Code</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Berat</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asal</th>
        </tr>
    `;

  // Table body
  const tbody = document.createElement("tbody");
  tbody.className = "bg-white divide-y divide-gray-200";

  items.forEach((item, index) => {
    const row = document.createElement("tr");
    row.className = index % 2 === 0 ? "bg-white" : "bg-gray-50";
    row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
              item.item_no || index + 1
            }</td>
            <td class="px-6 py-4 text-sm text-gray-900">${
              item.description || "-"
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">${
              item.hs_code || "-"
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${
              formatNumber(item.quantity) || "-"
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${
              item.unit || "-"
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${
              formatCurrency(item.unit_price) || "-"
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">${
              formatCurrency(item.total_price) || "-"
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${
              formatNumber(item.weight) || "-"
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${
              formatNumber(item.volume) || "-"
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${
              item.country_of_origin || "-"
            }</td>
        `;
    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  tableContainer.appendChild(table);

  card.appendChild(header);
  card.appendChild(tableContainer);

  return card;
}

/**
 * Show loading state
 */
function hideLoadingState() {
  document.getElementById("loadingState").classList.add("hidden");
}

/**
 * Show no data state
 */
function showNoDataState() {
  document.getElementById("loadingState").classList.add("hidden");
  document.getElementById("noDataState").classList.remove("hidden");
}

/**
 * Generate PDF for specific B/L
 */
async function generatePDFForBL(blNumber) {
  try {
    console.log(`📄 Generating PDF for B/L: ${blNumber}`);

    const items = groupedData[blNumber];
    if (!items || items.length === 0) {
      alert("❌ Tidak ada data untuk B/L ini");
      return;
    }

    // Show loading
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
    btn.disabled = true;

    // Send data to PDF endpoint
    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blNumber: blNumber,
        items: items,
      }),
    });

    if (!response.ok) {
      throw new Error("Gagal generate PDF");
    }

    // Download PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Manifest_${blNumber.replace(/[\/\\?%*:|"<>]/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    console.log("✅ PDF downloaded successfully");
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    alert("❌ Error: " + error.message);
  } finally {
    // Reset button
    const btn = event.target;
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

/**
 * Download all PDFs as ZIP
 */
async function downloadAllZIP() {
  try {
    console.log("📦 Generating ZIP with all PDFs...");

    if (!manifestData || !manifestData.data) {
      alert("❌ Tidak ada data untuk diproses");
      return;
    }

    // Show loading
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>Creating ZIP...';
    btn.disabled = true;

    // Send all data to ZIP endpoint
    const response = await fetch("/api/generate-zip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupedData: groupedData,
        metadata: manifestData.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error("Gagal generate ZIP");
    }

    // Download ZIP
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Manifest_PDFs_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    console.log("✅ ZIP downloaded successfully");
  } catch (error) {
    console.error("❌ Error generating ZIP:", error);
    alert("❌ Error: " + error.message);
  } finally {
    // Reset button
    const btn = event.target;
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

/**
 * Download data as JSON
 */
function downloadJSON() {
  if (!manifestData) {
    alert("❌ Tidak ada data untuk didownload");
    return;
  }

  const dataStr = JSON.stringify(manifestData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `manifest_data_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Download styled Excel with PT. Alam Raya Indonesia format
 */
async function downloadExcel() {
  if (!manifestData || !manifestData.data) {
    alert("❌ Tidak ada data untuk didownload");
    return;
  }

  try {
    // Show loading
    const button = document.querySelector('button[onclick="downloadExcel()"]');
    const originalText = button.innerHTML;
    button.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>Generating Excel...';
    button.disabled = true;

    // Prepare data for ZIP endpoint
    const requestData = {
      manifestData: {
        groupedData: groupedData, // Use global groupedData variable
        metadata: {
          filename: manifestData.metadata?.filename || "manifest.xlsx",
          modelUsed: manifestData.metadata?.modelUsed || "gemini",
          shipName: manifestData.metadata?.shipName || "",
          masterName: manifestData.metadata?.masterName || "",
          sailedDate: new Date().toLocaleDateString("id-ID"),
          cargoFrom: manifestData.metadata?.cargoFrom || "",
          cargoTo: manifestData.metadata?.cargoTo || "",
          nationality: "Indonesia",
        },
      },
      includePDFs: false, // Only generate Excel files
    };

    const response = await fetch("/api/generate-excel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Download the Excel file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_Bagus_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    // Restore button
    button.innerHTML = originalText;
    button.disabled = false;

    alert(
      "✅ Excel berhasil didownload!\n\n📋 Laporan_Bagus.xlsx\n📋 Format PT. Alam Raya Indonesia"
    );
  } catch (error) {
    console.error("Error downloading Excel:", error);

    // Restore button
    const button = document.querySelector('button[onclick="downloadExcel()"]');
    button.innerHTML = '<i class="fas fa-file-excel mr-2"></i>Download Excel';
    button.disabled = false;

    alert("❌ Error generating Excel: " + error.message);
  }
}

/**
 * Format number with thousand separators
 */
function formatNumber(num) {
  if (!num && num !== 0) return "";
  return Number(num).toLocaleString("id-ID");
}

/**
 * Format currency (IDR)
 */
function formatCurrency(num) {
  if (!num && num !== 0) return "";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}
