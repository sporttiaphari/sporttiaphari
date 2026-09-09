import React, { useEffect, useState } from "react";
import { styles } from "../styles";

export default function ContributorsModal({
  open,
  primaryEmail,
  emails,
  saving,
  onSave,
  onClose,
}) {
  const [list, setList] = useState([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (open) {
      setList(Array.isArray(emails) ? [...emails] : []);
      setDraft("");
    }
  }, [open, emails]);

  if (!open) return null;

  const add = () => {
    const email = draft.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (email === (primaryEmail || "").toLowerCase()) {
      setDraft("");
      return;
    }
    if (list.includes(email)) {
      setDraft("");
      return;
    }
    setList([...list, email]);
    setDraft("");
  };

  return (
    <div className="jo-overlay-center" style={styles.overlay} onClick={() => onClose()}>
      <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>Akses Kontributor</div>
        <div style={styles.modalBody}>
          <p style={styles.mutedSmall}>
            Email di bawah bisa login Developer Mode dan edit jadwal. Mereka juga harus punya akun
            di Supabase Authentication (email + password).
          </p>
          <div style={styles.matchEditorLabel}>Admin utama (dari env, tidak bisa dihapus)</div>
          <div style={{ ...styles.channelRow, marginBottom: 12 }}>
            <span style={{ ...styles.logoListName, flex: 1 }}>{primaryEmail || "—"}</span>
          </div>
          <div style={styles.matchEditorLabel}>Email kontributor</div>
          {list.length === 0 && (
            <p style={styles.mutedSmall}>Belum ada kontributor tambahan.</p>
          )}
          {list.map((email, idx) => (
            <div key={email} style={styles.channelRow}>
              <span style={{ ...styles.logoListName, flex: 1, minWidth: 0 }}>{email}</span>
              <button
                type="button"
                style={styles.rowRemoveBtn}
                onClick={() => setList(list.filter((_, i) => i !== idx))}
                title="Hapus akses"
              >
                ×
              </button>
            </div>
          ))}
          <div style={styles.channelRow}>
            <input
              style={styles.channelInput}
              placeholder="email@contoh.com"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <button type="button" style={{ ...styles.editBtn, minWidth: 44, height: 44 }} onClick={add}>
              +
            </button>
          </div>
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
            onClick={() => onSave(list)}
          >
            {saving ? "Menyimpan..." : "Simpan Akses"}
          </button>
        </div>
      </div>
    </div>
  );
}
