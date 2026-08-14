import React from "react";
import { uploadLogo } from "../db";
import { styles } from "../styles";
import AutocompleteInput from "./AutocompleteInput";

const toUpperName = (s) => (s || "").trim().toUpperCase();

export default function EventModal({
  open,
  editingEventId,
  draft,
  setDraft,
  eventLogos,
  sports,
  channelLogos,
  saving,
  setSaving,
  setToast,
  onClose,
  onSave,
  updateDraftMatch,
  addDraftMatch,
  removeDraftMatch,
}) {
  if (!open) return null;

  const sportsList = Array.isArray(sports) && sports.length ? sports : [];
  const eventNameOptions = Object.keys(eventLogos || {});
  const channelOptions = Object.keys(channelLogos || {});

  return (
      <div className="jo-overlay-center" style={styles.overlay} onClick={() => onClose()}>
        <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalTitle}>{editingEventId ? "Edit Event" : "Event Baru"}</div>
          <div style={styles.modalBody}>
          <div className="jo-form-row">
            <AutocompleteInput
              style={styles.input}
              placeholder="Nama event (mis. FIFA WORLD CUP 26)"
              value={draft.name}
              options={eventNameOptions}
              transformOption={toUpperName}
              onChange={(name) => {
                const key = name.trim().toLowerCase();
                const known = eventLogos[key] || eventLogos[name.trim().toLowerCase()];
                setDraft((d) => ({
                  ...d,
                  name,
                  logo: !d.logo && known ? known : d.logo,
                }));
              }}
            />
            <input
              style={styles.input}
              placeholder="Round / sub-event (opsional, mis. British Grand Prix)"
              value={draft.round}
              onChange={(e) => setDraft({ ...draft, round: e.target.value })}
            />
          </div>
          <input
            type="date"
            style={styles.input}
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          />

          <div style={styles.matchEditorLabel}>Olahraga</div>
          <AutocompleteInput
            style={styles.input}
            placeholder="Pilih atau ketik olahraga"
            value={draft.sport || ""}
            options={sportsList}
            onChange={(sport) => setDraft({ ...draft, sport })}
          />


          <label style={{ ...styles.uploadBtn, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Mengupload logo..." : "Upload Gambar Logo"}
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
                  setDraft((d) => ({ ...d, logo: publicUrl }));
                } catch (err) {
                  setToast(err.message || "Gagal upload logo");
                  setTimeout(() => setToast(""), 3000);
                } finally {
                  setSaving(false);
                  e.target.value = ""; // reset input
                }
              }}
            />
          </label>
          <input
            style={styles.input}
            placeholder="atau tempel URL logo (opsional)"
            value={draft.logo && draft.logo.startsWith("data:") ? "" : draft.logo || ""}
            onChange={(e) => setDraft({ ...draft, logo: e.target.value })}
            disabled={saving}
          />
          {draft.logo && (
            <div style={styles.logoPreviewRow}>
              <img
                src={draft.logo}
                alt=""
                style={styles.logoPreviewImg}
                onError={(e) => (e.target.style.display = "none")}
              />
              <span style={styles.mutedSmall}>Pratinjau logo</span>
              <button
                type="button"
                style={styles.rowRemoveBtn}
                onClick={() => setDraft({ ...draft, logo: "" })}
              >
                ×
              </button>
            </div>
          )}
          <div style={styles.matchEditorLabel}>
            Live On (bisa lebih dari satu channel, mis. tayang serentak)
          </div>
          {draft.broadcasters.map((b, idx) => (
            <div key={idx} style={styles.channelRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <AutocompleteInput
                  style={styles.channelInput}
                  placeholder={idx === 0 ? "Live on (mis. RCTI, Vidio, ESPN)" : "Channel tambahan"}
                  value={b}
                  options={channelOptions}
                  onChange={(val) => {
                    const next = [...draft.broadcasters];
                    next[idx] = val;
                    setDraft({ ...draft, broadcasters: next });
                  }}
                />
              </div>
              {draft.broadcasters.length > 1 && (
                <button
                  type="button"
                  style={styles.rowRemoveBtn}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      broadcasters: draft.broadcasters.filter((_, i) => i !== idx),
                    })
                  }
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            style={styles.addMatchBtn}
            onClick={() => setDraft({ ...draft, broadcasters: [...draft.broadcasters, ""] })}
          >
            + Tambah channel
          </button>

          <div style={styles.matchEditorLabel}>Format Pertandingan</div>
          <div style={styles.formatToggleRow}>
            <button
              type="button"
              style={draft.format === "versus" ? styles.formatBtnActive : styles.formatBtn}
              onClick={() => setDraft({ ...draft, format: "versus" })}
            >
              A vs B
            </button>
            <button
              type="button"
              style={draft.format === "single" ? styles.formatBtnActive : styles.formatBtn}
              onClick={() => setDraft({ ...draft, format: "single" })}
            >
              Satu entri
            </button>
          </div>

          <div style={styles.matchEditorLabel}>Pertandingan</div>
          {draft.matches.map((m, idx) => (
            <div key={m.id} style={styles.matchEditGroup}>
              <div style={styles.matchEditRow}>
                {m.followedBy ? (
                  <div style={styles.fbBadgeInput}>FB</div>
                ) : (
                  <input
                    type="time"
                    style={styles.timeInputSmall}
                    value={m.time}
                    onChange={(e) => updateDraftMatch(m.id, "time", e.target.value)}
                  />
                )}
                {draft.format === "single" ? (
                  <input
                    style={styles.teamInput}
                    placeholder="Nama entri/sesi (mis. Race, Kualifikasi, MotoGP Mandalika)"
                    value={m.title}
                    onChange={(e) => updateDraftMatch(m.id, "title", e.target.value)}
                  />
                ) : (
                  <>
                    <input
                      style={styles.teamInput}
                      placeholder="Tim A"
                      value={m.teamA}
                      onChange={(e) => updateDraftMatch(m.id, "teamA", e.target.value)}
                    />
                    <input
                      style={styles.teamInput}
                      placeholder="Tim B"
                      value={m.teamB}
                      onChange={(e) => updateDraftMatch(m.id, "teamB", e.target.value)}
                    />
                  </>
                )}
                {draft.matches.length > 1 && (
                  <button style={styles.rowRemoveBtn} onClick={() => removeDraftMatch(m.id)}>
                    ×
                  </button>
                )}
              </div>
              <label style={styles.fbToggleLabel}>
                <input
                  type="checkbox"
                  checked={m.followedBy}
                  onChange={(e) =>
                    updateDraftMatch(m.id, "followedBy", e.target.checked)
                  }
                />
                {" "}FB (mengikuti pertandingan sebelumnya, tanpa jam pasti)
              </label>
              <input
                style={styles.courtInput}
                placeholder="Court/lapangan (opsional, mis. Court 1) — buat pisahin section"
                value={m.court || ""}
                onChange={(e) => updateDraftMatch(m.id, "court", e.target.value)}
              />
              <div style={styles.matchEditorLabel}>Live On pertandingan ini</div>
              {m.liveOns.map((lv, lvIdx) => (
                <div key={lvIdx} style={styles.channelRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <AutocompleteInput
                      style={styles.channelInput}
                      placeholder={lvIdx === 0 ? "mis. Vidio" : "Channel tambahan"}
                      value={lv}
                      options={channelOptions}
                      onChange={(val) => {
                        const next = [...m.liveOns];
                        next[lvIdx] = val;
                        updateDraftMatch(m.id, "liveOns", next);
                      }}
                    />
                  </div>
                  {m.liveOns.length > 1 && (
                    <button
                      type="button"
                      style={styles.rowRemoveBtn}
                      onClick={() =>
                        updateDraftMatch(
                          m.id,
                          "liveOns",
                          m.liveOns.filter((_, i) => i !== lvIdx)
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                style={styles.addMatchBtn}
                onClick={() => updateDraftMatch(m.id, "liveOns", [...m.liveOns, ""])}
              >
                + Tambah channel
              </button>
            </div>
          ))}
          <button style={styles.addMatchBtn} onClick={addDraftMatch}>
            + Tambah pertandingan
          </button>
          </div>

          <div style={styles.modalActions}>
            <button
              style={styles.secondaryBtn}
              onClick={() => onClose()}
              disabled={saving}
            >
              Batal
            </button>
            <button
              style={{
                ...styles.primaryBtn,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
              onClick={onSave}
              disabled={saving}
            >
              {saving
                ? "Menyimpan..."
                : editingEventId
                ? "Simpan Perubahan"
                : "Simpan"}
            </button>
          </div>
        </div>
      </div>
  );
}
