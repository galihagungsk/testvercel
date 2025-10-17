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

  // if (window.flutter_inappwebview) {
  //   window.flutter_inappwebview.callHandler("onWebReady");
  //   console.log("✅ Mengirim sinyal onWebReady ke Flutter");
  // } else {
  //   console.warn("⚠️ flutter_inappwebview belum terdeteksi");
  // }
  if (window.FlutterChannel) {
    // Kirim sinyal ke Flutter (web sudah siap)
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
// function receiveDataFromFlutter(data) {
//   try {
//     console.log("📩 Menerima data dari Flutter:", data);

//     const container = document.getElementById("flutter-data-container");
//     if (!container) return;

//     if (typeof data === "string") data = JSON.parse(data);

//     tampilkanHasil(data, container);

//     window.flutterReceivedData = data;

//     if (window.flutter_inappwebview) {
//       window.flutter_inappwebview.callHandler("onDataReceived", {
//         status: "ok",
//         count: Array.isArray(data) ? data.length : Object.keys(data).length,
//       });
//     }
//   } catch (error) {
//     console.error("❌ Gagal parsing data dari Flutter:", error, data);
//   }
// }

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
    <div id="progressContainer" style="margin-top:12px;"></div>
  `;

  const formContainer = container.querySelector("#formContainer");
  const progressContainer = container.querySelector("#progressContainer");

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

  // Decision visibility logic
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
        case 402: // equal
          result =
            refKey === dic.dicission_value || refValue === dic.dicission_value;
          break;
        case 403: // notEqual
          result =
            refKey !== dic.dicission_value && refValue !== dic.dicission_value;
          break;
      }
      if (!result) break;
    }
    return result;
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
          // Tombol kamera langsung + info bawaan
          inputField = `
            <input type="file" id="${
              q.code
            }" accept="image/*" capture="environment" data-question-id="${
            q.question_id
          }" style="display:none"/>
            <button type="button" class="btn-camera" data-target="${
              q.code
            }">📷 Ambil Foto</button>
            <p class="file-info" style="font-size:12px;color:${
              saved ? "green" : "#999"
            };margin-top:4px;">
              ${saved ? "📷 Sudah diunggah" : "Belum ada foto"}
            </p>
          `;
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

  // Tombol kamera → buka kamera langsung
  formContainer.querySelectorAll(".btn-camera").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (input) {
        try {
          input.click(); // buka kamera
        } catch (e) {
          console.warn("Kamera gagal dibuka, fallback ke galeri");
          input.removeAttribute("capture");
          input.click();
        }
      }
    });
  });

  // 📷 tampilkan nama file, preview, dan simpan ke currentData (✅ versi fix)
  formContainer.querySelectorAll('input[type="file"]').forEach((fileInput) => {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const wrapper = e.target.closest(".form-group");
      const infoEl = wrapper.querySelector(".file-info");
      const qid = parseInt(e.target.dataset.questionId);
      if (!qid) return;

      // Reset preview
      let preview = wrapper.querySelector("img.preview-thumb");
      if (preview) preview.remove();

      if (file) {
        infoEl.textContent = `📷 ${file.name}`;
        infoEl.style.color = "#007bff";

        // buat preview
        const img = document.createElement("img");
        img.className = "preview-thumb";
        img.src = URL.createObjectURL(file);
        img.style.maxWidth = "140px";
        img.style.borderRadius = "8px";
        img.style.marginTop = "6px";
        img.style.display = "block";
        infoEl.insertAdjacentElement("afterend", img);

        // baca isi file ke base64 lalu simpan ke currentData
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = reader.result.split(",")[1];
          const existing = currentData.find((d) => d.question_id === qid);
          if (existing) {
            existing.value = base64Data;
            existing.file_name = file.name;
            existing.file_type = file.type;
          } else {
            currentData.push({
              submission_id: submission.submission_id,
              question_id: qid,
              value: base64Data,
              file_name: file.name,
              file_type: file.type,
            });
          }
        };
        reader.readAsDataURL(file);
      } else {
        infoEl.textContent = "❌ Tidak ada file dipilih";
        infoEl.style.color = "#999";
      }
    });
  });

  // Evaluasi visibilitas awal
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

  // Dropdown listener nested otomatis
  formContainer.querySelectorAll("select").forEach((sel) => {
    sel.addEventListener("change", (e) => {
      const questionId = parseInt(sel.dataset.questionId);
      const value = sel.value;
      const label = sel.options[sel.selectedIndex]?.text || "";
      const newValue = value ? `${value}:${label}` : "";
      const selectedGroup = sel.options[sel.selectedIndex]?.dataset.group || "";

      const existing = currentData.find((d) => d.question_id === questionId);
      if (existing) existing.value = newValue;
      else
        currentData.push({
          submission_id: submission.submission_id,
          question_id: questionId,
          value: newValue,
        });

      // filter dropdown lain berdasarkan group
      formContainer.querySelectorAll("select").forEach((childSel) => {
        if (childSel === sel) return;
        const childCol = parseInt(childSel.dataset.collectionId);
        const allOpts = (dataOpsi || []).filter(
          (opt) => opt.collection_id === childCol
        );

        const hasGroupMatch = allOpts.some(
          (opt) =>
            opt.group && (opt.group === selectedGroup || opt.group === value)
        );
        if (!hasGroupMatch) return;

        const filtered = allOpts.filter(
          (opt) =>
            !opt.group ||
            opt.group === selectedGroup ||
            opt.group === value ||
            opt.group === label
        );

        const oldValue = childSel.value;
        childSel.innerHTML = `<option value="">Harap Pilih</option>${filtered
          .map(
            (opt) =>
              `<option value="${opt.value}" data-group="${opt.group || ""}" ${
                opt.value === oldValue ? "selected" : ""
              }>${opt.label}</option>`
          )
          .join("")}`;
      });

      evaluateVisibilityAll();
    });
  });

  // Tombol Simpan & Kirim ke Flutter
  const btnSave = document.createElement("button");
  btnSave.textContent = "💾 Simpan & Kirim ke Flutter";
  btnSave.style.cssText = `
    background:#2196f3;color:#fff;border:none;
    padding:10px 18px;border-radius:6px;
    cursor:pointer;margin-top:14px;display:block;
  `;
  formContainer.after(btnSave);

  btnSave.addEventListener("click", async () => {
    const payload = {
      submission_id: submission.submission_id,
      data: currentData.filter((d) => !!d.value),
    };

    // if (window.flutter_inappwebview) {
    //   await window.flutter_inappwebview.callHandler(
    //     "onFormSubmit",
    //     JSON.stringify(payload)
    //   );
    //   alert("✅ Data berhasil dikirim ke Flutter!");
    // } else {
    //   console.log("📦 Mode web:", payload);
    //   alert("⚠️ Flutter handler tidak tersedia (mode web).");
    // }
    if (window.FlutterChannel) {
      window.FlutterChannel.postMessage(
        JSON.stringify({
          type: "onFormSubmit",
          payload,
        })
      );
      alert("✅ Data berhasil dikirim ke Flutter!");
    } else {
      console.log("📦 Mode web:", payload);
      alert("⚠️ FlutterChannel tidak tersedia (mode web).");
    }
  });

  // Tombol kembali
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
