import React from "react";
import { styles } from "../styles";

export default function Header({
  headerRef,
  scrolled,
  brandLogo,
  headerContent,
  isAdmin,
  page,
  navLabels,
  searchOpen,
  searchQuery,
  suggestionsCount,
  onLogoClick,
  onChangePage,
  onEditNav,
  onEditHeader,
  onToggleSearch,
  onOpenInbox,
  onLockAdmin,
  onOpenSuggest,
}) {
  const isMajor = page === "major";
  const dailyLabel = navLabels?.daily || "Harian";
  const majorLabel = navLabels?.major || "Event Besar";
  const eyebrow = headerContent?.eyebrow || (isMajor ? majorLabel.toUpperCase() : "JADWAL OLAHRAGA");
  const headline = headerContent?.headline || "@sporttiaphari";
  const note = headerContent?.note || (
    isMajor
      ? "Dashboard event-event besar. Jam otomatis disesuaikan ke zona waktu perangkat kamu."
      : "Jadwal olahraga dapat berubah sewaktu-waktu dengan atau tanpa pemberitahuan. Jam pertandingan otomatis disesuaikan ke zona waktu perangkat kamu."
  );
  const logoSrc = headerContent?.logo || brandLogo;
  return (
    <header
      ref={headerRef}
      className="jo-content"
      style={scrolled ? styles.headerCollapsed : styles.header}
    >
      <div style={styles.brandRow}>
        <img
          src={logoSrc}
          alt="@sporttiaphari"
          style={scrolled ? styles.brandLogoSmall : styles.brandLogo}
          onClick={onLogoClick}
        />
        {scrolled ? (
          <div style={{ ...styles.headlineCompactRow, minWidth: 0, flex: 1 }}>
            <div style={styles.headlineCompact}>
              {eyebrow} {headline}
            </div>
            {isAdmin && <span style={styles.devDot} title="Developer Mode aktif" />}
          </div>
        ) : (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={styles.eyebrow}>{eyebrow}</div>
            <div style={styles.headline}>{headline}</div>
            <div style={styles.headerNote}>{note}</div>
            {isAdmin && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 6 }}>
                <div style={styles.publicBadge}>● DEVELOPER MODE — kamu bisa edit & hapus</div>
                <button type="button" style={styles.devToggleBtn} onClick={onEditHeader}>
                  Edit header
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div style={styles.headerActions}>
        <div style={styles.pageTabs}>
          <button
            type="button"
            style={!isMajor ? styles.pageTabActive : styles.pageTab}
            onClick={() => onChangePage("daily")}
          >
            {dailyLabel}
          </button>
          <button
            type="button"
            style={isMajor ? styles.pageTabActive : styles.pageTab}
            onClick={() => onChangePage("major")}
          >
            {majorLabel}
          </button>
          {isAdmin && (
            <button
              type="button"
              style={styles.pageTab}
              onClick={onEditNav}
              title="Ubah nama tab"
              aria-label="Ubah nama tab"
            >
              ✎
            </button>
          )}
        </div>
        <button
          style={{
            ...(isAdmin ? styles.lockBtn : styles.devToggleBtn),
            ...(searchOpen || searchQuery ? styles.searchBtnActive : {}),
            minWidth: 36,
            padding: "8px 10px",
          }}
          onClick={onToggleSearch}
          aria-label="Cari jadwal"
          title="Cari"
        >
          ⌕
        </button>

        {isAdmin ? (
          <>
            <button style={styles.lockBtn} onClick={onOpenInbox} title="Saran masuk">
              Saran{suggestionsCount > 0 ? ` (${suggestionsCount})` : ""}
            </button>
            <button style={styles.lockBtn} onClick={onLockAdmin} title="Kunci developer mode">
              Kunci
            </button>
          </>
        ) : (
          <button style={styles.devToggleBtn} onClick={onOpenSuggest} title="Kasih saran">
            Saran
          </button>
        )}
      </div>
    </header>
  );
}
