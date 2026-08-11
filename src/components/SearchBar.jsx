import React from "react";
import { styles } from "../styles";

export default function SearchBar({
  searchOpen,
  searchQuery,
  setSearchQuery,
  setSearchOpen,
  resultCount,
}) {
  if (!searchOpen && !searchQuery) return null;

  return (
    <div className="jo-content" style={styles.searchBarWrap}>
      <div style={styles.searchInputWrap}>
        <span style={styles.searchIcon}>⌕</span>
        <input
          type="search"
          style={styles.searchInput}
          placeholder="Cari event, tim, channel..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          autoFocus={searchOpen}
        />
        {searchQuery && (
          <button
            type="button"
            style={styles.searchClearBtn}
            onClick={() => {
              setSearchQuery("");
              setSearchOpen(false);
            }}
            aria-label="Hapus pencarian"
          >
            ×
          </button>
        )}
      </div>
      {searchQuery.trim() && resultCount > 0 && (
        <div style={styles.searchResultHint}>{resultCount} event ditemukan</div>
      )}
    </div>
  );
}
