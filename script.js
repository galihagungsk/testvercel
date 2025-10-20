// =======================================
// ✅ Fixed JS for Flutter InAppWebView Form
// - Robust try/catch around critical paths
// - Correct selectors & event listeners
// - Foto (camera/file) stored into cekData
// - Text & dropdown changes stored into cekData
// - Payload sent to Flutter via callHandler
// - Defensive checks to avoid undefined refs
// =======================================

(function () {
  "use strict";

  // ===============================
  // 📦 Inisialisasi saat halaman dibuka
  // ===============================
  window.addEventListener("load", () => {
    try {
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
    } catch (err) {
      console.error("❌ Error saat init window load:", err);
    }
  });

  // ===============================
  // 🔁 Terima data dari Flutter (Fungsi ini dipanggil dari Flutter)
  // ===============================
  window.receiveDataFromFlutter = function receiveDataFromFlutter(data) {
    try {
      console.log("📩 Menerima data dari Flutter:", data);

      const container = document.getElementById("flutter-data-container");
      if (!container) return;

      if (typeof data === "string") data = JSON.parse(data);
      window.flutterReceivedData = data;

      tampilkanHasil(data, container);

      // ✅ Kirim respon balik ke Flutter via InAppWebView
      if (window.flutter_inappwebview) {
        window.flutter_inappwebview.callHandler(
          "FlutterChannel",
          JSON.stringify({
            status: "ok",
            receivedKeys: Object.keys(data || {}),
          })
        );
      }
    } catch (error) {
      console.error("❌ Gagal parsing data dari Flutter:", error, data);
    }
  };

  // ===============================
  // 🧱 Tampilkan daftar submission
  // ===============================
  function tampilkanHasil(data, container) {
    try {
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
          const submission = data.process.find(
            (s) => String(s.submission_id) === String(id)
          );
          const selectedForm = Array.isArray(data.form)
            ? data.form.find(
                (f) =>
                  f.data?.some((d) => String(d.submission_id) === String(id)) ||
                  f.pages?.some((p) =>
                    p.questionGroups?.some((g) =>
                      g.questions?.some(
                        (q) => String(q.submission_id) === String(id)
                      )
                    )
                  )
              )
            : data.form;

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
            <button id="btnBackToList">⬅ Kembali</button>
          `;
            const btn = container.querySelector("#btnBackToList");
            if (btn)
              btn.addEventListener("click", () =>
                tampilkanHasil(data, container)
              );
          }
        });
      });
    } catch (err) {
      console.error("❌ Error di tampilkanHasil:", err);
    }
  }

  // ===============================
  // 🧱 Tampilkan halaman detail submission
  // ===============================
  function tampilkanDetail(
    submission,
    container,
    dataForm,
    dataPertanyaan,
    dataOpsi
  ) {
    try {
      container.innerHTML = `
      <button id="btnBack" style="background:#4caf50;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;margin-bottom:12px;">⬅ Kembali</button>
      <h2>Detail ID ${submission.submission_id}</h2>
      <p><strong>Tanggal Submit:</strong> ${
        submission.submission_date || "-"
      }</p>
      <p><strong>Pesan:</strong> ${submission.submit_message || "-"}</p>
      <div id="formContainer" style="margin-top:10px;"></div>
    `;

      const formContainer = container.querySelector("#formContainer");
      const formData = Array.isArray(dataForm) ? dataForm[0] : dataForm;
      if (!formData?.pages) {
        formContainer.innerHTML = `<p>⚠️ Tidak ada struktur form untuk submission ini.</p>`;
        return;
      }

      // Data runtime
      let currentData = Array.isArray(formData.data) ? [...formData.data] : [];
      let cekData = []; // ⬅️ kumpulkan perubahan baru (text, dropdown, foto)

      function getValue(question, data) {
        if (!question || !Array.isArray(data)) return "";
        const found = data.find(
          (d) => Number(d.question_id) === Number(question.question_id)
        );
        return found ? found.value ?? "" : "";
      }

      function isVisibleDicission(page, groupId, data) {
        if (!page || !groupId) return true;
        const dicissions = page.dicissions || [];
        if (!Array.isArray(dicissions) || dicissions.length === 0) return true;
        let result = true;
        const related = dicissions.filter(
          (d) => Number(d.group_id) === Number(groupId)
        );
        if (related.length === 0) return true;

        for (const dic of related) {
          const sourceGroup = page.questionGroups?.find(
            (g) => Number(g.group_id) === Number(dic.dicission_group_id)
          );
          const sourceQuestion = sourceGroup?.questions?.find(
            (q) => Number(q.question_id) === Number(dic.dicission_question_id)
          );
          const refValue = getValue(sourceQuestion, data);
          const refKey = (refValue || "").includes(":")
            ? refValue.split(":")[0]
            : refValue;

          switch (dic.dicission_type) {
            case 402: // equals
              result =
                refKey === dic.dicission_value ||
                refValue === dic.dicission_value;
              break;
            case 403: // not equals
              result =
                refKey !== dic.dicission_value &&
                refValue !== dic.dicission_value;
              break;
            default:
              result = true;
          }
          if (!result) break;
        }
        return result;
      }

      // ===============================
      // 🔹 Render dinamis setiap page & group
      // ===============================
      try {
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
                Number(q.mandatory) === 1
                  ? "<span style='color:red'>*</span>"
                  : ""
              }</label>`;
              const saved = getValue(q, currentData);
              let inputField = "";

              // ===============================
              // 🧩 FIELD: DROPDOWN
              // ===============================
              if (q.type === "dropdown") {
                const opts = (dataOpsi || []).filter(
                  (opt) => Number(opt.collection_id) === Number(q.collection_id)
                );
                const optionsHtml = opts
                  .map((opt) => {
                    const savedKey = (saved || "").includes(":")
                      ? saved.split(":")[0]
                      : saved;
                    const selected =
                      String(opt.value) == String(saved) ||
                      String(opt.value) == String(savedKey)
                        ? "selected"
                        : "";
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
              }

              // ===============================
              // 🧩 FIELD: FOTO (Compact Format)
              // ===============================
              else if (q.type === "foto") {
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
                    data-question-id="${q.question_id}" style="display:none"/>
                  <button type="button" class="btn-camera" data-target="${
                    q.code
                  }"
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
              // 🧩 FIELD: TEXT
              // ===============================
              else {
                inputField = `<input type="text" id="${
                  q.code
                }" data-question-id="${q.question_id}" value="${
                  saved || ""
                }" placeholder="${q.hint || ""}" />`;
              }

              html += `<div class="form-group" style="margin-bottom:12px;">${label}${inputField}</div>`;
            });

            groupEl.innerHTML = html;
            pageEl.appendChild(groupEl);
          });

          formContainer.appendChild(pageEl);
        });
      } catch (renderErr) {
        console.error("❌ Error saat render form:", renderErr);
      }

      // ===============================
      // 📸 Handler kamera & file upload (format compact)
      // ===============================
      try {
        document.querySelectorAll(".btn-camera").forEach((btn) => {
          btn.addEventListener("click", () => {
            try {
              const targetId = btn.getAttribute("data-target");
              const input = document.getElementById(targetId);
              if (!input) {
                console.error(
                  "❌ Input file tidak ditemukan untuk target:",
                  targetId
                );
                return;
              }
              input.click();
            } catch (btnErr) {
              console.error("❌ Error saat klik tombol kamera:", btnErr);
            }
          });
        });
      } catch (camErr) {
        console.error("❌ Error binding tombol kamera:", camErr);
      }

      // ===============================
      // 📝 Input Text -> cekData
      // ===============================
      try {
        formContainer
          .querySelectorAll('input[type="text"]')
          .forEach((textInput) => {
            textInput.addEventListener("input", (e) => {
              try {
                const qid = parseInt(e.target.dataset.questionId);
                const value = e.target.value;
                const entry = {
                  submission_id: submission.submission_id,
                  question_id: qid,
                  value: value,
                  lat: 2,
                  lon: 2,
                };
                cekData.push(entry);

                const existing = currentData.find(
                  (d) => Number(d.question_id) === Number(qid)
                );
                if (existing) existing.value = value;
                else currentData.push(entry);

                console.log("✏️ Text changed:", entry);
              } catch (err) {
                console.error("❌ Error on text input change:", err);
              }
            });
          });
      } catch (txtErr) {
        console.error("❌ Error binding text inputs:", txtErr);
      }

      // ===============================
      // 🖼️ File (Foto) -> cekData
      // ===============================
      try {
        formContainer
          .querySelectorAll('input[type="file"]')
          .forEach((fileInput) => {
            fileInput.addEventListener("change", (e) => {
              try {
                const file = e.target.files && e.target.files[0];
                if (!file) {
                  console.warn("⚠️ Tidak ada file dipilih");
                  return;
                }

                console.log("📂 File dipilih:", file.name);

                const reader = new FileReader();
                const qid = parseInt(e.target.getAttribute("data-question-id"));
                const parent = e.target.closest(".photo-upload-wrapper");
                if (!parent) {
                  console.error(
                    "❌ parent .photo-upload-wrapper tidak ditemukan"
                  );
                  return;
                }
                const infoEl = parent.querySelector(".file-info");
                const imgPreview =
                  parent.querySelector(".preview-thumb") ||
                  document.createElement("img");

                reader.onload = () => {
                  try {
                    console.log("🚀 reader.onload dipicu");
                    const base64DataURL = reader.result;
                    if (!base64DataURL)
                      throw new Error("Base64 kosong dari FileReader");

                    const base64Data = String(base64DataURL).split(",")[1];

                    const dataEntry = {
                      submission_id: submission.submission_id,
                      question_id: qid,
                      value: base64Data,
                      lat: 2,
                      lon: 2,
                    };

                    // ✅ Masukkan ke cekData
                    cekData.push(dataEntry);

                    // ✅ Konsistenkan dengan currentData
                    const existing = currentData.find(
                      (d) => Number(d.question_id) === Number(qid)
                    );
                    if (existing) existing.value = base64Data;
                    else currentData.push(dataEntry);

                    // ✅ Tampilkan preview
                    imgPreview.src = base64DataURL;
                    imgPreview.className = "preview-thumb";
                    imgPreview.style =
                      "max-width:140px;border-radius:8px;margin-top:6px;display:block;";
                    if (!imgPreview.parentElement)
                      parent.appendChild(imgPreview);

                    if (infoEl) {
                      infoEl.textContent = "📷 Sudah diunggah";
                      infoEl.style.color = "green";
                    }

                    // ✅ Debug log
                    console.log("✅ Foto tersimpan:", dataEntry);
                    console.log("📦 cekData:", cekData);
                  } catch (onloadErr) {
                    console.error(
                      "❌ Error saat proses foto (onload):",
                      onloadErr
                    );
                    alert(
                      "Terjadi error saat proses foto: " +
                        (onloadErr?.message || onloadErr)
                    );
                  }
                };

                reader.onerror = (reErr) => {
                  console.error("❌ FileReader error:", reErr);
                };

                reader.readAsDataURL(file);
              } catch (chErr) {
                console.error("❌ Error di change event file:", chErr);
              }
            });
          });
      } catch (fileBindErr) {
        console.error("❌ Error binding file inputs:", fileBindErr);
      }

      // ===============================
      // 👁️ Evaluasi decision visibility & nested dropdown
      // ===============================
      function evaluateVisibilityAll() {
        try {
          formData.pages.forEach((page) => {
            (page.questionGroups || []).forEach((group) => {
              const groupEl = formContainer.querySelector(
                `[data-group-id="${group.group_id}"]`
              );
              if (!groupEl) return;
              const visible = isVisibleDicission(
                page,
                group.group_id,
                currentData
              );
              groupEl.style.display = visible ? "block" : "none";
            });
          });
        } catch (visErr) {
          console.error("❌ Error evaluateVisibilityAll:", visErr);
        }
      }
      evaluateVisibilityAll();

      // ===============================
      // 🔽 Dropdown -> cekData + filter anak
      // ===============================
      try {
        formContainer.querySelectorAll("select").forEach((sel) => {
          sel.addEventListener("change", () => {
            try {
              const questionId = parseInt(sel.dataset.questionId);
              const value = sel.value;
              const label = sel.options[sel.selectedIndex]?.text || "";
              const newValue = value ? `${value}:${label}` : "";
              const selectedGroup =
                sel.options[sel.selectedIndex]?.dataset.group || "";

              const entry = {
                submission_id: submission.submission_id,
                question_id: questionId,
                value: newValue,
                lat: 2,
                lon: 2,
              };
              cekData.push(entry);

              const existing = currentData.find(
                (d) => Number(d.question_id) === Number(questionId)
              );
              if (existing) existing.value = newValue;
              else currentData.push(entry);

              // Filter dropdown anak
              formContainer.querySelectorAll("select").forEach((childSel) => {
                if (childSel === sel) return;
                const childCol = parseInt(childSel.dataset.collectionId);
                const allOpts = (dataOpsi || []).filter(
                  (opt) => Number(opt.collection_id) === Number(childCol)
                );

                const hasGroupMatch = allOpts.some(
                  (opt) =>
                    opt.group &&
                    (String(opt.group) === String(selectedGroup) ||
                      String(opt.group) === String(value))
                );
                if (!hasGroupMatch) return;

                const filtered = allOpts.filter(
                  (opt) =>
                    !opt.group ||
                    String(opt.group) === String(selectedGroup) ||
                    String(opt.group) === String(value) ||
                    String(opt.group) === String(label)
                );

                const oldValue = childSel.value;
                childSel.innerHTML =
                  `<option value="">Harap Pilih</option>` +
                  filtered
                    .map(
                      (opt) =>
                        `<option value="${opt.value}" data-group="${
                          opt.group || ""
                        }" ${
                          String(opt.value) === String(oldValue)
                            ? "selected"
                            : ""
                        }>${opt.label}</option>`
                    )
                    .join("");
              });

              evaluateVisibilityAll();
              console.log("🔽 Dropdown changed:", entry);
            } catch (ddErr) {
              console.error("❌ Error on dropdown change:", ddErr);
            }
          });
        });
      } catch (ddBindErr) {
        console.error("❌ Error binding dropdowns:", ddBindErr);
      }

      // ===============================
      // 💾 Tombol Simpan & Kirim ke Flutter
      // ===============================
      try {
        const btnSave = document.createElement("button");
        btnSave.textContent = "💾 Simpan & Kirim ke Flutter";
        btnSave.style.cssText = `
        background:#2196f3;color:#fff;border:none;
        padding:10px 18px;border-radius:6px;
        cursor:pointer;margin-top:14px;display:block;
      `;
        formContainer.after(btnSave);

        btnSave.addEventListener("click", () => {
          try {
            const payload = {
              submission_id: submission.submission_id,
              data: cekData, // kirim hanya perubahan baru
            };

            console.log("📤 Payload akan dikirim ke Flutter:", payload);

            if (window.flutter_inappwebview) {
              window.flutter_inappwebview.callHandler(
                "FlutterChannel",
                JSON.stringify({ type: "onFormSubmit", payload })
              );
              alert("✅ Data berhasil dikirim ke Flutter!");
            } else {
              console.log(
                "⚠️ Tidak di dalam Flutter, data hasil form:",
                payload
              );
            }
          } catch (saveErr) {
            console.error("❌ Error saat klik simpan:", saveErr);
          }
        });
      } catch (saveBindErr) {
        console.error("❌ Error membuat tombol Simpan:", saveBindErr);
      }

      // ===============================
      // 🔙 Back ke list
      // ===============================
      const backBtn = container.querySelector("#btnBack");
      if (backBtn) {
        backBtn.addEventListener("click", () => {
          try {
            tampilkanHasil(window.flutterReceivedData, container);
          } catch (bkErr) {
            console.error("❌ Error saat kembali ke list:", bkErr);
          }
        });
      }
    } catch (err) {
      console.error("❌ Error di tampilkanDetail:", err);
    }
  }

  // ===============================
  // 🌐 Listener koneksi (opsional)
  // ===============================
  window.addEventListener("offline", () =>
    console.log("⚠️ Mode offline aktif")
  );
  window.addEventListener("online", () => console.log("✅ Kembali online"));
})();
