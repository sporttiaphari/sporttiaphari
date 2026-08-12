import { todayLocalDate } from "./date";

export const emptyMatch = () => ({
  id: crypto.randomUUID(),
  time: "",
  teamA: "",
  teamB: "",
  title: "",
  court: "",
  liveOns: [""],
  followedBy: false,
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
  }));
  const order = typeof ev.order === "number" ? ev.order : fallbackOrder || 0;
  const pinned = !!ev.pinned;
  return { ...ev, broadcasters, matches, order, pinned };
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
