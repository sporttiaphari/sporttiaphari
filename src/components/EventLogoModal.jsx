import React, { useMemo, useState } from "react";
import { uploadLogo } from "../db";
import { styles } from "../styles";

export default function EventLogoModal({
  open,
  eventLogoNameInput,
  setEventLogoNameInput,
  eventLogoUrlInput,
  setEventLogoUrlInput,
  eventLogos,
  saving,
  setSaving,
  setToast,
  onSave,
  onRemove,
  onClose,
}) {
  const [filter, setFilter] = useState("");

  const filteredLogos = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const entries = Object.entries(eventLogos || {});
    if (!q) return entries;
    return entries.filter(([name]) => name.toLowerCase().includes(q));
  }, [eventLogos, filter]);

  if (!open) return null;

  return (
    <div className="jo-overlay-center" style={styles.overlay} onClick={() => onClose()}>
      <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>Logo Event</div>
        <div style={styles.modalBody}>
          <p style={styles.mutedSmall}>
            Simpan logo event biar otomatis terisi saat nama event cocok (tidak case-sensitive).
          </p>
          <input
            style={styles.input}
            placeholder="Nama event (mis. ATP Masters 1000 Canada Open)"
            value={eventLogoNameInput}
            onChange={(e) => setEventLogoNameInput(e.target.value)}
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
                  const publicUrl = await uploadLogo(file, "events");
                  setEventLogoUrlInput(publicUrl);
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
            value={
              eventLogoUrlInput && eventLogoUrlInput.startsWith("data:")
                ? ""
                : eventLogoUrlInput || ""
            }
            onChange={(e) => setEventLogoUrlInput(e.target.value)}
            disabled={saving}
          />
          {eventLogoUrlInput && (
            <div style={styles.logoPreviewRow}>
              <img
                src={eventLogoUrlInput}
                alt=""
                style={styles.logoPreviewImg}
                onError={(e) => (e.target.style.display = "none")}
              />
              <span style={styles.mutedSmall}>Pratinjau</span>
              <button
                type="button"
                style={styles.rowRemoveBtn}
                onClick={() => setEventLogoUrlInput("")}
              >
                ×
              </button>
            </div>
          )}
          <button
            style={{
              ...styles.primaryBtn,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer",
              width: "100%",
              marginBottom: 12,
            }}
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "Menyimpan..." : "Simpan Logo"}
          </button>

          <div style={styles.matchEditorLabel}>
            Logo Tersimpan ({Object.keys(eventLogos || {}).length})
          </div>
          {Object.keys(eventLogos || {}).length > 0 && (
            <input
              style={styles.input}
              type="search"
              placeholder="Cari logo event..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoComplete="off"
            />
          )}
          {Object.keys(eventLogos || {}).length === 0 && (
            <div style={styles.mutedSmall}>Belum ada logo event tersimpan.</div>
          )}
          {Object.keys(eventLogos || {}).length > 0 && filteredLogos.length === 0 && (
            <div style={styles.mutedSmall}>Tidak ada logo cocok dengan “{filter.trim()}”.</div>
          )}
          {filteredLogos.map(([name, url]) => (
            <div key={name} style={styles.logoListRow}>
              <img
                src={url}
                alt=""
                style={styles.logoPreviewImg}
                onError={(e) => (e.target.style.display = "none")}
              />
              <span style={styles.logoListName}>{name}</span>
              <button style={styles.rowRemoveBtn} onClick={() => onRemove(name)} title="Hapus">
                ×
              </button>
            </div>
          ))}
        </div>

        <div style={styles.modalActions}>
          <button style={styles.secondaryBtn} onClick={() => onClose()}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
