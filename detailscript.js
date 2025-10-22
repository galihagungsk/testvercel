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

/*
 * ✅ Fungsi untuk ambil kembali data dari sessionStorage + dekompres
 */
function getDataFromSession(key) {
  const container = document.getElementById("flutter-data-container");
  try {
    const compressedData = sessionStorage.getItem(key);
    if (!compressedData) return null;
    const decompressed = LZString.decompressFromUTF16(compressedData);
    return decompressed ? JSON.parse(decompressed) : null;
  } catch (err) {
    console.warn("❌ Gagal ambil data dari session:", key, err);
    return null;
  }
}

// function tampilkanDetail(submission, container, dataForm, data, dataOpsi) {
function tampilkanDetail() {
  const container = document.getElementById("flutter-data-container");
  let submission = getDataFromSession("selectedSubmission");
  let dataForm = getDataFromSession("selectedForm");
  let dataOpsi = getDataFromSession("opsi");

  if (!submission) {
    container.innerHTML = `<p>⚠️ Data submission tidak ditemukan.</p>`;
    return;
  }

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
  let cekData = [];

  function getValue(question, data) {
    if (!question || !Array.isArray(data)) return "";
    const found = data.find((d) => d.question_id === question.question_id);
    return found ? found.value || "" : "";
  }

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

  // ===============================
  // 🔹 Render dinamis setiap page & group
  // ===============================
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
        // 🧩 FIELD: DROPDOWN
        // ===============================
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
              }" accept="image/*" capture="environment" data-question-id="${
            q.question_id
          }" style="display:none"/>
              <button type="button" class="btn-camera" data-target="${
                q.code
              }" style="background:#2196f3;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;">
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

  // 📸 Handler kamera & file upload (format compact)
  document.querySelectorAll(".btn-camera").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      document.getElementById(targetId).click();
    });
  });

  // ✅ Perbaikan typo selector (ini sebelumnya menyebabkan JS berhenti total)
  formContainer.querySelectorAll('input[type="text"]').forEach((textInput) => {
    3;
    textInput.addEventListener("input", async (e) => {
      const qid = parseInt(e.target.dataset.questionId);
      const value = e.target.value;

      // Hapus data jika value kosong/null
      if (!value) {
        // Hapus dari cekData
        // cekData = cekData.filter((d) => d.question_id !== questionId);

        // // Hapus dari currentData
        currentData = currentData.filter((d) => d.question_id !== questionId);

        // Lanjutkan ke evaluasi tampilan saja
        evaluateVisibilityAll();
        return;
      }
      const loc = await getUserLocation();
      const entry = {
        submission_id: submission.submission_id,
        question_id: qid,
        value: value,
        lat: loc ? loc.lat : null,
        lon: loc ? loc.lon : null,
      };

      // cekData.push(entry);

      const existing = currentData.find((d) => d.question_id === qid);
      if (existing) existing.value = value;
      else currentData.push(entry);
    });
  });

  // ✅ Perbaikan besar untuk ambil foto & masuk ke cekData
  formContainer.querySelectorAll('input[type="file"]').forEach((fileInput) => {
    fileInput.addEventListener("change", (e) => {
      try {
        const file = e.target.files[0];
        if (!file) {
          console.warn("⚠️ Tidak ada file yang dipilih.");
          return;
        }

        const reader = new FileReader();
        const qid = parseInt(e.target.getAttribute("data-question-id"));
        const parent = e.target.closest(".photo-upload-wrapper");
        const infoEl = parent.querySelector(".file-info");
        // const imgPreview =
        //   parent.querySelector(".preview-thumb") ||
        //   document.createElement("img");

        reader.onload = () => {
          const img = new Image();
          img.src = reader.result;

          img.onload = async () => {
            // Gunakan ukuran asli gambar
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            // 🔥 Kompres hanya kualitas, tanpa resize
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7); // 70% kualitas
            const compressedBase64 = compressedDataUrl.split(",")[1];
            const loc = await getUserLocation();

            // Simpan ke currentData
            const existing = currentData.find((d) => d.question_id === qid);
            if (existing) {
              existing.value = compressedBase64;
            } else {
              currentData.push({
                submission_id: submission.submission_id,
                question_id: qid,
                value: compressedBase64,
                lat: loc ? loc.lat : null,
                lon: loc ? loc.lon : null,
              });
            }

            // Log ukuran sebelum & sesudah kompres
            console.log("✅ Foto dikompress tanpa resize:", {
              originalSize: reader.result.length,
              compressedSize: compressedBase64.length,
            });

            // Ubah status di UI
            infoEl.textContent = "📷 Sudah diunggah";
            infoEl.style.color = "green";
          };
        };

        reader.readAsDataURL(file);
      } catch (error) {
        console.error("❌ Gagal memproses file foto:", error);
      }
    });
  });

  // Evaluasi decision visibility & nested dropdown
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

  formContainer.querySelectorAll("select").forEach((sel) => {
    sel.addEventListener("change", async (e) => {
      const questionId = parseInt(sel.dataset.questionId);
      const value = sel.value;
      const label = sel.options[sel.selectedIndex]?.text || "";
      const newValue = value ? `${value}:${label}` : "";
      const selectedGroup = sel.options[sel.selectedIndex]?.dataset.group || "";

      // Hapus data jika value kosong/null
      if (!value) {
        // Hapus dari cekData
        // cekData = cekData.filter((d) => d.question_id !== questionId);

        // // Hapus dari currentData
        currentData = currentData.filter((d) => d.question_id !== questionId);

        // Lanjutkan ke evaluasi tampilan saja
        evaluateVisibilityAll();
        return;
      }

      const existing = currentData.find((d) => d.question_id === questionId);
      const loc = await getUserLocation();
      // cekData.push({
      //   submission_id: submission.submission_id,
      //   question_id: questionId,
      //   value: newValue,
      //   lat: loc ? loc.lat : null,
      //   lon: loc ? loc.lon : null,
      // });
      if (existing) existing.value = newValue;
      else
        currentData.push({
          submission_id: submission.submission_id,
          question_id: questionId,
          value: newValue,
          lat: loc ? loc.lat : null,
          lon: loc ? loc.lon : null,
        });

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

  btnSave.addEventListener("click", () => {
    dataForm.data = currentData;
    const data = {
      submission_id: submission.submission_id,
      data: dataForm,
      // data: LZString.compressToUTF16(JSON.stringify(dataForm)),
      // data: cekData,
    };
    if (window.flutter_inappwebview) {
      window.flutter_inappwebview.callHandler(
        "FlutterChannel",
        JSON.stringify({ status: "update", type: "from", data })
      );
      alert("✅ Data berhasil dikirim ke Flutter!");
    } else {
      console.log("⚠️ Tidak di dalam Flutter, data hasil form:", data);
    }
  });

  container.querySelector("#btnBack").addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

window.addEventListener("load", () => {
  console.log("🌐 Halaman detail dimuat, coba ambil sessionStorage...");

  // Panggil tampilkanDetail hanya jika data ada
  if (sessionStorage.getItem("selectedSubmission")) {
    try {
      tampilkanDetail();
      console.log("✅ Fungsi tampilkanDetail() dijalankan");
    } catch (err) {
      console.error("❌ Error saat menjalankan tampilkanDetail():", err);
    }
  } else {
    document.getElementById(
      "flutter-data-container"
    ).innerHTML = `<p style="color:red;">⚠️ Tidak ada data di sessionStorage. Pastikan halaman sebelumnya mengirim data.</p>`;
    console.warn("❗ SessionStorage kosong. Tidak bisa load detail.");
  }
});
