/** Default popularitas olahraga (index lebih kecil = lebih prioritas). */
export const DEFAULT_SPORTS = [
  "Sepak Bola",
  "Badminton",
  "Tenis",
  "Motorsport",
  "Basket",
  "Lainnya",
];

export function normalizeSports(list) {
  if (!Array.isArray(list) || list.length === 0) return [...DEFAULT_SPORTS];
  const cleaned = list
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  // unique case-insensitive, keep first casing
  const seen = new Set();
  const out = [];
  for (const name of cleaned) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.length ? out : [...DEFAULT_SPORTS];
}

/** Rank olahraga: index di daftar (lebih kecil = lebih atas). Tidak dikenal → akhir. */
export function sportRank(sportName, sportsList) {
  const list = normalizeSports(sportsList);
  if (!sportName || !String(sportName).trim()) return list.length + 1;
  const key = String(sportName).trim().toLowerCase();
  const idx = list.findIndex((s) => s.toLowerCase() === key);
  return idx === -1 ? list.length : idx;
}

/** Tambah olahraga baru ke daftar (di depan "Lainnya" jika ada, else di akhir). */
export function addSportToList(sportsList, newName) {
  const name = (newName || "").trim();
  if (!name) return normalizeSports(sportsList);
  const list = normalizeSports(sportsList);
  if (list.some((s) => s.toLowerCase() === name.toLowerCase())) return list;
  const lainnyaIdx = list.findIndex((s) => s.toLowerCase() === "lainnya");
  if (lainnyaIdx >= 0) {
    return [...list.slice(0, lainnyaIdx), name, ...list.slice(lainnyaIdx)];
  }
  return [...list, name];
}
