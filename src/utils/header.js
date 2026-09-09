export const DEFAULT_HEADERS = {
  daily: {
    eyebrow: "JADWAL OLAHRAGA",
    headline: "@sporttiaphari",
    note: "Jadwal olahraga dapat berubah sewaktu-waktu dengan atau tanpa pemberitahuan. Jam pertandingan otomatis disesuaikan ke zona waktu perangkat kamu.",
    logo: "",
  },
  major: {
    eyebrow: "EVENT BESAR",
    headline: "@sporttiaphari",
    note: "Dashboard event-event besar. Jam otomatis disesuaikan ke zona waktu perangkat kamu.",
    logo: "",
  },
};

export function normalizeHeaders(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const one = (page, fallback) => {
    const v = src[page] && typeof src[page] === "object" ? src[page] : {};
    return {
      eyebrow: typeof v.eyebrow === "string" && v.eyebrow.trim() ? v.eyebrow : fallback.eyebrow,
      headline: typeof v.headline === "string" && v.headline.trim() ? v.headline : fallback.headline,
      note: typeof v.note === "string" && v.note.trim() ? v.note : fallback.note,
      logo: typeof v.logo === "string" ? v.logo : "",
    };
  };
  return {
    daily: one("daily", DEFAULT_HEADERS.daily),
    major: one("major", DEFAULT_HEADERS.major),
  };
}
