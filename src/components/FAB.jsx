import React from "react";
import { styles } from "../styles";

export default function FAB({
  isAdmin,
  fabOpen,
  setFabOpen,
  onOpenEventLogo,
  onOpenChannelLogo,
  onOpenSports,
  onNewEvent,
}) {
  if (!isAdmin) return null;

  return (
    <div style={styles.fabWrap}>
      {fabOpen && (
        <>
          <button
            style={styles.fabOption}
            onClick={() => {
              onOpenSports?.();
              setFabOpen(false);
            }}
          >
            <span style={styles.fabOptionLabel}>Popularitas Olahraga</span>
            <span style={styles.fabOptionCircle}>🏆</span>
          </button>
          <button
            style={styles.fabOption}
            onClick={() => {
              onOpenEventLogo();
              setFabOpen(false);
            }}
          >
            <span style={styles.fabOptionLabel}>Logo Event</span>
            <span style={styles.fabOptionCircle}>🖼️</span>
          </button>
          <button
            style={styles.fabOption}
            onClick={() => {
              onOpenChannelLogo();
              setFabOpen(false);
            }}
          >
            <span style={styles.fabOptionLabel}>Logo Channel</span>
            <span style={styles.fabOptionCircle}>📺</span>
          </button>
          <button
            style={styles.fabOption}
            onClick={() => {
              onNewEvent();
              setFabOpen(false);
            }}
          >
            <span style={styles.fabOptionLabel}>Event Baru</span>
            <span style={styles.fabOptionCircle}>📅</span>
          </button>
        </>
      )}
      <button
        style={fabOpen ? styles.fabMainOpen : styles.fabMain}
        onClick={() => setFabOpen((v) => !v)}
      >
        +
      </button>
    </div>
  );
}
