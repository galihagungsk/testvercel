// ===============================
// 🔧 Inisialisasi & Variabel
// ===============================
const form = document.getElementById("formKredit");
const hasilDiv = document.getElementById("hasil");
const jenisSelect = document.getElementById("jenis");
const modelSelect = document.getElementById("model");
const resetBtn = document.getElementById("resetCache");
const container = document.getElementById("flutter-data-container");

const daftarModel = {
  mobil: ["Ertiga", "XL7", "Grand Vitara", "Fronx"],
  motor: ["Nex II", "GSX-S", "GSX-R", "Address"],
};

// ===============================
// 📦 Load cache lokal saat halaman dibuka
// ===============================
window.addEventListener("load", () => {
  console.log("🌐 Halaman dimuat");

  // Tampilkan data cache jika ada
  const cache = localStorage.getItem("dataKredit");
  if (cache) {
    tampilkanHasil(JSON.parse(cache));
  }

  // Kirim sinyal ke Flutter bahwa web sudah siap menerima data
  if (window.flutter_inappwebview) {
    window.flutter_inappwebview.callHandler("onWebReady");
    console.log("✅ Mengirim sinyal onWebReady ke Flutter");
  } else {
    console.warn("⚠️ flutter_inappwebview belum terdeteksi");
  }

  // Tandai halaman siap
  window.flutterReady = true;
  window.flutterBuffer = [];
});

// ===============================
// 🚗 Dropdown dinamis
// ===============================
jenisSelect.addEventListener("change", () => {
  const jenis = jenisSelect.value;
  modelSelect.innerHTML = '<option value="">-- Pilih Model --</option>';
  if (jenis && daftarModel[jenis]) {
    daftarModel[jenis].forEach((model) => {
      const opt = document.createElement("option");
      opt.value = model;
      opt.textContent = model;
      modelSelect.appendChild(opt);
    });
  }
});

// ===============================
// 💰 Hitung simulasi kredit
// ===============================
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const nama = document.getElementById("nama").value;
  const telepon = document.getElementById("telepon").value;
  const alamat = document.getElementById("alamat").value;
  const jenis = document.getElementById("jenis").value;
  const model = document.getElementById("model").value;
  const harga = parseFloat(document.getElementById("harga").value);
  const dpPersen = parseFloat(document.getElementById("dp").value);
  const tenor = parseInt(document.getElementById("tenor").value);

  if (!harga || !dpPersen || dpPersen >= 100 || !tenor) {
    alert("⚠️ Pastikan semua data benar!");
    return;
  }

  const bunga = 0.1;
  const dpNominal = (dpPersen / 100) * harga;
  const sisa = harga - dpNominal;
  const cicilanBulanan = Math.round((sisa * (1 + bunga)) / tenor);

  const hasil = {
    nama,
    telepon,
    alamat,
    jenis,
    model,
    harga,
    dpPersen,
    dpNominal,
    tenor,
    bunga: bunga * 100,
    cicilanBulanan,
  };

  localStorage.setItem("dataKredit", JSON.stringify(hasil));
  tampilkanHasil(hasil);

  // Kirim hasil ke Flutter
  if (window.flutter_inappwebview) {
    window.flutter_inappwebview.callHandler("jawaban", JSON.stringify(hasil));
    console.log("📤 Data dikirim ke Flutter:", hasil);
  }
});

// ===============================
// 🧹 Reset cache
// ===============================
resetBtn.addEventListener("click", () => {
  localStorage.removeItem("dataKredit");
  hasilDiv.innerHTML = "<p style='color:red;'>🗑️ Data cache dihapus.</p>";
});

// ===============================
// 🧾 Fungsi tampilkan hasil
// ===============================
function tampilkanHasil(data) {
  hasilDiv.innerHTML = `
    <h3>📋 Hasil Simulasi Kredit</h3>
    <p><strong>Jenis:</strong> ${data.jenis}</p>
    <p><strong>Model:</strong> ${data.model}</p>
    <p><strong>Harga OTR:</strong> Rp ${data.harga.toLocaleString("id-ID")}</p>
    <p><strong>DP (${
      data.dpPersen
    }%):</strong> Rp ${data.dpNominal.toLocaleString("id-ID")}</p>
    <p><strong>Tenor:</strong> ${data.tenor} bulan</p>
    <p><strong>Bunga:</strong> ${data.bunga}%</p>
    <p><strong>Cicilan/Bulan:</strong> Rp ${data.cicilanBulanan.toLocaleString(
      "id-ID"
    )}</p>
    <hr>
    <p><strong>Nama:</strong> ${data.nama}</p>
    <p><strong>No. Telepon:</strong> ${data.telepon}</p>
    <p><strong>Alamat:</strong> ${data.alamat}</p>
    <p style="color:green;font-style:italic;">✅ Disimpan di cache browser (offline)</p>
  `;
}

// ===============================
// 🔁 Terima data dari Flutter
// ===============================
function receiveDataFromFlutter(data) {
  try {
    console.log("📩 Menerima data dari Flutter:", data);

    // Jika data dikirim dalam bentuk string JSON, parse dulu
    if (typeof data === "string") {
      data = JSON.parse(data);
    }

    // Tampilkan hasil di halaman
    if (container) {
      container.innerHTML = "<pre>" + JSON.stringify(data, null, 2) + "</pre>";
    }

    // Simpan ke variabel global jika dibutuhkan
    window.flutterReceivedData = data;

    // Konfirmasi kembali ke Flutter
    if (window.flutter_inappwebview) {
      window.flutter_inappwebview.callHandler("onDataReceived", {
        status: "ok",
        count: Array.isArray(data) ? data.length : Object.keys(data).length,
      });
      console.log("✅ Konfirmasi dikirim ke Flutter");
    }
  } catch (error) {
    console.error("❌ Gagal parsing data dari Flutter:", error, data);
  }
}
