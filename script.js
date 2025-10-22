// ===============================
// 📦 Inisialisasi saat halaman dibuka
// ===============================
window.addEventListener("load", () => {
  console.log("🌐 Halaman dimuat");

  const container = document.getElementById("flutter-data-container");
  if (!container) {
    console.error("❌ Elemen #flutter-data-container tidak ditemukan!");
    return;
  }

  // ✅ Kirim "ready" ke Flutter menggunakan flutter_inappwebview
  if (window.flutter_inappwebview) {
    window.flutter_inappwebview.callHandler(
      "FlutterChannel",
      JSON.stringify({ status: "ready" })
    );
    console.log(
      "✅ Mengirim sinyal onWebReady ke FlutterChannel (InAppWebView)"
    );
  } else {
    console.warn("⚠️ flutter_inappwebview belum tersedia");
  }

  window.flutterReady = true;
  window.flutterBuffer = [];
});

// ===============================
// 📍 Fungsi Ambil Lokasi (Latitude & Longitude)
// ===============================
function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("❌ Geolocation tidak didukung browser");
      return resolve(null);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        console.warn("⚠️ Gagal ambil lokasi:", err.message);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
  });
}

// ===============================
// 🔁 Terima data dari Flutter (Fungsi ini tetap sama, Flutter akan panggil manual)
// ===============================
function receiveDataFromFlutter(data) {
  try {
    console.log("📩 Menerima data dari Flutter:", data);

    const container = document.getElementById("flutter-data-container");
    if (!container) return;

    // ✅ Tampilkan hasil ke halaman (pakai data asli, bukan yang sudah compressed)
    if (data) {
      // Pastikan data berbentuk objek
      if (typeof data === "string") data = JSON.parse(data);

      /*
       * ✅ COMPRESS JSON sebelum disimpan ke sessionStorage
       * Gunakan UTF16 agar aman di sessionStorage
       */
      sessionStorage.setItem(
        "pertanyaan",
        LZString.compressToUTF16(JSON.stringify(data.pertanyaan))
      );
      sessionStorage.setItem(
        "opsi",
        LZString.compressToUTF16(JSON.stringify(data.opsi_jawaban))
      );
      sessionStorage.setItem(
        "process",
        LZString.compressToUTF16(JSON.stringify(data.process))
      );
      sessionStorage.setItem(
        "form",
        LZString.compressToUTF16(JSON.stringify(data.form))
      );
      console.log("✅ Data dikompresi & disimpan di sessionStorage");
      console.log("data:", data.form);

      tampilkanHasil(data.process, data.form, container);
      console.log("✅ Menampilkan data submission dari Flutter");
    } else {
      let dataProcess = getDataFromSession("process");
      let dataForm = getDataFromSession("form");
      console.log("📂 Mengambil data dari sessionStorage");
      tampilkanHasil(dataProcess, dataForm, container);
    }
    // } else {
    //   console.warn("⚠️ Data submission kosong");
    //   container.innerHTML = "<p>⚠️ Tidak ada data untuk ditampilkan.</p>";
    // }
    // tampilkanHasil(data, container);
  } catch (error) {
    console.error("❌ Gagal parsing data dari Flutter:", error);
  }
}

/*
 * ✅ Fungsi untuk ambil kembali data dari sessionStorage + dekompres
 */
function getDataFromSession(key) {
  const compressedData = sessionStorage.getItem(key);
  if (!compressedData) return null;

  const decompressed = LZString.decompressFromUTF16(compressedData);
  return decompressed ? JSON.parse(decompressed) : null;
}

// ===============================
// 🧱 Tampilkan daftar submission
// ===============================
function tampilkanHasil(dataProcess, dataForm, container) {
  console.log("🌐 Menampilkan hasil submission...");
  if (!dataForm || !dataProcess) {
    console.warn("⚠️ Data form atau process tidak tersedia");
    container.innerHTML = "<p>⚠️ Tidak ada data untuk ditampilkan.</p>";
    return;
  }

  let html2 = "";
  for (const submission of dataProcess) {
    html2 += `
      <div class="card" data-id="${submission.submission_id}">
        <div class="card-header">
          <div class="id-info">
            ${submission.submission_id || "-"}<br>
            <small>${submission.submit_message || ""}</small>
          </div>
          <div class="time-info">
            <strong>${submission.submit_date || "-"}</strong><br>
            <small>97 Hari 2 jam 10 menit</small>
          </div>
        </div>

        <div class="section">
          <span class="label">NAMA LENGKAP PEMOHON</span><br>
          <span class="value">${submission.data?.[0]?.value || "-"}</span>
        </div>

        <div class="section">
          <span class="label">NOMOR TELEPON/WHATSAPP PEMOHON</span><br>
          <span class="value">${submission.data?.[1]?.value || "-"}</span>
        </div>

        <div class="section">
          <span class="label">CEK JARAK ALAMAT DOMISILI</span><br>
          <span class="value">${submission.data?.[2]?.value || "-"}</span>
        </div>

        <div class="footer">ambil alih ${submission.device_model || "-"}</div>
      </div>
    `;
  }

  container.innerHTML = html2;

  const cards = container.querySelectorAll(".card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const submission = dataProcess.find((s) => s.submission_id == id);
      const selectedForm = Array.isArray(dataForm)
        ? dataForm.find(
            (f) =>
              f.data?.some((d) => d.submission_id == id) ||
              f.pages?.some((p) =>
                p.questionGroups?.some((g) =>
                  g.questions?.some((q) => q.submission_id == id)
                )
              )
          )
        : null;

      if (submission && selectedForm) {
        sessionStorage.setItem(
          "selectedSubmission",
          LZString.compressToUTF16(JSON.stringify(submission))
        );
        sessionStorage.setItem(
          "selectedForm",
          LZString.compressToUTF16(JSON.stringify(selectedForm))
        );
        window.location.href = "detail.html";
        // tampilkanDetail(submission, container, selectedForm, data, dataOpsi);
      } else {
        container.innerHTML = `
          <p>⚠️ Data dengan submission_id ${id} tidak ditemukan di form.</p>
          <button onclick="tampilkanHasil(data, container)">⬅ Kembali</button>
        `;
      }
    });
  });
}

// ===============================
// 🌐 Listener koneksi (opsional)
// ===============================
window.addEventListener("offline", () => console.log("⚠️ Mode offline aktif"));
window.addEventListener("online", () => console.log("✅ Kembali online"));
//asdsad
