import React from "react";
import { styles } from "../styles";

export function SuggestModal({
  open,
  suggestMessage,
  setSuggestMessage,
  suggestContact,
  setSuggestContact,
  suggestSending,
  onClose,
  onSubmit,
}) {
  if (!open) return null;
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>Kasih Saran</div>
        <p style={styles.mutedSmall}>
          Ada jadwal yang salah, event yang mau ditambahin, atau ide lain? Kasih tau di sini.
        </p>
        <textarea
          style={{ ...styles.input, height: 100, resize: "none" }}
          placeholder="Tulis saran kamu..."
          value={suggestMessage}
          onChange={(e) => setSuggestMessage(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="Kontak kamu (opsional, mis. IG/email, buat dibales)"
          value={suggestContact}
          onChange={(e) => setSuggestContact(e.target.value)}
        />
        <div style={styles.modalActions}>
          <button
            style={styles.secondaryBtn}
            onClick={() => {
              onClose();
              setSuggestMessage("");
              setSuggestContact("");
            }}
          >
            Batal
          </button>
          <button
            style={styles.primaryBtn}
            onClick={onSubmit}
            disabled={suggestSending || !suggestMessage.trim()}
          >
            {suggestSending ? "Mengirim..." : "Kirim"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InboxModal({ open, suggestions, onClose, onDelete }) {
  if (!open) return null;
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>Saran Masuk</div>
        {suggestions.length === 0 && (
          <div style={styles.mutedSmall}>Belum ada saran yang masuk.</div>
        )}
        {suggestions.map((s) => (
          <div key={s.id} style={styles.suggestionRow}>
            <div style={styles.suggestionMeta}>
              {new Date(s.created_at).toLocaleString("id-ID")}
              {s.contact ? ` · ${s.contact}` : ""}
            </div>
            <div style={styles.suggestionMessage}>{s.message}</div>
            <button style={styles.rowRemoveBtnText} onClick={() => onDelete(s.id)}>
              Hapus
            </button>
          </div>
        ))}
        <div style={styles.modalActions}>
          <button style={styles.secondaryBtn} onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
