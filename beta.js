// ===============================
// 📦 Inisialisasi saat halaman dimuat
// ===============================
window.addEventListener("load", () => {
  console.log("🌐 Halaman dimuat");

  const container = document.getElementById("flutter-data-container");
  if (!container) {
    console.error("❌ Elemen #flutter-data-container tidak ditemukan!");
    return;
  }

  // 🔹 Kirim sinyal ke Flutter bahwa halaman siap
  if (window.FlutterChannel) {
    window.FlutterChannel.postMessage(JSON.stringify({ status: "ready" }));
    console.log("✅ Mengirim sinyal onWebReady ke FlutterChannel");
  } else {
    console.warn("⚠️ FlutterChannel belum tersedia");
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

    // Kirim konfirmasi ke Flutter
    if (window.FlutterChannel) {
      window.FlutterChannel.postMessage(
        JSON.stringify({
          status: "ok",
          receivedKeys: Object.keys(data),
        })
      );
    }
  } catch (error) {
    console.error("❌ Gagal parsing data dari Flutter:", error, data);
  }
}

// ===============================
// 🧱 Fungsi untuk menampilkan daftar submission
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
            <strong>${submission.submit_date || "-"}</strong><br>
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

  // Klik kartu → tampilkan detail
  const cards = container.querySelectorAll(".card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const submission = data.process.find((s) => s.submission_id == id);
      const selectedForm = Array.isArray(data.form)
        ? data.form.find(
            (f) =>
              f.data?.some((d) => d.submission_id == id) ||
              f.pages?.some((p) =>
                p.questionGroups?.some((g) =>
                  g.questions?.some((q) => q.submission_id == id)
                )
              )
          )
        : null;

      const dataPertanyaan = data.pertanyaan;
      const dataOpsi = data.opsi_jawaban;

      if (submission && selectedForm) {
        tampilkanDetail(
          submission,
          container,
          selectedForm,
          dataPertanyaan,
          dataOpsi
        );
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
// 🧱 Tampilkan halaman detail (form dinamis)
// ===============================
function tampilkanDetail(
  submission,
  container,
  dataForm,
  dataPertanyaan,
  dataOpsi
) {
  container.innerHTML = `
    <button id="btnBack" style="background:#4caf50;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;margin-bottom:12px;">⬅ Kembali</button>
    <h2>Detail ID ${submission.submission_id}</h2>
    <div id="formContainer" style="margin-top:10px;"></div>
  `;

  const formContainer = container.querySelector("#formContainer");
  const formData = Array.isArray(dataForm) ? dataForm[0] : dataForm;
  if (!formData?.pages) {
    formContainer.innerHTML = `<p>⚠️ Tidak ada struktur form untuk submission ini.</p>`;
    return;
  }

  let currentData = formData.data ? [...formData.data] : [];

  // Helper ambil nilai tersimpan
  function getValue(question, data) {
    if (!question || !Array.isArray(data)) return "";
    const found = data.find((d) => d.question_id === question.question_id);
    return found ? found.value || "" : "";
  }

  // Render form dinamis
  formData.pages.forEach((page) => {
    const pageEl = document.createElement("div");
    pageEl.classList.add("page-section");
    pageEl.innerHTML = `<h3 style="margin-top:16px;">📄 ${page.name}</h3>`;

    (page.questionGroups || []).forEach((group) => {
      const groupEl = document.createElement("div");
      groupEl.classList.add("group-card");
      groupEl.dataset.groupId = group.group_id;
      groupEl.style.cssText = `
        background:#fff;border:1px solid #ddd;border-radius:8px;
        padding:16px;margin-top:10px;box-shadow:0 1px 4px rgba(0,0,0,0.1);
      `;

      let html = `<h4 style="margin-bottom:10px;">${group.name}</h4>`;

      (group.questions || []).forEach((q) => {
        const label = `<label for="${q.code}">${q.label}${
          q.mandatory === 1 ? "<span style='color:red'>*</span>" : ""
        }</label>`;
        const saved = getValue(q, currentData);
        let inputField = "";

        // ===============================
        // 📸 Field Foto (kamera + preview + lokasi)
        // ===============================
        if (q.type === "foto") {
          const parts = (saved || "").split("|");
          const savedFileName = parts[0] || "";
          const savedFileType = parts[1] || "";
          const savedBase64 = parts[2] || "";
          const hasImage = savedBase64.length > 0;

          inputField = `
            <div class="photo-upload-wrapper" style="margin-top:8px;">
              <input type="file" id="${
                q.code
              }" accept="image/*" capture="environment"
                data-question-id="${q.question_id}" style="display:none" />
              <button type="button" class="btn-camera" data-target="${q.code}"
                style="background:#2196f3;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;">
                📷 Ambil Foto
              </button>
              <p class="file-info" style="font-size:12px;color:${
                hasImage ? "green" : "#999"
              };margin-top:4px;">
                ${
                  hasImage
                    ? `📷 ${savedFileName || "Sudah diunggah"}`
                    : "Belum ada foto"
                }
              </p>
              ${
                hasImage
                  ? `<img class="preview-thumb" src="data:${savedFileType};base64,${savedBase64}"
                       style="max-width:140px;border-radius:8px;margin-top:6px;display:block;" />`
                  : ""
              }
            </div>
          `;
        }

        // ===============================
        // 📩 Field Input Biasa / Dropdown
        // ===============================
        else if (q.type === "dropdown") {
          const opts = (dataOpsi || []).filter(
            (opt) => opt.collection_id === q.collection_id
          );
          const optionsHtml = opts
            .map(
              (opt) =>
                `<option value="${opt.value}" ${
                  (saved || "").split(":")[0] === opt.value ? "selected" : ""
                }>${opt.label}</option>`
            )
            .join("");
          inputField = `<select id="${q.code}" data-question-id="${q.question_id}">
            <option value="">Pilih...</option>${optionsHtml}
          </select>`;
        } else {
          inputField = `<input type="text" id="${q.code}" data-question-id="${
            q.question_id
          }" 
            value="${saved || ""}" placeholder="${q.hint || ""}" />`;
        }

        html += `<div class="form-group" style="margin-bottom:12px;">${label}${inputField}</div>`;
      });

      groupEl.innerHTML = html;
      pageEl.appendChild(groupEl);
    });

    formContainer.appendChild(pageEl);
  });

  // ===============================
  // 📸 Event Kamera + Preview + Simpan
  // ===============================
  formContainer.querySelectorAll(".btn-camera").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      console.log("📸 Membuka kamera untuk:", targetId);
      if (input) input.click();
    });
  });

  formContainer.querySelectorAll('input[type="file"]').forEach((fileInput) => {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const wrapper = e.target.closest(".photo-upload-wrapper");
      const infoEl = wrapper.querySelector(".file-info");
      const qid = parseInt(e.target.dataset.questionId);
      if (!qid || !file) return;

      // Hapus preview lama
      const oldPreview = wrapper.querySelector(".preview-thumb");
      if (oldPreview) oldPreview.remove();

      infoEl.textContent = `📷 ${file.name}`;
      infoEl.style.color = "#007bff";

      const img = document.createElement("img");
      img.className = "preview-thumb";
      img.style.maxWidth = "140px";
      img.style.borderRadius = "8px";
      img.style.marginTop = "6px";
      img.style.display = "block";
      infoEl.insertAdjacentElement("afterend", img);

      const reader = new FileReader();
      reader.onload = async () => {
        const base64DataURL = reader.result;
        img.src = base64DataURL;
        const base64Data = base64DataURL.split(",")[1];

        // Ambil lokasi
        let lat = null,
          lon = null;
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            });
          });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          console.log(`📍 Lokasi: ${lat}, ${lon}`);
        } catch (e) {
          console.warn("⚠️ Gagal ambil lokasi:", e.message);
        }

        // Simpan format compact
        const compactValue = `${file.name}|${file.type}|${base64Data}`;
        const dataEntry = {
          submission_id: submission.submission_id,
          question_id: qid,
          value: compactValue,
          lat,
          lon,
        };

        const existing = currentData.find((d) => d.question_id === qid);
        if (existing) Object.assign(existing, dataEntry);
        else currentData.push(dataEntry);

        infoEl.textContent = "📷 Sudah diunggah";
        infoEl.style.color = "green";
        console.log("✅ Foto tersimpan:", dataEntry);
      };

      reader.readAsDataURL(file);
    });
  });

  // ===============================
  // 💾 Tombol Simpan ke Flutter
  // ===============================
  const btnSave = document.createElement("button");
  btnSave.textContent = "💾 Simpan & Kirim ke Flutter";
  btnSave.style.cssText =
    "background:#2196f3;color:#fff;border:none;padding:10px 18px;border-radius:6px;cursor:pointer;margin-top:14px;display:block;";
  formContainer.after(btnSave);

  btnSave.addEventListener("click", async () => {
    const payload = {
      submission_id: submission.submission_id,
      data: currentData.filter((d) => !!d.value),
    };

    if (window.FlutterChannel) {
      window.FlutterChannel.postMessage(
        JSON.stringify({ type: "onFormSubmit", payload })
      );
      alert("✅ Data berhasil dikirim ke Flutter!");
    } else {
      console.log("📦 Mode web:", payload);
      alert("⚠️ FlutterChannel tidak tersedia.");
    }
  });

  // Tombol kembali
  container.querySelector("#btnBack").addEventListener("click", () => {
    tampilkanHasil(window.flutterReceivedData, container);
  });
}

// ===============================
// 🌐 Event koneksi opsional
// ===============================
window.addEventListener("offline", () => console.log("⚠️ Mode offline aktif"));
window.addEventListener("online", () => console.log("✅ Kembali online"));
