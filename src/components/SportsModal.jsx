import React, { useState } from "react";
import { styles } from "../styles";

export default function SportsModal({
  open,
  sports,
  saving,
  onSave,
  onClose,
}) {
  const [list, setList] = useState(sports || []);
  const [newName, setNewName] = useState("");

  // sync when opened
  React.useEffect(() => {
    if (open) {
      setList(Array.isArray(sports) ? [...sports] : []);
      setNewName("");
    }
  }, [open, sports]);

  if (!open) return null;

  const move = (idx, dir) => {
    const next = [...list];
    const j = dir === "up" ? idx - 1 : idx + 1;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setList(next);
  };

  const remove = (idx) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    if (list.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setNewName("");
      return;
    }
    setList([...list, name]);
    setNewName("");
  };

  return (
    <div className="jo-overlay-center" style={styles.overlay} onClick={() => onClose()}>
      <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>Popularitas Olahraga</div>
        <div style={styles.modalBody}>
          <p style={styles.mutedSmall}>
            Urutan dari atas = lebih prioritas di jadwal (setelah event yang dipin).
            Geser ↑↓, hapus, atau tambah olahraga baru.
          </p>

          {list.map((name, idx) => (
            <div key={`${name}-${idx}`} style={styles.channelRow}>
              <span style={{ ...styles.logoListName, flex: 1, minWidth: 0 }}>{name}</span>
              <button
                type="button"
                style={idx === 0 ? styles.reorderBtnDisabled : styles.reorderBtn}
                disabled={idx === 0}
                onClick={() => move(idx, "up")}
                title="Naikkan"
              >
                ↑
              </button>
              <button
                type="button"
                style={idx === list.length - 1 ? styles.reorderBtnDisabled : styles.reorderBtn}
                disabled={idx === list.length - 1}
                onClick={() => move(idx, "down")}
                title="Turunkan"
              >
                ↓
              </button>
              <button type="button" style={styles.rowRemoveBtn} onClick={() => remove(idx)} title="Hapus">
                ×
              </button>
            </div>
          ))}

          <div style={{ ...styles.channelRow, marginTop: 12 }}>
            <input
              style={styles.channelInput}
              placeholder="Tambah olahraga (mis. Voli)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <button
              type="button"
              style={{ ...styles.editBtn, minWidth: 44, height: 44 }}
              onClick={add}
              title="Tambah"
            >
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
            {saving ? "Menyimpan..." : "Simpan Urutan"}
          </button>
        </div>
      </div>
    </div>
  );
}
