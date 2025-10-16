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

  // 🔹 Klik card → tampilkan detail di container yang sama
  const cards = container.querySelectorAll(".card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const submission = data.process.find((s) => s.submission_id == id);
      const selectedForm = Array.isArray(data.form)
        ? data.form.find(
            (f) =>
              // cari di f.data
              f.data?.some((d) => d.submission_id == id) ||
              // cari di f.pages[*].questionGroups[*].questions[*]
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
// 🧱 Tampilkan halaman detail
// ===============================
function tampilkanDetail(
  submission,
  container,
  dataForm,
  dataPertanyaan,
  dataOpsi
) {
  // 🔹 Reset container
  container.innerHTML = `
    <button id="btnBack" style="background:#4caf50;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;margin-bottom:12px;">⬅ Kembali</button>
    <h2>Detail ID ${submission.submission_id}</h2>
    <p><strong>Tanggal Submit:</strong> ${submission.submission_date || "-"}</p>
    <p><strong>Pesan:</strong> ${submission.submit_message || "-"}</p>
    <div id="formContainer" style="margin-top:10px;"></div>
  `;

  const formContainer = container.querySelector("#formContainer");
  const formData = Array.isArray(dataForm) ? dataForm[0] : dataForm;
  if (!formData?.pages) {
    formContainer.innerHTML = `<p>⚠️ Tidak ada struktur form untuk submission ini.</p>`;
    return;
  }

  // 🔹 Ambil data submission yang sudah tersimpan
  let currentData = formData.data ? [...formData.data] : [];

  // ======================================================
  // 🔹 Helper: ambil nilai pertanyaan
  // ======================================================
  function getValue(question, data) {
    if (!question || !data) return null;
    const found = data.find((d) => d.question_id === question.question_id);
    return found ? found.value : "";
  }

  // ======================================================
  // 🔹 Logika decision seperti di Flutter
  // ======================================================
  function isVisibleDicission(page, groupId, data) {
    if (!page || !groupId) return true;

    const dicissions = page.dicissions || [];
    if (!Array.isArray(dicissions) || dicissions.length === 0) return true;

    let result = true;
    const related = dicissions.filter((d) => d.group_id === groupId);
    if (related.length === 0) return true;

    for (const dic of related) {
      const sourceGroup = page.questionGroups?.find(
        (g) => g.group_id === dic.dicission_group_id
      );
      const sourceQuestion = sourceGroup?.questions?.find(
        (q) => q.question_id === dic.dicission_question_id
      );
      const refValue = getValue(sourceQuestion, data);

      switch (dic.dicission_type) {
        case 402:
        case "equal":
          if (
            refValue == dic.dicission_value ||
            (refValue ?? ":::").split(":")[0] == dic.dicission_value
          ) {
            result = result;
          } else {
            result = false;
          }
          break;

        case 403:
        case "notEqual":
          if (
            refValue != dic.dicission_value &&
            (refValue ?? ":::").split(":")[0] != dic.dicission_value
          ) {
            result = result;
          } else {
            result = false;
          }
          break;

        default:
          result = result;
      }

      if (!result) break; // hentikan loop lebih cepat
    }

    return result;
  }

  // ======================================================
  // 🔹 Render form dinamis (preload value)
  // ======================================================
  formData.pages.forEach((page) => {
    const pageElement = document.createElement("div");
    pageElement.classList.add("page-section");
    pageElement.innerHTML = `<h3 style="margin-top:16px;">📄 ${
      page.name || "Tanpa Nama"
    }</h3>`;

    page.questionGroups?.forEach((group) => {
      const groupElement = document.createElement("div");
      groupElement.classList.add("group-card");
      groupElement.dataset.groupId = group.group_id;
      groupElement.style.cssText = `
        background:#fff;border:1px solid #ddd;border-radius:8px;
        padding:16px;margin-top:10px;box-shadow:0 1px 4px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
      `;

      let questionHTML = `<h4 style="margin-bottom:10px;">${group.name}</h4>`;

      (group.questions || []).forEach((q) => {
        const required =
          q.mandatory === 1 ? "<span style='color:red;'>*</span>" : "";
        const label = `<label for="${q.code}">${
          q.label || q.name || "Tanpa Label"
        }${required}</label>`;

        // 💾 Ambil nilai tersimpan dari data submission
        const currentValue = getValue(q, currentData) || q.value || "";

        let inputField = "";
        switch (q.type) {
          case "dropdown":
            const opsiCollection = (dataOpsi || []).filter(
              (opt) => opt.collection_id === q.collection_id
            );
            const opsiDropdown = opsiCollection
              .map(
                (opt) =>
                  `<option value="${opt.value}" ${
                    opt.value === currentValue ? "selected" : ""
                  }>${opt.label}</option>`
              )
              .join("");

            inputField = `
              <select id="${q.code}" name="${q.code}" data-question-id="${q.question_id}" data-group-id="${group.group_id}">
                <option value="">Harap Pilih</option>
                ${opsiDropdown}
              </select>
            `;
            break;

          case "foto":
            inputField = `
              <div>
                <input type="file" id="${q.code}" name="${
              q.code
            }" accept="image/*" capture="camera" />
                ${
                  currentValue
                    ? `<p style="color:green;font-size:13px;">📷 Foto sudah diunggah: ${currentValue}</p>`
                    : ""
                }
              </div>
            `;
            break;

          default:
            inputField = `
              <input type="text" id="${q.code}" name="${q.code}" 
                placeholder="${q.hint || ""}" 
                value="${currentValue}" 
                data-question-id="${q.question_id}" />
            `;
        }

        questionHTML += `
          <div class="form-group" style="margin-bottom:12px;">
            ${label}
            ${inputField}
          </div>
        `;
      });

      groupElement.innerHTML = questionHTML;
      pageElement.appendChild(groupElement);
    });

    formContainer.appendChild(pageElement);
  });

  // ======================================================
  // 🔹 Evaluasi visibilitas (awal + perubahan)
  // ======================================================
  function evaluateVisibilityAll() {
    formData.pages.forEach((page) => {
      page.questionGroups?.forEach((group) => {
        const groupEl = formContainer.querySelector(
          `[data-group-id="${group.group_id}"]`
        );
        if (!groupEl) return;
        const visible = isVisibleDicission(page, group.group_id, currentData);
        groupEl.style.display = visible ? "block" : "none";
        groupEl.style.opacity = visible ? 1 : 0;
      });
    });
  }

  // 🔸 Evaluasi pertama kali (untuk preload state)
  evaluateVisibilityAll();

  // ======================================================
  // 🔹 Saat dropdown berubah → update data + evaluasi ulang
  // ======================================================
  formContainer.querySelectorAll("select").forEach((selectEl) => {
    selectEl.addEventListener("change", (e) => {
      const questionId = parseInt(selectEl.dataset.questionId);
      const value = e.target.value;

      const existing = currentData.find((d) => d.question_id === questionId);
      if (existing) existing.value = value;
      else currentData.push({ question_id: questionId, value });

      evaluateVisibilityAll();
    });
  });

  // ======================================================
  // 🔙 Tombol kembali
  // ======================================================
  container.querySelector("#btnBack").addEventListener("click", () => {
    tampilkanHasil(data, container);
  });
}

// ===============================
// 🌐 Event listener koneksi (opsional)
// ===============================
window.addEventListener("offline", () => {
  console.log("⚠️ Mode offline aktif");
});

window.addEventListener("online", () => {
  console.log("✅ Kembali online");
});
