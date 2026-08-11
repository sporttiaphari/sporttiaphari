import React from "react";
import { formatLocalTime } from "../utils/date";
import { styles } from "../styles";

export default function MatchRow({ match, eventDate, eventFormat, lookupBroadcasterLogo }) {
  const m = match;
  // _sourceDate = tanggal WIB asli (penting kalau match pindah hari karena beda zona)
  const sourceDate = m._sourceDate || eventDate;
  return (
    <div style={styles.matchRow}>
      <div style={styles.matchTopRow}>
        <span style={m.followedBy ? styles.matchTimeFB : styles.matchTime}>
          {m.followedBy ? "FB" : formatLocalTime(sourceDate, m.time)}
        </span>
        <span style={styles.matchTeams}>
          {eventFormat === "single" ? (
            m.title
          ) : (
            <>
              {m.teamA} <span style={styles.vs}>vs</span> {m.teamB}
            </>
          )}
        </span>
      </div>
      {m.liveOns && m.liveOns.filter(Boolean).length > 0 && (
        <div style={styles.matchLiveOn}>
          <span style={styles.matchLiveOnLabel}>LIVE ON</span>{" "}
          {m.liveOns.filter(Boolean).map((lv, i) => {
            const logo = lookupBroadcasterLogo(lv);
            return (
              <span
                key={i}
                style={logo ? styles.matchLiveOnChannelChip : styles.matchLiveOnChannelChipText}
              >
                {logo ? (
                  <>
                    <img
                      src={logo}
                      alt={lv}
                      title={lv}
                      style={styles.matchLiveOnLogo}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "inline";
                        e.target.parentElement.style.background = "transparent";
                        e.target.parentElement.style.padding = "0";
                      }}
                    />
                    <span style={{ display: "none" }}>{lv}</span>
                  </>
                ) : (
                  lv
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
