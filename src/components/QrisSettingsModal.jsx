import React, { useState } from "react";
import { uploadLogo } from "../db";
import { styles } from "../styles";

const DEFAULT_QRIS = "/qris.jpg";

export default function QrisSettingsModal({
  open,
  imageUrl,
  saving,
  setSaving,
  setToast,
  onSave,
  onClose,
}) {
  const [preview, setPreview] = useState(imageUrl || DEFAULT_QRIS);

  React.useEffect(() => {
    if (open) setPreview(imageUrl || DEFAULT_QRIS);
  }, [open, imageUrl]);

  if (!open) return null;

  return (
    <div className="jo-overlay-center" style={styles.overlay} onClick={() => onClose()}>
      <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>Gambar QRIS</div>
        <div style={styles.modalBody}>
          <p style={styles.mutedSmall}>
            Ganti gambar QRIS yang muncul di popup dukungan pengunjung. Upload file baru atau
            tempel URL gambar.
          </p>
          <img
            src={preview}
            alt="Pratinjau QRIS"
            style={{
              width: "100%",
              maxWidth: 260,
              height: "auto",
              borderRadius: 12,
              border: "1px solid #2C303A",
              display: "block",
              margin: "0 auto 14px",
              background: "#fff",
            }}
            onError={(e) => {
              e.target.src = DEFAULT_QRIS;
            }}
          />
          <label style={{ ...styles.uploadBtn, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Mengupload..." : "Upload Gambar QRIS Baru"}
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
                  const publicUrl = await uploadLogo(file, "qris");
                  setPreview(publicUrl);
                } catch (err) {
                  setToast(err.message || "Gagal upload QRIS");
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
            placeholder="atau tempel URL gambar QRIS"
            value={preview && preview !== DEFAULT_QRIS && !preview.startsWith("data:") ? preview : ""}
            onChange={(e) => setPreview(e.target.value || DEFAULT_QRIS)}
            disabled={saving}
          />
          <button
            type="button"
            style={styles.secondaryBtn}
            onClick={() => setPreview(DEFAULT_QRIS)}
            disabled={saving}
          >
            Kembalikan default
          </button>
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
            onClick={() => onSave(preview === DEFAULT_QRIS ? "" : preview)}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
