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

  let currentData = formData.data ? [...formData.data] : [];

  // 🔹 Helper ambil nilai tersimpan
  function getValue(question, data) {
    if (!question || !Array.isArray(data)) return "";
    const found = data.find((d) => d.question_id === question.question_id);
    return found ? found.value || "" : "";
  }

  // 🔹 Decision logic (equal / notEqual)
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
      const refKey = (refValue || "").includes(":")
        ? refValue.split(":")[0]
        : refValue;

      switch (dic.dicission_type) {
        case 402:
          result =
            refKey === dic.dicission_value || refValue === dic.dicission_value;
          break;
        case 403:
          result =
            refKey !== dic.dicission_value && refValue !== dic.dicission_value;
          break;
      }
      if (!result) break;
    }
    return result;
  }

  // 🔹 Render form
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

        if (q.type === "dropdown") {
          const opts = (dataOpsi || []).filter(
            (opt) => opt.collection_id === q.collection_id
          );
          const optionsHtml = opts
            .map((opt) => {
              const savedKey = (saved || "").includes(":")
                ? saved.split(":")[0]
                : saved;
              const selected =
                opt.value == saved || opt.value == savedKey ? "selected" : "";
              return `<option value="${opt.value}" data-group="${
                opt.group || ""
              }" ${selected}>${opt.label}</option>`;
            })
            .join("");
          inputField = `<select id="${q.code}" name="${q.code}"
            data-question-id="${q.question_id}"
            data-collection-id="${q.collection_id}"
            data-group-id="${group.group_id}">
            <option value="">Harap Pilih</option>${optionsHtml}
          </select>`;
        } else if (q.type === "foto") {
          inputField = `<input type="file" id="${q.code}" accept="image/*" />${
            saved
              ? `<p style="font-size:12px;color:green">📷 Sudah diunggah</p>`
              : ""
          }`;
        } else {
          inputField = `<input type="text" id="${q.code}" data-question-id="${
            q.question_id
          }" value="${saved || ""}" placeholder="${q.hint || ""}" />`;
        }

        html += `<div class="form-group" style="margin-bottom:12px;">${label}${inputField}</div>`;
      });

      groupEl.innerHTML = html;
      pageEl.appendChild(groupEl);
    });

    formContainer.appendChild(pageEl);
  });

  // 🔹 Evaluasi visibilitas awal
  function evaluateVisibilityAll() {
    formData.pages.forEach((page) => {
      (page.questionGroups || []).forEach((group) => {
        const groupEl = formContainer.querySelector(
          `[data-group-id="${group.group_id}"]`
        );
        if (!groupEl) return;
        const visible = isVisibleDicission(page, group.group_id, currentData);
        groupEl.style.display = visible ? "block" : "none";
      });
    });
  }
  evaluateVisibilityAll();

  // 🔹 Event listener otomatis parent-child berdasarkan "group"
  formContainer.querySelectorAll("select").forEach((sel) => {
    sel.addEventListener("change", (e) => {
      const questionId = parseInt(sel.dataset.questionId);
      const collectionId = parseInt(sel.dataset.collectionId);
      const value = sel.value;
      const label = sel.options[sel.selectedIndex]?.text || "";
      const newValue = value ? `${value}:${label}` : "";
      const selectedGroup = sel.options[sel.selectedIndex]?.dataset.group || "";

      // update currentData
      const existing = currentData.find((d) => d.question_id === questionId);
      if (existing) existing.value = newValue;
      else
        currentData.push({
          submission_id: submission.submission_id,
          question_id: questionId,
          value: newValue,
        });

      // cari semua dropdown lain yang punya opsi dengan group = selectedGroup
      formContainer.querySelectorAll("select").forEach((childSel) => {
        console.log("Check Value");
        if (childSel === sel) return;

        const childCol = parseInt(childSel.dataset.collectionId);
        const allOpts = (dataOpsi || []).filter(
          (opt) => opt.collection_id === childCol
        );

        // filter child berdasarkan group yang cocok
        let filtered = allOpts;
        if (selectedGroup) {
          filtered = allOpts.filter(
            (opt) =>
              !opt.group ||
              opt.group === selectedGroup ||
              opt.group === value ||
              opt.group === label
          );
        }

        // hanya update child kalau ada group match
        const hasGroupMatch = allOpts.some(
          (opt) =>
            opt.group && (opt.group === selectedGroup || opt.group === value)
        );
        if (!hasGroupMatch) return;

        // rebuild opsi
        const oldValue = childSel.value;
        childSel.innerHTML = `<option value="">Harap Pilih</option>${filtered
          .map(
            (opt) =>
              `<option value="${opt.value}" data-group="${opt.group || ""}" ${
                opt.value === oldValue ? "selected" : ""
              }>${opt.label}</option>`
          )
          .join("")}`;

        if (value) {
          // reset child jika parent punya nilai baru
          childSel.value = "";
          const existingChild = currentData.find(
            (d) => d.question_id === parseInt(childSel.dataset.questionId)
          );
          if (existingChild) existingChild.value = "";
        }
      });

      // re-evaluasi decision
      evaluateVisibilityAll();
    });
  });

  // 🔙 Tombol kembali
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
