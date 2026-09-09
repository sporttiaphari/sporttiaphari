import React, { useEffect, useState } from "react";
import { styles } from "../styles";

export default function NavSettingsModal({ open, labels, saving, onSave, onClose }) {
  const [daily, setDaily] = useState(labels?.daily || "Harian");
  const [major, setMajor] = useState(labels?.major || "Event Besar");

  useEffect(() => {
    if (open) {
      setDaily(labels?.daily || "Harian");
      setMajor(labels?.major || "Event Besar");
    }
  }, [open, labels]);

  if (!open) return null;

  return (
    <div className="jo-overlay-center" style={styles.overlay} onClick={() => onClose()}>
      <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>Ubah Nama Tombol Halaman</div>
        <div style={styles.modalBody}>
          <p style={styles.mutedSmall}>
            Ubah teks tombol di header. Pengunjung akan melihat nama ini di beranda dan halaman
            event besar.
          </p>
          <div style={styles.matchEditorLabel}>Tab halaman utama</div>
          <input
            style={styles.input}
            value={daily}
            placeholder="Harian"
            onChange={(e) => setDaily(e.target.value)}
          />
          <div style={styles.matchEditorLabel}>Tombol halaman baru (contoh: Event Besar)</div>
          <input
            style={styles.input}
            value={major}
            placeholder="Event Besar"
            onChange={(e) => setMajor(e.target.value)}
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
                daily: (daily || "Harian").trim() || "Harian",
                major: (major || "Event Besar").trim() || "Event Besar",
              })
            }
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
