// Semua jam yang di-input admin dianggap WIB (UTC+7).
// Ditampilkan & dikelompokkan menurut zona waktu perangkat pengunjung.

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

/** WIB date+time → UTC milliseconds */
export function wibToUtcMs(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  return Date.UTC(y, m - 1, d, hh, mm) - 7 * 60 * 60 * 1000;
}

export function formatLocalTime(dateStr, timeStr) {
  if (!timeStr) return timeStr;
  const utcMs = wibToUtcMs(dateStr, timeStr);
  if (utcMs === null) return timeStr;
  return new Date(utcMs).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Tanggal kalender LOKAL pengunjung untuk sebuah match (batas 00:00–23:59).
 * Match tanpa jam tetap pakai tanggal aslinya (WIB date dari admin).
 */
export function getLocalBroadcastDate(dateStr, timeStr) {
  if (!timeStr) return dateStr;
  const utcMs = wibToUtcMs(dateStr, timeStr);
  if (utcMs === null) return dateStr;
  const local = new Date(utcMs);
  const ly = local.getFullYear();
  const lm = local.getMonth();
  const ld = local.getDate();
  return `${ly}-${String(lm + 1).padStart(2, "0")}-${String(ld).padStart(2, "0")}`;
}

/**
 * Sort key berdasarkan jam LOKAL pengunjung (bukan WIB mentah).
 * Penting: biar di WIT/WITA urutan tampil sesuai jam yang mereka lihat.
 * Mengembalikan menit sejak local midnight, atau null kalau tak ada jam.
 */
export function localSortKey(dateStr, timeStr) {
  if (!timeStr) return null;
  const utcMs = wibToUtcMs(dateStr, timeStr);
  if (utcMs === null) return null;
  const local = new Date(utcMs);
  return local.getHours() * 60 + local.getMinutes();
}

/**
 * Urutkan matches menurut jam lokal.
 * Setiap match boleh punya `_sourceDate` (tanggal WIB asli); fallback ke eventDate.
 * FB (tanpa jam) nempel setelah match berjam sebelumnya.
 */
export function sortMatchesForDisplay(matches, eventDate) {
  let lastKey = -1;
  const withKeys = matches.map((m) => {
    const srcDate = m._sourceDate || eventDate;
    const key = localSortKey(srcDate, m.time);
    if (key !== null) lastKey = key;
    return { m, key: key !== null ? key : lastKey + 0.5 };
  });
  return withKeys.sort((a, b) => a.key - b.key).map((x) => x.m);
}

export function groupMatchesByCourt(matches, eventDate) {
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
    g.matches = sortMatchesForDisplay(g.matches, eventDate);
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
