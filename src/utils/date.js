// Semua jam yang di-input admin dianggap WIB (UTC+7). Fungsi ini convert
// ke zona waktu perangkat pengunjung secara otomatis.

export function fmtDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatLocalTime(dateStr, timeStr) {
  if (!timeStr) return timeStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return timeStr;
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - 7 * 60 * 60 * 1000; // WIB -> UTC
  return new Date(utcMs).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Tanggal kalender LOKAL pengunjung untuk sebuah match.
 * Pakai batas normal 00:00–23:59 (bukan 06:00–05:59).
 * Match tanpa jam tetap pakai tanggal aslinya.
 */
export function getLocalBroadcastDate(dateStr, timeStr) {
  if (!timeStr) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return dateStr;
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - 7 * 60 * 60 * 1000; // WIB -> UTC
  const local = new Date(utcMs);
  const ly = local.getFullYear();
  const lm = local.getMonth();
  const ld = local.getDate();
  return `${ly}-${String(lm + 1).padStart(2, "0")}-${String(ld).padStart(2, "0")}`;
}

/** Urutan jam biasa 00:00–23:59 (menit sejak tengah malam). */
export function broadcastSortKey(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function sortMatchesForDisplay(matches) {
  let lastKey = -1;
  const withKeys = matches.map((m) => {
    const key = broadcastSortKey(m.time);
    if (key !== null) lastKey = key;
    return { m, key: key !== null ? key : lastKey + 0.5 };
  });
  return withKeys.sort((a, b) => a.key - b.key).map((x) => x.m);
}

export function groupMatchesByCourt(matches) {
  const groups = [];
  const map = {};
  matches.forEach((m) => {
    const key = (m.court || "").trim();
    if (!map[key]) {
      map[key] = { court: key, matches: [] };
      groups.push(map[key]);
    }
    map[key].matches.push(m);
  });
  groups.forEach((g) => {
    g.matches = sortMatchesForDisplay(g.matches);
  });
  return groups;
}

export function todayLocalDate() {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
