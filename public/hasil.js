let manifestData = null;
let groupedData = {};

document.addEventListener("DOMContentLoaded", function () {
  loadManifestData();
});

function loadManifestData() {
  try {
    const data = sessionStorage.getItem("manifestData");
    if (!data) {
      showNoDataState();
      return;
    }

    manifestData = JSON.parse(data);
    updateSummary();
    groupDataByBL();
    renderGroupedTables();
    hideLoadingState();
  } catch (error) {
    showNoDataState();
  }
}

function updateSummary() {
  const totalItems = manifestData.data ? manifestData.data.length : 0;
  const modelUsed = manifestData.metadata?.modelUsed || "Unknown";
  const fileName = manifestData.metadata?.filename || "Unknown";

  document.getElementById("totalItems").textContent = totalItems;
  document.getElementById("modelUsed").textContent = modelUsed.toUpperCase();
  document.getElementById("fileName").textContent = fileName;

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
}

function renderGroupedTables() {
  const container = document.getElementById("dataContainer");
  container.innerHTML = "";

  const sortedBLNumbers = Object.keys(groupedData).sort();

  sortedBLNumbers.forEach((blNumber) => {
    const items = groupedData[blNumber];
    const tableCard = createTableCard(blNumber, items);
    container.appendChild(tableCard);
  });
}

function createTableCard(blNumber, items) {
  const card = document.createElement("div");
  card.className = "bg-white rounded-2xl shadow-lg mb-6 overflow-hidden";

  const header = document.createElement("div");
  header.className = "bg-white border-b border-gray-100 p-6";
  header.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold mb-1 text-gray-900">
                    <i class="fas fa-file-invoice mr-2 text-blue-600"></i>B/L: ${blNumber}
                </h2>
                <p class="text-gray-500 text-sm">${items.length} item(s)</p>
            </div>
            <div class="flex gap-3">
                <button onclick="generatePDFForBL('${blNumber}')" class="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded-full transition-colors text-sm">
                    <i class="fas fa-file-pdf mr-2 text-red-500"></i>Buat PDF
                </button>
            </div>
        </div>
    `;

  const tableContainer = document.createElement("div");
  tableContainer.className = "overflow-x-auto";

  const table = document.createElement("table");
  table.className = "w-full";

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

function hideLoadingState() {
  document.getElementById("loadingState").classList.add("hidden");
}

function showNoDataState() {
  document.getElementById("loadingState").classList.add("hidden");
  document.getElementById("noDataState").classList.remove("hidden");
}

async function generatePDFForBL(blNumber) {
  try {
    const items = groupedData[blNumber];
    if (!items || items.length === 0) {
      alert("❌ Tidak ada data untuk B/L ini");
      return;
    }

    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
    btn.disabled = true;

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

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Manifest_${blNumber.replace(/[\/\\?%*:|"<>]/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    alert("❌ Error: " + error.message);
  } finally {
    const btn = event.target;
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function downloadAllZIP() {
  try {
    if (!manifestData || !manifestData.data) {
      alert("❌ Tidak ada data untuk diproses");
      return;
    }

    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>Creating ZIP...';
    btn.disabled = true;

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

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Manifest_PDFs_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    alert("❌ Error: " + error.message);
  } finally {
    const btn = event.target;
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

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

async function downloadExcel() {
  if (!manifestData || !manifestData.data) {
    alert("❌ Tidak ada data untuk didownload");
    return;
  }

  try {
    const button = document.querySelector('button[onclick="downloadExcel()"]');
    const originalText = button.innerHTML;
    button.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>Generating Excel...';
    button.disabled = true;

    const requestData = {
      manifestData: {
        groupedData: groupedData,
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
      includePDFs: false,
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

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_Bagus_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    button.innerHTML = originalText;
    button.disabled = false;

    alert(
      "✅ Excel berhasil didownload!\n\n📋 Laporan_Bagus.xlsx\n📋 Format PT. Alam Raya Indonesia"
    );
  } catch (error) {
    const button = document.querySelector('button[onclick="downloadExcel()"]');
    button.innerHTML = '<i class="fas fa-file-excel mr-2"></i>Download Excel';
    button.disabled = false;

    alert("❌ Error generating Excel: " + error.message);
  }
}

function formatNumber(num) {
  if (!num && num !== 0) return "";
  return Number(num).toLocaleString("id-ID");
}

function formatCurrency(num) {
  if (!num && num !== 0) return "";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function openCeisaModal() {
  document.getElementById("ceisaModal").classList.remove("hidden");
}

function closeCeisaModal() {
  document.getElementById("ceisaModal").classList.add("hidden");
}

async function generateCeisaFromData() {
  if (!manifestData || !manifestData.data) {
    alert("❌ Tidak ada data untuk diproses");
    return;
  }

  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
  btn.disabled = true;

  try {
    const metadata = {
      nomorAju: document.getElementById("nomorAju").value,
      npwp: document.getElementById("npwp").value,
      kppbc: document.getElementById("kppbc").value,
      kdGudang: document.getElementById("kdGudang").value,
      noBc11: document.getElementById("noBc11").value,
      tglBc11: document.getElementById("tglBc11").value,
      saranaAngkut: document.getElementById("saranaAngkut").value,
      callSign: document.getElementById("callSign").value,
      noImo: document.getElementById("noImo").value,
      mmsi: document.getElementById("mmsi").value,
      negara: document.getElementById("negara").value
    };

    const response = await fetch("/api/generate-ceisa-json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        manifestData: manifestData.data,
        metadata: metadata
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const result = await response.json();

    if (result.success) {
      const a = document.createElement("a");
      a.href = result.downloadUrl;
      a.download = result.downloadUrl.split("/").pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      closeCeisaModal();
      alert("✅ Berhasil generate Excel CEISA!");
    } else {
      alert("❌ Error: " + result.error);
    }

  } catch (error) {
    alert("❌ Gagal: " + error.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}
