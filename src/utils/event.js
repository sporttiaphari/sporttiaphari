import { todayLocalDate } from "./date";

export const MEDAL_OPTIONS = [
  { value: "", label: "Bukan medali", emoji: "" },
  { value: "gold", label: "Emas", emoji: "🥇" },
  { value: "silver", label: "Perak", emoji: "🥈" },
  { value: "bronze", label: "Perunggu", emoji: "🥉" },
];

export function normalizeMedal(value) {
  if (value === "gold" || value === "silver" || value === "bronze") return value;
  return "";
}

export function medalEmoji(value) {
  const found = MEDAL_OPTIONS.find((o) => o.value === value);
  return found?.emoji || "";
}


export const emptyMatch = () => ({
  id: crypto.randomUUID(),
  time: "",
  teamA: "",
  teamB: "",
  title: "",
  court: "",
  liveOns: [""],
  followedBy: false,
  medal: "", // "" | "gold" | "silver" | "bronze"
});

export const emptyEvent = () => ({
  id: crypto.randomUUID(),
  name: "",
  round: "",
  logo: "",
  broadcasters: [""],
  format: "versus", // "versus" (Tim A vs Tim B) or "single"
  date: todayLocalDate(),
  order: Date.now(),
  pinned: false, // pin ke atas (prioritas hybrid)
  sport: "", // kategori olahraga (untuk popularitas)
  matches: [emptyMatch()],
});

// Migrasi data lama (LIVE ON single string) ke format array baru
export function normalizeEvent(ev, fallbackOrder) {
  const broadcasters =
    ev.broadcasters && ev.broadcasters.length
      ? ev.broadcasters
      : ev.broadcaster
      ? [ev.broadcaster]
      : [""];
  const matches = (ev.matches || []).map((m) => ({
    ...m,
    liveOns: m.liveOns && m.liveOns.length ? m.liveOns : m.liveOn ? [m.liveOn] : [""],
    medal: normalizeMedal(m.medal),
  }));
  const order = typeof ev.order === "number" ? ev.order : fallbackOrder || 0;
  const pinned = !!ev.pinned;
  const sport = typeof ev.sport === "string" ? ev.sport : "";
  return { ...ev, broadcasters, matches, order, pinned, sport };
}

export function eventInitials(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function readImageFile(file, onDone) {
  if (!file) return;
  if (!file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => onDone(reader.result);
  reader.readAsDataURL(file);
}
