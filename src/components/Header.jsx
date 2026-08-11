import React from "react";
import { styles } from "../styles";

export default function Header({
  headerRef,
  scrolled,
  brandLogo,
  isAdmin,
  searchOpen,
  searchQuery,
  suggestionsCount,
  onLogoClick,
  onToggleSearch,
  onOpenInbox,
  onLockAdmin,
  onOpenSuggest,
}) {
  return (
    <header
      ref={headerRef}
      className="jo-content"
      style={scrolled ? styles.headerCollapsed : styles.header}
    >
      <div style={styles.brandRow}>
        <img
          src={brandLogo}
          alt="@sporttiaphari"
          style={scrolled ? styles.brandLogoSmall : styles.brandLogo}
          onClick={onLogoClick}
        />
        {scrolled ? (
          <div style={styles.headlineCompactRow}>
            <div style={styles.headlineCompact}>JADWAL OLAHRAGA @sporttiaphari</div>
            {isAdmin && <span style={styles.devDot} title="Developer Mode aktif" />}
          </div>
        ) : (
          <div>
            <div style={styles.eyebrow}>JADWAL OLAHRAGA</div>
            <div style={styles.headline}>@sporttiaphari</div>
            <div style={styles.headerNote}>
              Jadwal olahraga dapat berubah sewaktu-waktu dengan atau tanpa pemberitahuan. Jam
              pertandingan otomatis disesuaikan ke zona waktu perangkat kamu.
            </div>
            {isAdmin && (
              <div style={styles.publicBadge}>● DEVELOPER MODE — kamu bisa edit & hapus</div>
            )}
          </div>
        )}
      </div>
      <div style={styles.headerActions}>
        <button
          style={{
            ...(isAdmin ? styles.lockBtn : styles.devToggleBtn),
            ...(searchOpen || searchQuery ? styles.searchBtnActive : {}),
          }}
          onClick={onToggleSearch}
          aria-label="Cari jadwal"
          title="Cari"
        >
          ⌕
        </button>

        {isAdmin ? (
          <>
            <button style={styles.lockBtn} onClick={onOpenInbox}>
              Saran Masuk{suggestionsCount > 0 ? ` (${suggestionsCount})` : ""}
            </button>
            <button style={styles.lockBtn} onClick={onLockAdmin}>
              Kunci
            </button>
          </>
        ) : (
          <button style={styles.devToggleBtn} onClick={onOpenSuggest}>
            Kasih Saran
          </button>
        )}
      </div>
    </header>
  );
}
