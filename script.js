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

  if (window.flutter_inappwebview) {
    window.flutter_inappwebview.callHandler("onWebReady");
    console.log("✅ Mengirim sinyal onWebReady ke Flutter");
  } else {
    console.warn("⚠️ flutter_inappwebview belum terdeteksi");
  }

  window.flutterReady = true;
  window.flutterBuffer = [];
});

// ===============================
// 🔁 Terima data dari Flutter
// ===============================
function receiveDataFromFlutter(data) {
  try {
    console.log("📩 Menerima data dari Flutter:", data);

    const container = document.getElementById("flutter-data-container");
    if (!container) return;

    if (typeof data === "string") data = JSON.parse(data);

    tampilkanHasil(data, container);

    window.flutterReceivedData = data;

    if (window.flutter_inappwebview) {
      window.flutter_inappwebview.callHandler("onDataReceived", {
        status: "ok",
        count: Array.isArray(data) ? data.length : Object.keys(data).length,
      });
    }
  } catch (error) {
    console.error("❌ Gagal parsing data dari Flutter:", error, data);
  }
}

// ===============================
// 🧱 Fungsi untuk menampilkan hasil ke halaman
// ===============================
function tampilkanHasil(data, container) {
  if (!data || !data.process) {
    container.innerHTML = "<p>⚠️ Tidak ada data untuk ditampilkan.</p>";
    return;
  }

  let html2 = "";
  for (const submission of data.process) {
    html2 += `
      <div class="card" data-id="${submission.submission_id}">
        <div class="card-header">
          <div class="id-info">
            ${submission.submission_id || "-"}<br>
            <small>${submission.submit_message || ""}</small>
          </div>
          <div class="time-info">
            <strong>${submission.submission_date || "-"}</strong><br>
            <small>97 Hari 2 jam 10 menit</small>
          </div>
        </div>

        <div class="section">
          <span class="label">NAMA LENGKAP PEMOHON</span><br>
          <span class="value">${submission.data?.[0]?.value || "-"}</span>
          <span class="status">0/0</span>
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

  // 🔹 Klik card → tampilkan detail di container yang sama
  const cards = container.querySelectorAll(".card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const submission = data.process.find((s) => s.submission_id == id);
      const dataForm = data.form.find((f) => f.data[0].submission_id == id);
      // const dataFref = data.fref.find((f) => f.data[0].submission_id == id);
      const dataPertanyaan = data.pertanyaan;
      const dataOpsi = data.opsi_jawaban;
      if (submission) {
        tampilkanDetail(
          submission,
          container,
          dataForm,
          dataPertanyaan,
          dataOpsi
        );
      }
    });
  });
}

// ===============================
// 🧱 Tampilkan halaman detail
// ===============================
function tampilkanDetail(
  submission,
  container,
  dataForm,
  dataPertanyaan,
  dataOpsi
) {
  // Reset isi container
  container.innerHTML = `
    <button id="btnBack" style="background:#4caf50;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;margin-bottom:12px;">⬅ Kembali</button>
    <h2>Detail ID ${submission.submission_id}</h2>
    <p><strong>Tanggal Submit:</strong> ${submission.submission_date}</p>
    <p><strong>Pesan:</strong> ${submission.submit_message}</p>
    <div id="formContainer" style="margin-top:10px;"></div>
  `;

  const formContainer = container.querySelector("#formContainer");

  // ==========================
  // 🔹 Fungsi Helper getValue
  // ==========================
  function getValue(question, data) {
    if (!question || !data) return null;
    const found = data.find((d) => d.questionId === question.questionId);
    return found ? found.value : null;
  }

  // =======================================
  // 🔹 Fungsi utama untuk cek visibility
  // =======================================
  function isVisibleDicission(page, groupId, data) {
    if (!page || !groupId) return true; // Jika tidak ada data, tampilkan group

    let result = true;
    let decision = page.decisions.find((d) => d.groupId === groupId);
    if (!decision) return result; // Jika tidak ada decision, tampilkan group
  }

  // 🔧 Fungsi bantu untuk mengambil nilai dari data submission
  function getValue(question, data) {
    if (!question || !data) return null;
    const found = data.find((d) => d.question_id === question.question_id);
    return found ? found.value : null;
  }

  // ==============================
  // 🔹 Loop semua pages dalam form
  // ==============================
  dataForm.pages.forEach((page) => {
    const pageElement = document.createElement("div");
    pageElement.classList.add("page-section");
    pageElement.innerHTML = `
      <h3 style="margin-top:16px;">📄 ${page.name}</h3>
    `;

    // ============================
    // 🔹 Loop setiap QuestionGroup
    // ============================
    page.questionGroups.forEach((group) => {
      // 🔍 Cek visibilitas dengan isVisibleDicission
      const visible = isVisibleDicission(page, group.groupId, dataPertanyaan);
      console.log("Menampilkan status Visibility:", group.name, visible);

      // Jika tidak visible, skip render
      if (!visible) return;

      const groupElement = document.createElement("div");
      groupElement.classList.add("group-card");
      groupElement.style.cssText = `
        background:#fff;
        border:1px solid #ddd;
        border-radius:8px;
        padding:16px;
        margin-top:10px;
        box-shadow:0 1px 4px rgba(0,0,0,0.1);
      `;

      let questionHTML = `
        <h4 style="margin-bottom:10px;">${group.name}</h4>
        <form class="form-group-container">
      `;

      // ============================
      // 🔹 Loop setiap pertanyaan
      // ============================
      group.questions.forEach((q) => {
        const required =
          q.mandatory === 1 ? "<span style='color:red;'>*</span>" : "";
        const label = `<label for="${q.code}">${q.label}${required}</label>`;

        let inputField = "";

        switch (q.type) {
          case "dropdown":
            // 🔹 Filter opsi berdasarkan collection_id
            const opsiCollection = (dataOpsi || []).filter(
              (opt) => opt.collection_id === q.collection_id
            );

            // 🔹 Buat HTML <option>
            const opsiDropdown = opsiCollection
              .map(
                (opt) => `<option value="${opt.value}">${opt.label}</option>`
              )
              .join("");

            inputField = `
        <select id="${q.code}" name="${q.code}">
          <option value="">Harap Pilih</option>
          ${opsiDropdown}
        </select>
      `;
            break;

          case "text":
            inputField = `<input type="text" id="${q.code}" name="${
              q.code
            }" placeholder="${q.hint || ""}" />`;
            break;

          case "foto":
            inputField = `
        <input type="file" id="${q.code}" name="${
              q.code
            }" accept="image/*" capture="camera" />
        <p style="font-size:12px;color:#666;">${q.hint || ""}</p>
      `;
            break;

          default:
            inputField = `<input type="text" id="${q.code}" name="${
              q.code
            }" placeholder="${q.hint || ""}" />`;
        }

        questionHTML += `
    <div class="form-group" style="margin-bottom:12px;">
      ${label}
      ${inputField}
    </div>
  `;
      });

      questionHTML += `</form>`;
      groupElement.innerHTML = questionHTML;
      pageElement.appendChild(groupElement);
    });

    formContainer.appendChild(pageElement);
  });
}

// 🔙 tombol kembali → tampilkan list lagi
document.getElementById("btnBack").addEventListener("click", () => {
  tampilkanHasil(dataAll, container);
});

// ===============================
// 🌐 Event listener koneksi (opsional)
// ===============================
window.addEventListener("offline", () => {
  console.log("⚠️ Mode offline aktif");
});

window.addEventListener("online", () => {
  console.log("✅ Kembali online");
});
