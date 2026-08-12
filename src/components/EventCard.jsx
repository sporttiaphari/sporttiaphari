import React from "react";
import { fmtDateShort, groupMatchesByCourt } from "../utils/date";
import { eventInitials } from "../utils/event";
import MatchRow from "./MatchRow";
import { styles } from "../styles";

export default function EventCard({
  ev,
  matches,
  sourceEvents,
  idx,
  arrLength,
  isAdmin,
  lookupBroadcasterLogo,
  onMoveUp,
  onMoveDown,
  onTogglePin,
  onEdit,
  onDuplicate,
  onDelete,
}) {
  const isPinned = sourceEvents.some((s) => s.pinned);
  return (
    <div style={{
      ...styles.eventCard,
      ...(isPinned ? { borderColor: "#F2C14E", boxShadow: "0 0 0 1px rgba(242,193,78,0.25)" } : {}),
    }}>
      <div style={styles.eventHeaderRow}>
        <div style={styles.eventHeaderLeft}>
          {ev.logo ? (
            <img
              src={ev.logo}
              alt=""
              style={styles.eventLogoImg}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            style={{
              ...styles.eventLogoFallback,
              display: ev.logo ? "none" : "flex",
            }}
          >
            {eventInitials(ev.name)}
          </div>
          <div style={styles.eventTitleCol}>
            <div style={styles.eventName}>
              {isPinned && <span style={styles.pinBadge} title="Dipin">📌 </span>}
              {ev.name}
            </div>
            {ev.round && <div style={styles.eventRound}>{ev.round}</div>}
            {ev.broadcasters && ev.broadcasters.filter(Boolean).length > 0 && (
              <div style={styles.liveOnRow}>
                <span style={styles.liveOnLabel}>LIVE ON</span>
                {ev.broadcasters.filter(Boolean).map((b, i) => {
                  const logo = lookupBroadcasterLogo(b);
                  return (
                    <span
                      key={i}
                      style={logo ? styles.liveOnChannelChip : styles.liveOnChannelChipText}
                    >
                      {logo ? (
                        <>
                          <img
                            src={logo}
                            alt={b}
                            title={b}
                            style={styles.liveOnLogo}
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "inline";
                              e.target.parentElement.style.background = "transparent";
                              e.target.parentElement.style.padding = "0";
                            }}
                          />
                          <span style={{ ...styles.liveOnValue, display: "none" }}>{b}</span>
                        </>
                      ) : (
                        <span style={styles.liveOnValue}>{b}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {isAdmin && (
          <div style={styles.eventHeaderActions}>
            <button
              style={idx === 0 ? styles.reorderBtnDisabled : styles.reorderBtn}
              disabled={idx === 0}
              onClick={onMoveUp}
              title="Naikkan urutan"
              aria-label="Naikkan urutan"
            >
              ↑
            </button>
            <button
              style={idx === arrLength - 1 ? styles.reorderBtnDisabled : styles.reorderBtn}
              disabled={idx === arrLength - 1}
              onClick={onMoveDown}
              title="Turunkan urutan"
              aria-label="Turunkan urutan"
            >
              ↓
            </button>
            <button
              style={isPinned ? styles.pinBtnActive : styles.pinBtn}
              onClick={onTogglePin}
              title={isPinned ? "Lepas pin" : "Pin ke atas"}
              aria-label={isPinned ? "Lepas pin" : "Pin ke atas"}
            >
              📌
            </button>
            {sourceEvents.length === 1 && (
              <>
                <button style={styles.editBtn} onClick={() => onEdit(sourceEvents[0])} title="Edit" aria-label="Edit">
                  ✎
                </button>
                <button
                  style={styles.duplicateBtn}
                  onClick={() => onDuplicate(sourceEvents[0])}
                  title="Duplikat"
                  aria-label="Duplikat"
                >
                  ⧉
                </button>
                <button
                  style={styles.deleteBtn}
                  onClick={() => onDelete(sourceEvents[0].id)}
                  title="Hapus"
                  aria-label="Hapus"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isAdmin && sourceEvents.length > 1 && (
        <div style={styles.mergedActions}>
          <div style={styles.mergedNote}>
            Kartu ini gabungan {sourceEvents.length} entry (beda tanggal, lewat tengah malam).
            Pilih tanggal buat edit/hapus/duplikat bagian itu:
          </div>
          {sourceEvents.map((se) => (
            <div key={se.id} style={styles.mergedActionRow}>
              <span style={styles.mergedActionDate}>{fmtDateShort(se.date)}</span>
              <button style={styles.editBtn} onClick={() => onEdit(se)} title="Edit" aria-label="Edit">
                ✎ Edit
              </button>
              <button
                style={styles.duplicateBtn}
                onClick={() => onDuplicate(se)}
                title="Duplikat"
                aria-label="Duplikat"
              >
                ⧉ Dup
              </button>
              <button
                style={styles.deleteBtn}
                onClick={() => onDelete(se.id)}
                title="Hapus"
                aria-label="Hapus"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={styles.matchList}>
        {groupMatchesByCourt(matches, ev.date).map((group, gi) => (
          <React.Fragment key={gi}>
            {group.court && <div style={styles.courtLabel}>{group.court}</div>}
            {group.matches.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                eventDate={m._sourceDate || ev.date}
                eventFormat={ev.format}
                lookupBroadcasterLogo={lookupBroadcasterLogo}
              />
            ))}
          </React.Fragment>
        ))}
        {matches.length === 0 && (
          <div style={styles.mutedSmall}>Belum ada pertandingan</div>
        )}
      </div>
    </div>
  );
}
