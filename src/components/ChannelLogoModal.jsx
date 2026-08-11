import React from "react";
import { uploadLogo } from "../db";
import { styles } from "../styles";

export default function ChannelLogoModal({
  open,
  logoNameInput,
  setLogoNameInput,
  logoUrlInput,
  setLogoUrlInput,
  customLogos,
  saving,
  setSaving,
  setToast,
  onSave,
  onRemove,
  onClose,
}) {
  if (!open) return null;

  return (
<div style={styles.overlay} onClick={() => onClose()}>
        <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalTitle}>Logo Channel</div>
          <p style={styles.mutedSmall}>
            Atur logo buat nama channel/platform tertentu. Begitu disimpan, logo ini otomatis
            dipakai di semua "LIVE ON" (event maupun jadwal) yang namanya cocok — nggak
            case-sensitive.
          </p>
          <input
            style={styles.input}
            placeholder="Nama channel (mis. Vidio, TVRI Sport)"
            value={logoNameInput}
            onChange={(e) => setLogoNameInput(e.target.value)}
          />
          <label style={{ ...styles.uploadBtn, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Mengupload..." : "Upload Gambar Logo"}
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
                  const publicUrl = await uploadLogo(file, "channels");
                  setLogoUrlInput(publicUrl);
                } catch (err) {
                  setToast(err.message || "Gagal upload logo");
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
            placeholder="atau tempel URL logo"
            value={logoUrlInput && logoUrlInput.startsWith("data:") ? "" : logoUrlInput || ""}
            onChange={(e) => setLogoUrlInput(e.target.value)}
            disabled={saving}
          />
          {logoUrlInput && (
            <div style={styles.logoPreviewRow}>
              <img
                src={logoUrlInput}
                alt=""
                style={styles.logoPreviewImg}
                onError={(e) => (e.target.style.display = "none")}
              />
              <span style={styles.mutedSmall}>Pratinjau</span>
              <button type="button" style={styles.rowRemoveBtn} onClick={() => setLogoUrlInput("")}>
                ×
              </button>
            </div>
          )}
          <button
            style={{
              ...styles.primaryBtn,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Simpan Logo"}
          </button>

          <div style={styles.matchEditorLabel}>Logo Tersimpan</div>
          {Object.keys(customLogos).length === 0 && (
            <div style={styles.mutedSmall}>Belum ada logo custom.</div>
          )}
          {Object.entries(customLogos).map(([name, url]) => (
            <div key={name} style={styles.logoListRow}>
              <img
                src={url}
                alt=""
                style={styles.logoPreviewImg}
                onError={(e) => (e.target.style.display = "none")}
              />
              <span style={styles.logoListName}>{name}</span>
              <button style={styles.rowRemoveBtn} onClick={() => onRemove(name)}>
                ×
              </button>
            </div>
          ))}

          <div style={styles.modalActions}>
            <button style={styles.secondaryBtn} onClick={() => onClose()}>
              Tutup
            </button>
          </div>
        </div>
      </div>
  );
}
