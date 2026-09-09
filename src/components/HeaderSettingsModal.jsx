import React, { useEffect, useState } from "react";
import { uploadLogo } from "../db";
import { styles } from "../styles";
import { DEFAULT_HEADERS } from "../utils/header";

export default function HeaderSettingsModal({
  open,
  page,
  pageLabel,
  value,
  fallbackLogo,
  saving,
  setSaving,
  setToast,
  onSave,
  onClose,
}) {
  const defaults = DEFAULT_HEADERS[page] || DEFAULT_HEADERS.daily;
  const [eyebrow, setEyebrow] = useState("");
  const [headline, setHeadline] = useState("");
  const [note, setNote] = useState("");
  const [logo, setLogo] = useState("");

  useEffect(() => {
    if (!open) return;
    setEyebrow(value?.eyebrow || defaults.eyebrow);
    setHeadline(value?.headline || defaults.headline);
    setNote(value?.note || defaults.note);
    setLogo(value?.logo || "");
  }, [open, page, value]);

  if (!open) return null;

  const preview = logo || fallbackLogo;

  return (
    <div className="jo-overlay-center" style={styles.overlay} onClick={() => onClose()}>
      <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>Edit Header — {pageLabel}</div>
        <div style={styles.modalBody}>
          <p style={styles.mutedSmall}>
            Perubahan hanya berlaku di halaman ini. Halaman lain punya header sendiri.
          </p>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            {preview ? (
              <img
                src={preview}
                alt=""
                style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 14, border: "1px solid #2C303A" }}
              />
            ) : null}
          </div>

          <label style={{ ...styles.uploadBtn, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Mengupload..." : "Ganti Gambar Header"}
            <input
              type="file"
              accept="image/*"
              style={styles.hiddenFileInput}
              disabled={saving}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setSaving(true);
                try {
                  const url = await uploadLogo(file, "brand");
                  setLogo(url);
                } catch (err) {
                  setToast(err.message || "Gagal upload gambar");
                  setTimeout(() => setToast(""), 3000);
                } finally {
                  setSaving(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
          <input
            style={styles.input}
            placeholder="atau tempel URL gambar"
            value={logo && !logo.startsWith("data:") ? logo : ""}
            onChange={(e) => setLogo(e.target.value)}
            disabled={saving}
          />
          <button
            type="button"
            style={styles.secondaryBtn}
            disabled={saving}
            onClick={() => setLogo("")}
          >
            Pakai logo default
          </button>

          <div style={styles.matchEditorLabel}>Baris kecil di atas (eyebrow)</div>
          <input
            style={styles.input}
            value={eyebrow}
            onChange={(e) => setEyebrow(e.target.value)}
            placeholder="JADWAL OLAHRAGA"
          />
          <div style={styles.matchEditorLabel}>Judul besar</div>
          <input
            style={styles.input}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="@sporttiaphari"
          />
          <div style={styles.matchEditorLabel}>Keterangan</div>
          <textarea
            style={{ ...styles.input, minHeight: 88, resize: "vertical" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Keterangan di bawah judul"
          />
        </div>
        <div style={styles.modalActions}>
          <button style={styles.secondaryBtn} onClick={() => onClose()} disabled={saving}>
            Batal
          </button>
          <button
            style={{
              ...styles.primaryBtn,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
            disabled={saving}
            onClick={() =>
              onSave({
                eyebrow: eyebrow.trim() || defaults.eyebrow,
                headline: headline.trim() || defaults.headline,
                note: note.trim() || defaults.note,
                logo: (logo || "").trim(),
              })
            }
          >
            {saving ? "Menyimpan..." : "Simpan Header"}
          </button>
        </div>
      </div>
    </div>
  );
}
