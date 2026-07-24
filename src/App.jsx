import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { getKV, setKV, subscribeKV, submitSuggestion, fetchSuggestions, deleteSuggestion, subscribeSuggestions } from "./db";
import { supabase } from "./supabaseClient";

// tokens: bg #14161A, elev #1D2027, text #EDEFF3, muted #767C89
// accent live "#3DDC97" (pitch green), accent time "#F2C14E" (scoreboard amber)

function fmtDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDateShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// Satu "hari siaran" dihitung dari jam 06:00 s.d. 05:59 keesokan harinya
// (kayak jadwal TV), bukan per tanggal kalender biasa. Jadi pertandingan
// jam 01:00 tanggal 13 sebenernya masih masuk hari siaran tanggal 12.
function getBroadcastDate(dateStr, timeStr) {
  if (!timeStr) return dateStr; // match FB tanpa jam, pakai tanggal apa adanya
  const hour = parseInt(timeStr.split(":")[0], 10);
  if (Number.isNaN(hour) || hour >= 6) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d); // dibikin di waktu lokal, bukan UTC
  date.setDate(date.getDate() - 1);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Posisi jam dalam satu "hari siaran": 06:00 dianggap paling awal (0),
// lewat tengah malam sampai 05:59 dianggap paling akhir. Dipakai buat
// ngurutin tampilan jadwal ke publik, terlepas dari urutan pas diinput.
function broadcastSortKey(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const totalMin = h * 60 + m;
  return h < 6 ? totalMin + 24 * 60 : totalMin;
}

// Urutin array matches berdasarkan jam siaran. Match FB (tanpa jam) tetap
// nempel di posisi setelah match berjam yang paling deket sebelumnya,
// nggak ikut lompat urutan sendiri.
function sortMatchesForDisplay(matches) {
  let lastKey = -1;
  const withKeys = matches.map((m) => {
    const key = broadcastSortKey(m.time);
    if (key !== null) lastKey = key;
    return { m, key: key !== null ? key : lastKey + 0.5 };
  });
  return withKeys.sort((a, b) => a.key - b.key).map((x) => x.m);
}


// "Hari ini" versi tanggal lokal (bukan UTC) — penting krusial di sini,
// soalnya kalau dipake tengah malam/dini hari, toISOString() bisa salah
// mundur satu hari karena dia convert ke UTC dulu.
function todayLocalDate() {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const emptyMatch = () => ({
  id: crypto.randomUUID(),
  time: "",
  teamA: "",
  teamB: "",
  title: "",
  liveOns: [""],
  followedBy: false,
});
const emptyEvent = () => ({
  id: crypto.randomUUID(),
  name: "",
  round: "",
  logo: "",
  broadcasters: [""],
  format: "versus", // "versus" (Tim A vs Tim B) or "single" (mis. balapan, satu sesi/entri)
  date: todayLocalDate(),
  order: Date.now(), // urutan tampil, bisa digeser manual lewat tombol naik/turun
  matches: [emptyMatch()],
});

// Data lama nyimpen LIVE ON sebagai satu string (broadcaster/liveOn).
// Fungsi ini migrasiin ke bentuk array baru, jadi event/jadwal lama tetap
// kebaca normal walau formatnya sekarang mendukung banyak channel sekaligus.
// Event yang belum punya field `order` (dibikin sebelum fitur urutan manual
// ada) dikasih fallback dari posisinya di array, biar tetap stabil.
function normalizeEvent(ev, fallbackOrder) {
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
  return { ...ev, broadcasters, matches, order };
}

function readImageFile(file, onDone) {
  if (!file) return;
  if (!file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => onDone(reader.result);
  reader.readAsDataURL(file);
}

function eventInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

// curated broadcaster -> domain lookup, resolved via Clearbit's logo image CDN
// (direct image bytes, more reliable to hotlink than wiki redirect pages)
const BROADCASTER_DOMAINS = {
  "tvri sport": "tvri.go.id",
  "tvri": "tvri.go.id",
  "rcti": "rcti.tv",
  "vidio": "vidio.com",
  "espn": "espn.com",
  "sctv": "sctv.co.id",
  "indosiar": "indosiar.com",
  "trans7": "trans7.co.id",
  "trans tv": "transtv.co.id",
  "mola tv": "mola.tv",
  "bein sports": "beinsports.com",
  "tvone": "tvonenews.com",
  "net tv": "netmedia.co.id",
  "kompas tv": "kompas.tv",
  "spotv now": "spotvnow.com",
  "spotv": "spotv.com",
  "spotv 2": "spotv.com",
};

function makeLogoLookup(customLogos) {
  return function lookupBroadcasterLogo(name) {
    if (!name) return null;
    const key = name.trim().toLowerCase();
    if (customLogos && customLogos[key]) return customLogos[key];
    const domain = BROADCASTER_DOMAINS[key];
    return domain ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}` : null;
  };
}

const BRAND_LOGO = "data:image/jpeg;base64,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888888888888888888888sc88888888888888888888888888888888888888888888888888888888884wok8EQcgQgo8Qko888888888oEU0gkIUEIUQ0Yok888888888s8kM88scc8MscMMMc88888888448844888800w084088888888AIc8UQAoY0sAUUoMA88888888cE0IAI8II8sI0MsYI8888888888s8c8888888cs88888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888o888888888888888888888808s//EABkRAAEFAAAAAAAAAAAAAAAAAAERIUBggP/aAAgBAwEBPxC8FpCbh//EABQRAQAAAAAAAAAAAAAAAAAAAJD/2gAIAQIBAT8QHH//xAAtEAEAAgECBQQCAgICAwAAAAABABEhMVFBYXGB8RCRofBAsSBQwdFgcICQ4f/aAAgBAQABPxD+sIjt/wCm64b/AP8AwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBQZYwhpPBTwU8FPBTwX9b/mzZs2bNmzZs2bNmzZs2bNmzZs2bNmzZs2bNmzZs2bNmzZooZh6uWG7Rj/AA2zZs18hpUC6ljITAAo/wAj+sL6ULJxhtcVWRXr5gne0DRs/ia+q3/1RfNbsRT9HFeET9RgI2oCrNL56aS+oOmG1CwlHCAh8rzfPWFMSTHLKdaVkHnl/ga+q3/1Rdse5aYt3dlnQvW5i5XK6SU7NkMhFNX/ABDqv+WE7PYptFn+85xRiaSi+r2G0azmcFU5yfs2ePqa+q3/ANUXcYKBt0atSpb0xB/Vpcma9aq94caT1R1Q2LUYcaKv/OqFBUeMAY8QjAltNlOeLjFp9qB0Up7TGNfVb/6ovTXTWHwdWupFnHx3J22hRBxZ9qcNwfh9QB2IYgMl3Ku+t0OMcY52ri7s6IVovUI5mn3WWbUxG28NcVrxitKr/d/qi5NkTInCNtTADaXNRfPGIQLlPa5XfS8pX1cps82B92N0q56foKDBQH8DQvoAiUmX9YXuX/4HDsxdVmLqsxdVmLqsxdVmL5Ze5NN1oeaCNjH7TLfKOIdbxd1BXoMCNM5rk9+4rGRguAUNNzT0Hqm4my3ZCnFidpkrnIIWNbo7QnFS6iiz5Sm7CLZRp/UQ7a6bJxTjCCuYbWq2mMPTch5LOiBQPmZNUNNTcdBzLPRjfU4h1eGodWKfbGeQpRi0mr0GAN1Q3NJ8wrnBBgsLnu0hVtjH0Rh6a8vTXjGqVarwAFXlMSbWJ3QrOMx/EVZi9C1hwtavI1eRKKiQgoZfbWjQIj9prjutHOjlG9lAgbiqqvxZ3CEZkVproBwcDdRj53rOj6txYQfuFkdGIy9Vt7yjltAZXD4u7s1elD6Xd6nU5WFIaGtb51BS1XAbgg4GnOk0QF/AzHZHTcJxhVxYxkXKdz2Qpob5Cr6mvadanjXVnJ17wtOFmZk3iZTjY0WNnYANDGg0OgQ9WJVNeticcIdAJ0XDuWdGtciziwkdsQ6VO+FcJWWI6jHGgN529wdR/EVZi5A2xuFS/s5iS2U/LUO81QXjWtCIj8PYhZnVTREnYg/wM6Zl6jGBoe13cihcMUxQeXUiKBQ0fX/aL9ydanDKrOSU9/QhgfYq7W35RL9qmmDkDGHonBeCOxdvXGrmT+buKrRUg01mZMcgDtF0BvbtOw4pMdszZkOtd1ml6sUwm66SDyqdEiV5YhoeF6098OoL9a4PwzOJMMfpY+0CN21Zarwa9J5ZNPrAVwgLO9aw9OdxlnotdAiIjWlxiYdCag7LTdVdK+38RVmLllUlQGheRdGkPSWKGeVF8o1b5SUb6R5kJAKzvqm62rwWBvL0RiyW1dPbT50iSJOCQRWgcyHo+IzSIvrEuvekr1ozusEm6BolVXdYh8X0NBwvWnv9KAt99gDAmswCFhQMBu9E70GitlYs2sj4Uoadn41xHiJFj8A1hLKnBdTmMzN2BMDQ9ru5K/51u5dPtGRATJUVcrHtNkCnOuDojWMh3OXfYl6kroafNAmt7TWm+DH+2dwHIW1zwljtdKIJTGxQ1xGFITqgF/ejiPmNoKk9mZxNDtiNN7khYWMHM7JXaLYL3F0nufhqsxcal2+4wcAMBpUb47ud0oC/cCQVkM2t9zCa1Rui6tyFvQInlMkU12DDcRt2qRih0rovvWqDvNNnedRCqCi8iOFc6rm+YaNay0JW0UVe1ypmSH0QbxczR0bqWCccYyX1iOkhPsCAwKMaw+0NO+iZqtFGWPtSLYwDUrHIrx7N1lO5xg+dZscgWC07iRbcGWvhTae1FNHypwS6bbnYIG/a95RSdFZy2qp7pn9SRCu6obK1KW0EGBQPeKLbjyI4jiupOd7hakHIDrZ2XRrbpGEavhoFXe/OfUTuSctNA9WC/wC97wedeeMje0uF7yXOVdlxlrA57fxVWYvfSX+NfT2/4WqzF1WYuYLwZ5hcDrrwjJHZtU7XH+kF1D4RDr0KU1YFij6WmhdNxsMFb1lJ9hz/AEWlLoC5gESN5R4FxIzi1as3khwi1jgaq8IwmoNcOTujnQVq9B7kTMNTMCdtNYXpaMT1lbpVHzM6YMaOibjuY9FiXEnKKG9cLjIXucWK0xLyN8r3aai0Lh6BFb1mqAwTT996CDbhYj8qw5gWFWDXV6CnKntdOBelpcGMJ1oz3hKIWKinFvAthQN5W2qOKj8JVmLkMyFmDUt2Kj/7LMhuho74FmLcyuUzGjcLRdZHR3r6LqjuyE05fv5ykvYAZDeC9N4B2XVekHyAb5XAr3GSvSOENiH3+yLTAzGFfz2dFOFTekcMFI9/n+lZPO39R6Z3wlpsU+0EFVbxMRZ0xyqa5tg1v6ufrtp++2Z81LVK6OqzJQt6e6ssWKNv2FdkPGSglI7elT7LzbLmsjEH6ZBcr2jSS5yqlukb2EO3oTfwVWYuQMDUq31GAXg6lVmPIqihNtPsHrF7koFumfd4No9cekBcTTzajFObcAcJ4x+ytlnx/wC58LH0u7Prd0+12zftFMlo9/jwBQqXFwdYeRc5dFiMoX3rdwgqSG9M0XAdl8Gsw1Gwc06tWmLs1cTgQfgNmwpG+dvXm0CXd5mG9ED9Ppz3NU+QgzprG37Ou+EJTCxwo6LfQijbS3UVnVu97nKsMoLPsDtT0qIU+5ijCqX1TVRfZjhz60MrHaN31f2YA9Cb+CqzFwtjVIHW8mqNDZYaNS9IbnDOo4taY0hoEHTV2+1X29ImtjlGhdGtB7SnI+ykS8bhPg/3PhY+33T63dGfQzti9krDRixoKg9iLWOOUNm73m4LdwYsR1IuEa9/YIa6qCwlQVjY64Ub54Vp6KNS9VJCea+vLlwlc4a7OFvvNX8a0cOJ8hCpbIU0S0dkg3IagkQpvS94tiwsK1LXVhjFgGTUHZ956FXCkTBac41e7JtDsiJOrBoDmnjptQzDaJSPok38FVmL1/J8grpfpjMda3DQ7C+N9oUgHB6ko5lfoAo/DnXMWYB1WLrJ52QBaWPtGrW3V/zLQVb5pANsQMoFc95Sd0ri90BMKQTjmGBBQiwovEjK+wo0054Ud7KbQ36kq8WxnN9H3hAmN3UoLyVdYtAxW3i50vOyDw7WARoG3AvaanqndXkRXFVnvGwtbg6mTF0+0M0Piocq6EskBcVc7TjKye5Yw0L1bPeHUtAQ8Cr4Eg3rqmpNOdGqgnpqRK1cJaQde5mXRnShjArAS4PiDKmiPivFuM8Tg8kiG1K+6Y+3vvFoq8HYC8qx/DVZi99Pb1v1v8C/W/8A3fqsxdVmLqsxdVmLqsxdVmLqsxdVmLqsxdVmLqsxdVmLqsxdVmLqsxdVmLqs39Vm/qs39BQANrUgBEQjY/xg3//ZICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA==";

// Cuma akun dengan email ini yang boleh nulis ke database (dicek juga di
// RLS policy Supabase, bukan cuma di sini). Ganti sesuai email akun lo.
const ADMIN_EMAIL = "sporttiaphari@outlook.com";

export default function JadwalOlahraga() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(emptyEvent());
  const [editingEventId, setEditingEventId] = useState(null);
  const [toast, setToast] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [devModalOpen, setDevModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [customLogos, setCustomLogos] = useState({});
  const [eventLogos, setEventLogos] = useState({});
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [eventLogoModalOpen, setEventLogoModalOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(136);

  // ukur tinggi header beneran (bukan angka tebakan), biar label tanggal
  // nempel pas di bawahnya — baik di mode publik maupun Developer Mode,
  // yang tinggi headernya beda-beda (ada badge/tombol tambahan)
  useEffect(() => {
    if (!headerRef.current) return;
    const el = headerRef.current;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isAdmin]);

  // header "collapse" jadi ringkas pas discroll, biar nggak makan tempat
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ResizeObserver itu asinkron (baru fire abis browser selesai layout),
  // jadi kalau cuma andalin itu, ada jeda sesaat pas header collapse
  // mendadak karena scroll — label tanggal sempat nempel di posisi lama.
  // Effect ini maksa ukur ulang LANGSUNG begitu status collapse berubah,
  // DAN ukur ulang lagi pas animasi transisi header-nya selesai (biar nggak
  // kejebak ngukur di tengah-tengah animasi).
  useLayoutEffect(() => {
    if (!headerRef.current) return;
    const el = headerRef.current;
    setHeaderHeight(el.offsetHeight);
    const onTransitionEnd = () => setHeaderHeight(el.offsetHeight);
    el.addEventListener("transitionend", onTransitionEnd);
    return () => el.removeEventListener("transitionend", onTransitionEnd);
  }, [scrolled]);

  const [logoNameInput, setLogoNameInput] = useState("");
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [eventLogoNameInput, setEventLogoNameInput] = useState("");
  const [eventLogoUrlInput, setEventLogoUrlInput] = useState("");
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [suggestMessage, setSuggestMessage] = useState("");
  const [suggestContact, setSuggestContact] = useState("");
  const [suggestSending, setSuggestSending] = useState(false);
  const [inboxModalOpen, setInboxModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const lookupBroadcasterLogo = makeLogoLookup(customLogos);

  const handleLogoClick = () => {
    const next = logoClickCount + 1;
    setLogoClickCount(next);
    if (next >= 5) {
      setLogoClickCount(0);
      setDevModalOpen(true);
    } else {
      clearTimeout(window.__logoClickTimer);
      window.__logoClickTimer = setTimeout(() => setLogoClickCount(0), 2000);
    }
  };

  const loadSuggestions = async () => {
    try {
      const rows = await fetchSuggestions();
      setSuggestions(rows);
    } catch (e) {
      /* bukan admin, atau belum ada tabel suggestions */
    }
  };

  const handleSubmitSuggestion = async () => {
    if (!suggestMessage.trim()) return;
    setSuggestSending(true);
    try {
      await submitSuggestion(suggestMessage.trim(), suggestContact.trim());
      setSuggestMessage("");
      setSuggestContact("");
      setSuggestModalOpen(false);
      setToast("Saran terkirim, makasih!");
      setTimeout(() => setToast(""), 2500);
    } catch (e) {
      setToast("Gagal kirim saran, coba lagi");
      setTimeout(() => setToast(""), 2500);
    }
    setSuggestSending(false);
  };

  const handleDeleteSuggestion = async (id) => {
    try {
      await deleteSuggestion(id);
      setSuggestions((s) => s.filter((x) => x.id !== id));
    } catch (e) {
      /* ignore */
    }
  };

  useEffect(() => {
    // isAdmin sekarang beneran ditentuin sama sesi login Supabase Auth +
    // email-nya harus cocok ADMIN_EMAIL. Supabase nyimpen sesinya sendiri,
    // jadi begitu lo login sekali, tetap login walau browser ditutup,
    // sampai lo logout manual.
    supabase.auth.getSession().then(({ data }) => {
      const email = data?.session?.user?.email;
      setIsAdmin(!!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email;
      setIsAdmin(!!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    });

    (async () => {
      try {
        const c = await getKV("broadcasterLogos");
        if (c) setCustomLogos(c);
      } catch (e) {
        /* no custom logos yet, or Supabase belum dikonfigurasi */
      }
      try {
        const el = await getKV("eventLogos");
        if (el) setEventLogos(el);
      } catch (e) {
        /* no event logos yet */
      }
    })();

    // realtime: developer di device lain nambah/ubah logo -> semua
    // pengunjung yang lagi buka situs ikut ke-update tanpa refresh
    const unsubBroadcaster = subscribeKV("broadcasterLogos", (value) => setCustomLogos(value || {}));
    const unsubEventLogos = subscribeKV("eventLogos", (value) => setEventLogos(value || {}));
    return () => {
      unsubBroadcaster();
      unsubEventLogos();
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadSuggestions();
    const unsub = subscribeSuggestions(loadSuggestions);
    return () => unsub();
  }, [isAdmin]);

  const saveEventLogo = async (name, logo) => {
    const key = name.trim().toLowerCase();
    if (!key || !logo) return;
    const next = { ...eventLogos, [key]: logo };
    setEventLogos(next);
    try {
      await setKV("eventLogos", next);
    } catch (e) {
      /* ignore, still usable this session */
    }
  };

  const removeEventLogo = async (name) => {
    const next = { ...eventLogos };
    delete next[name];
    setEventLogos(next);
    try {
      await setKV("eventLogos", next);
    } catch (e) {
      /* ignore */
    }
  };

  const saveCustomLogo = async () => {
    const name = logoNameInput.trim().toLowerCase();
    const url = logoUrlInput.trim();
    if (!name || !url) return;
    const next = { ...customLogos, [name]: url };
    setCustomLogos(next);
    setLogoNameInput("");
    setLogoUrlInput("");
    try {
      await setKV("broadcasterLogos", next);
      setToast("Logo channel disimpan");
    } catch (e) {
      setToast("Gagal simpan logo");
    }
    setTimeout(() => setToast(""), 2000);
  };

  const removeCustomLogo = async (name) => {
    const next = { ...customLogos };
    delete next[name];
    setCustomLogos(next);
    try {
      await setKV("broadcasterLogos", next);
    } catch (e) {
      /* ignore */
    }
  };

  const handleLogin = async () => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    if (error) {
      setAuthError(error.message === "Invalid login credentials" ? "Email atau password salah" : error.message);
      return;
    }
    setLoginEmail("");
    setLoginPassword("");
    setDevModalOpen(false);
    setToast("Login berhasil");
    setTimeout(() => setToast(""), 2000);
  };

  const lockAdmin = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  useEffect(() => {
    (async () => {
      let loaded = [];
      try {
        const r = await getKV("events");
        loaded = r || [];
        if (!r) await setKV("events", loaded);
      } catch (e) {
        loaded = [];
      }

      // migrasi data lama (LIVE ON single string) ke format array baru
      loaded = loaded.map((ev, idx) => normalizeEvent(ev, idx));

      setEvents(loaded);
      setLoading(false);
    })();
  }, []);

  const persist = async (next) => {
    setEvents(next);
    try {
      await setKV("events", next);
    } catch (e) {
      setToast("Gagal simpan");
      setTimeout(() => setToast(""), 2000);
    }
  };

  const openNewEvent = () => {
    setDraft(emptyEvent());
    setEditingEventId(null);
    setModalOpen(true);
  };

  const openEditEvent = (ev) => {
    const normalized = normalizeEvent(ev);
    setDraft({
      ...normalized,
      matches: normalized.matches.map((m) => ({ ...m, liveOns: [...m.liveOns] })),
      broadcasters: [...normalized.broadcasters],
    });
    setEditingEventId(ev.id);
    setModalOpen(true);
  };

  // duplikat event yang udah ada, tanggalnya otomatis digeser ke besok
  // (cocok buat event harian) — dibuka langsung di form edit biar bisa
  // disesuaikan dulu sebelum disimpan, bukan langsung nempel ke jadwal
  const duplicateEvent = (sourceEv) => {
    if (!isAdmin) return;
    const [y, m, d] = sourceEv.date.split("-").map(Number);
    const nextDay = new Date(y, m - 1, d);
    nextDay.setDate(nextDay.getDate() + 1);
    const tomorrow = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(nextDay.getDate()).padStart(2, "0")}`;

    const normalized = normalizeEvent(sourceEv);
    setDraft({
      ...normalized,
      id: crypto.randomUUID(),
      date: tomorrow,
      order: Date.now(),
      matches: normalized.matches.map((m) => ({
        ...m,
        id: crypto.randomUUID(),
        liveOns: [...m.liveOns],
      })),
      broadcasters: [...normalized.broadcasters],
    });
    setEditingEventId(null); // dianggap event baru, bukan edit yang lama
    setModalOpen(true);
    setToast("Disalin — cek & sesuaikan sebelum simpan");
    setTimeout(() => setToast(""), 2500);
  };

  const updateDraftMatch = (id, field, value) => {
    setDraft((d) => ({
      ...d,
      matches: d.matches.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    }));
  };

  const addDraftMatch = () => setDraft((d) => ({ ...d, matches: [...d.matches, emptyMatch()] }));
  const removeDraftMatch = (id) =>
    setDraft((d) => ({ ...d, matches: d.matches.filter((m) => m.id !== id) }));

  const saveEvent = async () => {
    if (!isAdmin) {
      setModalOpen(false);
      return;
    }
    if (!draft.name.trim()) {
      setModalOpen(false);
      return;
    }
    const cleanMatches = draft.matches
      .filter((m) => (m.time || m.followedBy) && (m.teamA || m.teamB || m.title))
      .map((m) => ({ ...m, liveOns: m.liveOns.map((x) => x.trim()).filter(Boolean) }));
    const cleanBroadcasters = draft.broadcasters.map((b) => b.trim()).filter(Boolean);
    const cleaned = { ...draft, matches: cleanMatches, broadcasters: cleanBroadcasters };
    if (cleaned.logo) {
      saveEventLogo(cleaned.name, cleaned.logo);
    }
    const next = editingEventId
      ? events.map((e) => (e.id === editingEventId ? cleaned : e))
      : [...events, cleaned];
    await persist(next);
    setModalOpen(false);
    setToast(editingEventId ? "Event diperbarui" : "Event ditambahkan");
    setTimeout(() => setToast(""), 2000);
  };

  const deleteEvent = async (id) => {
    if (!isAdmin) return;
    await persist(events.filter((e) => e.id !== id));
  };

  // group by "hari siaran" (06:00-05:59), bukan per event secara utuh —
  // matches dalam satu event bisa kepisah ke 2 hari siaran kalau ada yang
  // sebelum & sesudah jam 6 pagi. Di-key pakai NAMA event (bukan id),
  // biar event yang kepaksa dipecah jadi 2 entry gara-gara beda tanggal
  // (mis. pertandingan lewat tengah malam) otomatis gabung lagi jadi satu
  // kartu kalau nama-nya sama dan jatuh di bucket hari yang sama.
  const byDate = {};
  events.forEach((ev) => {
    const nameKey = ev.name.trim().toLowerCase();
    const addToBucket = (bd, m) => {
      if (!byDate[bd]) byDate[bd] = {};
      if (!byDate[bd][nameKey]) {
        byDate[bd][nameKey] = { event: ev, matches: [], sourceEvents: [ev] };
      } else {
        const g = byDate[bd][nameKey];
        // lengkapin metadata yang kosong dari entry sebelumnya (logo/round/broadcasters)
        g.event = {
          ...g.event,
          logo: g.event.logo || ev.logo,
          round: g.event.round || ev.round,
          broadcasters:
            g.event.broadcasters && g.event.broadcasters.filter(Boolean).length
              ? g.event.broadcasters
              : ev.broadcasters,
        };
        if (!g.sourceEvents.some((s) => s.id === ev.id)) g.sourceEvents.push(ev);
      }
      if (m) byDate[bd][nameKey].matches.push(m);
    };

    if (ev.matches.length === 0) {
      addToBucket(ev.date, null);
      return;
    }
    ev.matches.forEach((m) => {
      addToBucket(getBroadcastDate(ev.date, m.time), m);
    });
  });
  const sortedDates = Object.keys(byDate).sort();

  // urutin grup dalam satu hari siaran berdasarkan field `order` (nilai
  // terkecil di antara sourceEvents-nya), bukan urutan insersi yang nggak
  // bisa diatur manual
  const getSortedGroupsForDate = (date) =>
    Object.values(byDate[date]).sort((a, b) => {
      const orderA = Math.min(...a.sourceEvents.map((s) => (typeof s.order === "number" ? s.order : 0)));
      const orderB = Math.min(...b.sourceEvents.map((s) => (typeof s.order === "number" ? s.order : 0)));
      return orderA - orderB;
    });

  // geser urutan tampil satu "kartu" (bisa gabungan beberapa sourceEvents)
  // relatif ke tetangganya di hari siaran yang sama, dengan cara nukar
  // nilai `order` di antara dua grup itu
  const moveEventInDate = async (date, groupEventId, direction) => {
    if (!isAdmin) return;
    const groups = getSortedGroupsForDate(date);
    const idx = groups.findIndex((g) => g.event.id === groupEventId);
    if (idx === -1) return;
    const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= groups.length) return;
    const currentGroup = groups[idx];
    const neighborGroup = groups[neighborIdx];
    const currentMin = Math.min(
      ...currentGroup.sourceEvents.map((s) => (typeof s.order === "number" ? s.order : 0))
    );
    const neighborMin = Math.min(
      ...neighborGroup.sourceEvents.map((s) => (typeof s.order === "number" ? s.order : 0))
    );
    const next = events.map((e) => {
      if (currentGroup.sourceEvents.some((s) => s.id === e.id)) return { ...e, order: neighborMin };
      if (neighborGroup.sourceEvents.some((s) => s.id === e.id)) return { ...e, order: currentMin };
      return e;
    });
    await persist(next);
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.muted}>Memuat…</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{fontImports}</style>

      <header ref={headerRef} className="jo-content" style={scrolled ? styles.headerCollapsed : styles.header}>
        <div style={styles.brandRow}>
          <img
            src={BRAND_LOGO}
            alt="@sporttiaphari"
            style={scrolled ? styles.brandLogoSmall : styles.brandLogo}
            onClick={handleLogoClick}
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
                Jadwal olahraga dapat berubah sewaktu-waktu dengan atau tanpa pemberitahuan.
              </div>
              {isAdmin && (
                <div style={styles.publicBadge}>● DEVELOPER MODE — kamu bisa edit & hapus</div>
              )}
            </div>
          )}
        </div>
        <div style={styles.headerActions}>
          {isAdmin ? (
            <>
              <button style={styles.lockBtn} onClick={() => setInboxModalOpen(true)}>
                Saran Masuk{suggestions.length > 0 ? ` (${suggestions.length})` : ""}
              </button>
              <button style={styles.lockBtn} onClick={lockAdmin}>
                Kunci
              </button>
            </>
          ) : (
            <button style={styles.devToggleBtn} onClick={() => setSuggestModalOpen(true)}>
              Kasih Saran
            </button>
          )}
        </div>
      </header>

      {sortedDates.length === 0 && (
        <div className="jo-content" style={styles.emptyState}>
          Belum ada jadwal. Tambah event buat mulai isi agenda.
        </div>
      )}

      {sortedDates.map((date) => (
        <section key={date} className="jo-content" style={styles.dateBlock}>
          <div style={{ ...styles.dateLabel, top: headerHeight }}>
            {fmtDateLabel(date)} <span style={styles.dateLabelRange}>06:00–05:59 WIB</span>
          </div>
          {getSortedGroupsForDate(date).map(({ event: ev, matches, sourceEvents }, idx, arr) => (
            <div key={sourceEvents[0].id} style={styles.eventCard}>
              <div style={styles.eventHeaderRow}>
                <div style={styles.eventHeaderLeft}>
                  {ev.logo ? (
                    <img
                      src={ev.logo}
                      alt=""
                      style={styles.eventLogoImg}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      ...styles.eventLogoFallback,
                      display: ev.logo ? "none" : "flex",
                    }}
                  >
                    {eventInitials(ev.name)}
                  </div>
                  <div style={styles.eventTitleCol}>
                    <div style={styles.eventName}>{ev.name}</div>
                    {ev.round && <div style={styles.eventRound}>{ev.round}</div>}
                    {ev.broadcasters && ev.broadcasters.filter(Boolean).length > 0 && (
                      <div style={styles.liveOnRow}>
                        <span style={styles.liveOnLabel}>LIVE ON</span>
                        {ev.broadcasters.filter(Boolean).map((b, i) => {
                          const logo = lookupBroadcasterLogo(b);
                          return (
                            <span
                              key={i}
                              style={logo ? styles.liveOnChannelChip : styles.liveOnChannelChipText}
                            >
                              {logo ? (
                                <>
                                  <img
                                    src={logo}
                                    alt={b}
                                    title={b}
                                    style={styles.liveOnLogo}
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display = "inline";
                                      e.target.parentElement.style.background = "transparent";
                                      e.target.parentElement.style.padding = "0";
                                    }}
                                  />
                                  <span style={{ ...styles.liveOnValue, display: "none" }}>{b}</span>
                                </>
                              ) : (
                                <span style={styles.liveOnValue}>{b}</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div style={styles.eventHeaderActions}>
                    <button
                      style={idx === 0 ? styles.reorderBtnDisabled : styles.reorderBtn}
                      disabled={idx === 0}
                      onClick={() => moveEventInDate(date, ev.id, "up")}
                      title="Naikkan urutan"
                    >
                      ↑
                    </button>
                    <button
                      style={idx === arr.length - 1 ? styles.reorderBtnDisabled : styles.reorderBtn}
                      disabled={idx === arr.length - 1}
                      onClick={() => moveEventInDate(date, ev.id, "down")}
                      title="Turunkan urutan"
                    >
                      ↓
                    </button>
                    {sourceEvents.length === 1 && (
                      <>
                        <button style={styles.editBtn} onClick={() => openEditEvent(sourceEvents[0])}>
                          Edit
                        </button>
                        <button
                          style={styles.duplicateBtn}
                          onClick={() => duplicateEvent(sourceEvents[0])}
                        >
                          Duplikat
                        </button>
                        <button
                          style={styles.deleteBtn}
                          onClick={() => deleteEvent(sourceEvents[0].id)}
                        >
                          Hapus
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {isAdmin && sourceEvents.length > 1 && (
                <div style={styles.mergedActions}>
                  <div style={styles.mergedNote}>
                    Kartu ini gabungan {sourceEvents.length} entry (beda tanggal, lewat tengah
                    malam). Pilih tanggal buat edit/hapus/duplikat bagian itu:
                  </div>
                  {sourceEvents.map((se) => (
                    <div key={se.id} style={styles.mergedActionRow}>
                      <span style={styles.mergedActionDate}>{fmtDateShort(se.date)}</span>
                      <button style={styles.editBtn} onClick={() => openEditEvent(se)}>
                        Edit
                      </button>
                      <button style={styles.duplicateBtn} onClick={() => duplicateEvent(se)}>
                        Duplikat
                      </button>
                      <button style={styles.deleteBtn} onClick={() => deleteEvent(se.id)}>
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={styles.matchList}>
                {sortMatchesForDisplay(matches).map((m) => (
                    <div key={m.id} style={styles.matchRow}>
                      <span style={m.followedBy ? styles.matchTimeFB : styles.matchTime}>
                        {m.followedBy ? "FB" : m.time}
                      </span>
                      <span style={styles.matchTeams}>
                        {ev.format === "single" ? (
                          m.title
                        ) : (
                          <>
                            {m.teamA} <span style={styles.vs}>vs</span> {m.teamB}
                          </>
                        )}
                      </span>
                      {m.liveOns && m.liveOns.filter(Boolean).length > 0 && (
                        <span style={styles.matchLiveOn}>
                          <span style={styles.matchLiveOnLabel}>LIVE ON</span>{" "}
                          {m.liveOns.filter(Boolean).map((lv, i) => {
                            const logo = lookupBroadcasterLogo(lv);
                            return (
                              <span
                                key={i}
                                style={logo ? styles.matchLiveOnChannelChip : styles.matchLiveOnChannelChipText}
                              >
                                {logo ? (
                                  <>
                                    <img
                                      src={logo}
                                      alt={lv}
                                      title={lv}
                                      style={styles.matchLiveOnLogo}
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        e.target.nextSibling.style.display = "inline";
                                        e.target.parentElement.style.background = "transparent";
                                        e.target.parentElement.style.padding = "0";
                                      }}
                                    />
                                    <span style={{ display: "none" }}>{lv}</span>
                                  </>
                                ) : (
                                  lv
                                )}
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </div>
                  ))}
                {matches.length === 0 && (
                  <div style={styles.mutedSmall}>Belum ada pertandingan</div>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}

      {modalOpen && (
        <div style={styles.overlay} onClick={() => setModalOpen(false)}>
          <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>{editingEventId ? "Edit Event" : "Event Baru"}</div>
            <div className="jo-form-row">
              <input
                style={styles.input}
                placeholder="Nama event (mis. FIFA WORLD CUP 26)"
                value={draft.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const key = name.trim().toLowerCase();
                  const known = eventLogos[key];
                  setDraft((d) => ({
                    ...d,
                    name,
                    logo: !d.logo && known ? known : d.logo,
                  }));
                }}
              />
              <input
                style={styles.input}
                placeholder="Round / sub-event (opsional, mis. British Grand Prix)"
                value={draft.round}
                onChange={(e) => setDraft({ ...draft, round: e.target.value })}
              />
            </div>
            <input
              type="date"
              style={styles.input}
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
            <label style={styles.uploadBtn}>
              Upload Gambar Logo
              <input
                type="file"
                accept="image/*"
                style={styles.hiddenFileInput}
                onChange={(e) =>
                  readImageFile(e.target.files[0], (dataUrl) => setDraft({ ...draft, logo: dataUrl }))
                }
              />
            </label>
            <input
              style={styles.input}
              placeholder="atau tempel URL logo (opsional)"
              value={draft.logo.startsWith("data:") ? "" : draft.logo}
              onChange={(e) => setDraft({ ...draft, logo: e.target.value })}
            />
            {draft.logo && (
              <div style={styles.logoPreviewRow}>
                <img
                  src={draft.logo}
                  alt=""
                  style={styles.logoPreviewImg}
                  onError={(e) => (e.target.style.display = "none")}
                />
                <span style={styles.mutedSmall}>Pratinjau logo</span>
                <button
                  type="button"
                  style={styles.rowRemoveBtn}
                  onClick={() => setDraft({ ...draft, logo: "" })}
                >
                  ×
                </button>
              </div>
            )}
            <div style={styles.matchEditorLabel}>
              Live On (bisa lebih dari satu channel, mis. tayang serentak)
            </div>
            {draft.broadcasters.map((b, idx) => (
              <div key={idx} style={styles.matchEditRow}>
                <input
                  style={styles.teamInput}
                  placeholder={idx === 0 ? "Live on (mis. RCTI, Vidio, ESPN)" : "Channel tambahan"}
                  value={b}
                  onChange={(e) => {
                    const next = [...draft.broadcasters];
                    next[idx] = e.target.value;
                    setDraft({ ...draft, broadcasters: next });
                  }}
                />
                {draft.broadcasters.length > 1 && (
                  <button
                    type="button"
                    style={styles.rowRemoveBtn}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        broadcasters: draft.broadcasters.filter((_, i) => i !== idx),
                      })
                    }
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              style={styles.addMatchBtn}
              onClick={() => setDraft({ ...draft, broadcasters: [...draft.broadcasters, ""] })}
            >
              + Tambah channel
            </button>

            <div style={styles.matchEditorLabel}>Format Pertandingan</div>
            <div style={styles.formatToggleRow}>
              <button
                type="button"
                style={draft.format === "versus" ? styles.formatBtnActive : styles.formatBtn}
                onClick={() => setDraft({ ...draft, format: "versus" })}
              >
                Tim A vs Tim B
              </button>
              <button
                type="button"
                style={draft.format === "single" ? styles.formatBtnActive : styles.formatBtn}
                onClick={() => setDraft({ ...draft, format: "single" })}
              >
                Satu entri (mis. balapan)
              </button>
            </div>

            <div style={styles.matchEditorLabel}>Pertandingan</div>
            {draft.matches.map((m, idx) => (
              <div key={m.id} style={styles.matchEditGroup}>
                <div style={styles.matchEditRow}>
                  {m.followedBy ? (
                    <div style={styles.fbBadgeInput}>FB</div>
                  ) : (
                    <input
                      type="time"
                      style={styles.timeInputSmall}
                      value={m.time}
                      onChange={(e) => updateDraftMatch(m.id, "time", e.target.value)}
                    />
                  )}
                  {draft.format === "single" ? (
                    <input
                      style={styles.teamInput}
                      placeholder="Nama entri/sesi (mis. Race, Kualifikasi, MotoGP Mandalika)"
                      value={m.title}
                      onChange={(e) => updateDraftMatch(m.id, "title", e.target.value)}
                    />
                  ) : (
                    <>
                      <input
                        style={styles.teamInput}
                        placeholder="Tim A"
                        value={m.teamA}
                        onChange={(e) => updateDraftMatch(m.id, "teamA", e.target.value)}
                      />
                      <input
                        style={styles.teamInput}
                        placeholder="Tim B"
                        value={m.teamB}
                        onChange={(e) => updateDraftMatch(m.id, "teamB", e.target.value)}
                      />
                    </>
                  )}
                  {draft.matches.length > 1 && (
                    <button style={styles.rowRemoveBtn} onClick={() => removeDraftMatch(m.id)}>
                      ×
                    </button>
                  )}
                </div>
                <label style={styles.fbToggleLabel}>
                  <input
                    type="checkbox"
                    checked={m.followedBy}
                    onChange={(e) =>
                      updateDraftMatch(m.id, "followedBy", e.target.checked)
                    }
                  />
                  {" "}FB (mengikuti pertandingan sebelumnya, tanpa jam pasti)
                </label>
                <div style={styles.matchEditorLabel}>Live On pertandingan ini</div>
                {m.liveOns.map((lv, lvIdx) => (
                  <div key={lvIdx} style={styles.matchEditRow}>
                    <input
                      style={styles.liveOnInput}
                      placeholder={lvIdx === 0 ? "mis. Vidio" : "Channel tambahan"}
                      value={lv}
                      onChange={(e) => {
                        const next = [...m.liveOns];
                        next[lvIdx] = e.target.value;
                        updateDraftMatch(m.id, "liveOns", next);
                      }}
                    />
                    {m.liveOns.length > 1 && (
                      <button
                        type="button"
                        style={styles.rowRemoveBtn}
                        onClick={() =>
                          updateDraftMatch(
                            m.id,
                            "liveOns",
                            m.liveOns.filter((_, i) => i !== lvIdx)
                          )
                        }
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  style={styles.addMatchBtn}
                  onClick={() => updateDraftMatch(m.id, "liveOns", [...m.liveOns, ""])}
                >
                  + Tambah channel
                </button>
              </div>
            ))}
            <button style={styles.addMatchBtn} onClick={addDraftMatch}>
              + Tambah pertandingan
            </button>

            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} onClick={() => setModalOpen(false)}>
                Batal
              </button>
              <button style={styles.primaryBtn} onClick={saveEvent}>
                {editingEventId ? "Simpan Perubahan" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {devModalOpen && (
        <div
          style={styles.overlay}
          onClick={() => {
            setDevModalOpen(false);
            setAuthError("");
          }}
        >
          <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Login Developer</div>
            <p style={styles.mutedSmall}>
              Login pakai akun admin buat aktifin izin edit & hapus event. Pengunjung publik biasa
              cuma bisa lihat jadwal.
            </p>
            <input
              type="email"
              style={styles.input}
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="username"
            />
            <input
              type="password"
              style={styles.input}
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoComplete="current-password"
            />
            {authError && <div style={styles.authErrorText}>{authError}</div>}
            <div style={styles.modalActions}>
              <button
                style={styles.secondaryBtn}
                onClick={() => {
                  setDevModalOpen(false);
                  setLoginEmail("");
                  setLoginPassword("");
                  setAuthError("");
                }}
              >
                Batal
              </button>
              <button style={styles.primaryBtn} onClick={handleLogin}>
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {logoModalOpen && (
        <div style={styles.overlay} onClick={() => setLogoModalOpen(false)}>
          <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Logo Channel</div>
            <p style={styles.mutedSmall}>
              Atur logo buat nama channel/platform tertentu. Begitu disimpan, logo ini otomatis
              dipakai di semua "LIVE ON" (event maupun jadwal) yang namanya cocok — nggak
              case-sensitive.
            </p>
            <input
              style={styles.input}
              placeholder="Nama channel (mis. Vidio, TVRI Sport)"
              value={logoNameInput}
              onChange={(e) => setLogoNameInput(e.target.value)}
            />
            <label style={styles.uploadBtn}>
              Upload Gambar Logo
              <input
                type="file"
                accept="image/*"
                style={styles.hiddenFileInput}
                onChange={(e) => readImageFile(e.target.files[0], setLogoUrlInput)}
              />
            </label>
            <input
              style={styles.input}
              placeholder="atau tempel URL logo"
              value={logoUrlInput.startsWith("data:") ? "" : logoUrlInput}
              onChange={(e) => setLogoUrlInput(e.target.value)}
            />
            {logoUrlInput && (
              <div style={styles.logoPreviewRow}>
                <img
                  src={logoUrlInput}
                  alt=""
                  style={styles.logoPreviewImg}
                  onError={(e) => (e.target.style.display = "none")}
                />
                <span style={styles.mutedSmall}>Pratinjau</span>
                <button type="button" style={styles.rowRemoveBtn} onClick={() => setLogoUrlInput("")}>
                  ×
                </button>
              </div>
            )}
            <button style={styles.primaryBtn} onClick={saveCustomLogo}>
              Simpan Logo
            </button>

            <div style={styles.matchEditorLabel}>Logo Tersimpan</div>
            {Object.keys(customLogos).length === 0 && (
              <div style={styles.mutedSmall}>Belum ada logo custom.</div>
            )}
            {Object.entries(customLogos).map(([name, url]) => (
              <div key={name} style={styles.logoListRow}>
                <img
                  src={url}
                  alt=""
                  style={styles.logoPreviewImg}
                  onError={(e) => (e.target.style.display = "none")}
                />
                <span style={styles.logoListName}>{name}</span>
                <button style={styles.rowRemoveBtn} onClick={() => removeCustomLogo(name)}>
                  ×
                </button>
              </div>
            ))}

            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} onClick={() => setLogoModalOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {eventLogoModalOpen && (
        <div style={styles.overlay} onClick={() => setEventLogoModalOpen(false)}>
          <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Logo Event</div>
            <p style={styles.mutedSmall}>
              Simpen logo buat nama event tertentu (mis. "Wimbledon", "FIFA World Cup"). Lain kali
              bikin event baru dengan nama yang sama persis, logonya otomatis kepasang — nggak
              perlu upload ulang.
            </p>
            <input
              style={styles.input}
              placeholder="Nama event (mis. Wimbledon)"
              value={eventLogoNameInput}
              onChange={(e) => setEventLogoNameInput(e.target.value)}
            />
            <label style={styles.uploadBtn}>
              Upload Gambar Logo
              <input
                type="file"
                accept="image/*"
                style={styles.hiddenFileInput}
                onChange={(e) => readImageFile(e.target.files[0], setEventLogoUrlInput)}
              />
            </label>
            <input
              style={styles.input}
              placeholder="atau tempel URL logo"
              value={eventLogoUrlInput.startsWith("data:") ? "" : eventLogoUrlInput}
              onChange={(e) => setEventLogoUrlInput(e.target.value)}
            />
            {eventLogoUrlInput && (
              <div style={styles.logoPreviewRow}>
                <img
                  src={eventLogoUrlInput}
                  alt=""
                  style={styles.logoPreviewImg}
                  onError={(e) => (e.target.style.display = "none")}
                />
                <span style={styles.mutedSmall}>Pratinjau</span>
                <button
                  type="button"
                  style={styles.rowRemoveBtn}
                  onClick={() => setEventLogoUrlInput("")}
                >
                  ×
                </button>
              </div>
            )}
            <button
              style={styles.primaryBtn}
              onClick={() => {
                if (!eventLogoNameInput.trim() || !eventLogoUrlInput.trim()) return;
                saveEventLogo(eventLogoNameInput, eventLogoUrlInput);
                setEventLogoNameInput("");
                setEventLogoUrlInput("");
                setToast("Logo event disimpan");
                setTimeout(() => setToast(""), 2000);
              }}
            >
              Simpan Logo
            </button>

            <div style={styles.matchEditorLabel}>Logo Tersimpan</div>
            {Object.keys(eventLogos).length === 0 && (
              <div style={styles.mutedSmall}>Belum ada logo event tersimpan.</div>
            )}
            {Object.entries(eventLogos).map(([name, url]) => (
              <div key={name} style={styles.logoListRow}>
                <img
                  src={url}
                  alt=""
                  style={styles.logoPreviewImg}
                  onError={(e) => (e.target.style.display = "none")}
                />
                <span style={styles.logoListName}>{name}</span>
                <button style={styles.rowRemoveBtn} onClick={() => removeEventLogo(name)}>
                  ×
                </button>
              </div>
            ))}

            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} onClick={() => setEventLogoModalOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {suggestModalOpen && (
        <div style={styles.overlay} onClick={() => setSuggestModalOpen(false)}>
          <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Kasih Saran</div>
            <p style={styles.mutedSmall}>
              Ada jadwal yang salah, event yang mau ditambahin, atau ide lain? Kasih tau di sini.
            </p>
            <textarea
              style={{ ...styles.input, height: 100, resize: "none" }}
              placeholder="Tulis saran kamu..."
              value={suggestMessage}
              onChange={(e) => setSuggestMessage(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Kontak kamu (opsional, mis. IG/email, buat dibales)"
              value={suggestContact}
              onChange={(e) => setSuggestContact(e.target.value)}
            />
            <div style={styles.modalActions}>
              <button
                style={styles.secondaryBtn}
                onClick={() => {
                  setSuggestModalOpen(false);
                  setSuggestMessage("");
                  setSuggestContact("");
                }}
              >
                Batal
              </button>
              <button
                style={styles.primaryBtn}
                onClick={handleSubmitSuggestion}
                disabled={suggestSending || !suggestMessage.trim()}
              >
                {suggestSending ? "Mengirim..." : "Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {inboxModalOpen && (
        <div style={styles.overlay} onClick={() => setInboxModalOpen(false)}>
          <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Saran Masuk</div>
            {suggestions.length === 0 && (
              <div style={styles.mutedSmall}>Belum ada saran yang masuk.</div>
            )}
            {suggestions.map((s) => (
              <div key={s.id} style={styles.suggestionRow}>
                <div style={styles.suggestionMeta}>
                  {new Date(s.created_at).toLocaleString("id-ID")}
                  {s.contact ? ` · ${s.contact}` : ""}
                </div>
                <div style={styles.suggestionMessage}>{s.message}</div>
                <button style={styles.rowRemoveBtnText} onClick={() => handleDeleteSuggestion(s.id)}>
                  Hapus
                </button>
              </div>
            ))}
            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} onClick={() => setInboxModalOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div style={styles.fabWrap}>
          {fabOpen && (
            <>
              <button
                style={styles.fabOption}
                onClick={() => {
                  setEventLogoModalOpen(true);
                  setFabOpen(false);
                }}
              >
                <span style={styles.fabOptionLabel}>Logo Event</span>
                <span style={styles.fabOptionCircle}>🖼️</span>
              </button>
              <button
                style={styles.fabOption}
                onClick={() => {
                  setLogoModalOpen(true);
                  setFabOpen(false);
                }}
              >
                <span style={styles.fabOptionLabel}>Logo Channel</span>
                <span style={styles.fabOptionCircle}>📺</span>
              </button>
              <button
                style={styles.fabOption}
                onClick={() => {
                  openNewEvent();
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
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const fontImports = `
@import url('https://fonts.googleapis.com/css2?family=Teko:wght@600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');

/* Layout mobile-first, tapi dilebarin bertahap di layar lebih gede biar
   nggak keliatan nyempit terus-terusan di desktop/browser */
.jo-content {
  max-width: 640px;
}
.jo-modal {
  max-width: 420px;
}
@media (min-width: 900px) {
  .jo-content { max-width: 820px; }
  .jo-modal { max-width: 640px; }
}
@media (min-width: 1280px) {
  .jo-content { max-width: 980px; }
  .jo-modal { max-width: 720px; }
}
.jo-form-row {
  display: flex;
  flex-direction: column;
}
.jo-form-row > input {
  flex: 1;
  min-width: 0;
}
@media (min-width: 700px) {
  .jo-form-row {
    flex-direction: row;
    gap: 10px;
  }
}
`;

const styles = {
  page: {
    minHeight: "100vh",
    background: "#14161A",
    color: "#EDEFF3",
    fontFamily: "'Inter', sans-serif",
    padding: "0 16px 60px",
    boxSizing: "border-box",
  },
  muted: { color: "#767C89", fontFamily: "'IBM Plex Mono', monospace" },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "#14161A",
    margin: "0 auto",
    padding: "24px 0 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: "1px solid #2C303A",
    transition: "padding 0.2s ease",
  },
  headerCollapsed: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "#14161A",
    margin: "0 auto",
    padding: "10px 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #2C303A",
    transition: "padding 0.2s ease",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 12 },
  brandLogo: {
    width: 48,
    height: 48,
    objectFit: "cover",
    borderRadius: 6,
    border: "1px solid #2C303A",
    flexShrink: 0,
    transition: "width 0.2s ease, height 0.2s ease",
    cursor: "pointer",
  },
  brandLogoSmall: {
    width: 26,
    height: 26,
    objectFit: "cover",
    borderRadius: 5,
    border: "1px solid #2C303A",
    flexShrink: 0,
    transition: "width 0.2s ease, height 0.2s ease",
    cursor: "pointer",
  },
  headlineCompactRow: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 },
  headlineCompact: {
    fontFamily: "'Teko', sans-serif",
    fontSize: 19,
    fontWeight: 600,
    letterSpacing: "0.01em",
    color: "#EDEFF3",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  devDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#F2C14E",
    flexShrink: 0,
  },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.15em",
    color: "#3DDC97",
    marginBottom: 4,
  },
  headline: { fontFamily: "'Teko', sans-serif", fontSize: 34, fontWeight: 600, letterSpacing: "0.01em" },
  publicBadge: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: "#F2C14E",
    letterSpacing: "0.04em",
    marginTop: 4,
  },
  headerNote: {
    fontSize: 11,
    color: "#767C89",
    marginTop: 4,
    maxWidth: 320,
    lineHeight: 1.4,
  },
  addBtn: {
    background: "#3DDC97",
    color: "#14161A",
    border: "none",
    borderRadius: 3,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  headerActions: { display: "flex", gap: 8, alignItems: "center", flexShrink: 0 },
  devToggleBtn: {
    background: "none",
    border: "1px solid #2C303A",
    color: "#767C89",
    borderRadius: 3,
    padding: "8px 14px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  lockBtn: {
    background: "none",
    border: "1px solid #2C303A",
    color: "#767C89",
    borderRadius: 3,
    padding: "9px 12px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  emptyState: {
    margin: "0 auto",
    color: "#767C89",
    fontSize: 14,
    padding: "40px 0",
    textAlign: "center",
  },
  dateBlock: { margin: "0 auto 22px" },
  dateLabel: {
    position: "sticky",
    top: 136,
    zIndex: 10,
    background: "#14161A",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    color: "#F2C14E",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 6,
    padding: "10px 0 8px",
  },
  dateLabelRange: {
    color: "#767C89",
    fontWeight: 400,
    fontSize: 10,
    letterSpacing: "0.04em",
  },
  eventCard: {
    background: "#1D2027",
    border: "1px solid #2C303A",
    borderRadius: 4,
    padding: 16,
    marginBottom: 10,
  },
  eventHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  eventHeaderLeft: { display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 },
  eventLogoImg: {
    width: 32,
    height: 32,
    objectFit: "contain",
    borderRadius: 3,
    flexShrink: 0,
    background: "#14161A",
  },
  eventLogoFallback: {
    width: 32,
    height: 32,
    borderRadius: 3,
    background: "#14161A",
    border: "1px solid #2C303A",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    fontWeight: 600,
    color: "#3DDC97",
    flexShrink: 0,
  },
  uploadBtn: {
    display: "block",
    width: "100%",
    background: "#14161A",
    border: "1px dashed #2C303A",
    borderRadius: 3,
    color: "#3DDC97",
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    textAlign: "center",
    marginBottom: 10,
    boxSizing: "border-box",
  },
  hiddenFileInput: { display: "none" },
  logoPreviewRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, marginTop: -4 },
  logoPreviewImg: {
    width: 28,
    height: 28,
    objectFit: "contain",
    borderRadius: 3,
    background: "#14161A",
    border: "1px solid #2C303A",
  },
  logoListRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 0",
    borderBottom: "1px solid #2C303A",
  },
  logoListName: { fontSize: 13, flex: 1, textTransform: "capitalize" },
  suggestionRow: {
    padding: "10px 0",
    borderBottom: "1px solid #2C303A",
  },
  suggestionMeta: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: "#767C89",
    marginBottom: 4,
  },
  suggestionMessage: { fontSize: 14, marginBottom: 6, whiteSpace: "pre-wrap" },
  rowRemoveBtnText: {
    background: "none",
    border: "1px solid #2C303A",
    color: "#767C89",
    borderRadius: 3,
    padding: "4px 10px",
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  eventTitleCol: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  liveOnRow: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  liveOnChannelChip: {
    display: "inline-flex",
    alignItems: "center",
    background: "#F2EFE9",
    borderRadius: 4,
    padding: "2px 5px",
  },
  liveOnChannelChipText: { display: "inline-flex", alignItems: "center" },
  liveOnLogo: {
    height: 20,
    width: "auto",
    maxWidth: 100,
    objectFit: "contain",
    display: "block",
  },
  liveOnLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    letterSpacing: "0.12em",
    color: "#767C89",
  },
  liveOnValue: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.04em",
    color: "#F2C14E",
    fontWeight: 600,
  },
  eventName: {
    fontFamily: "'Teko', sans-serif",
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: "#EDEFF3",
  },
  eventRound: {
    fontSize: 16,
    color: "#F2C14E",
    fontWeight: 500,
    marginTop: -2,
  },
  eventHeaderActions: { display: "flex", gap: 10, flexShrink: 0, alignItems: "center" },
  reorderBtn: {
    background: "none",
    border: "1px solid #2C303A",
    color: "#EDEFF3",
    borderRadius: 3,
    width: 22,
    height: 22,
    lineHeight: 1,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    padding: 0,
  },
  reorderBtnDisabled: {
    background: "none",
    border: "1px solid #2C303A",
    color: "#3A3F49",
    borderRadius: 3,
    width: 22,
    height: 22,
    lineHeight: 1,
    fontSize: 12,
    cursor: "not-allowed",
    fontFamily: "'Inter', sans-serif",
    padding: 0,
  },
  mergedActions: {
    marginBottom: 10,
    padding: "8px 10px",
    background: "#14161A",
    border: "1px solid #2C303A",
    borderRadius: 3,
  },
  mergedNote: {
    fontSize: 10,
    color: "#767C89",
    fontStyle: "italic",
    marginBottom: 8,
    lineHeight: 1.4,
  },
  mergedActionRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "4px 0",
  },
  mergedActionDate: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: "#F2C14E",
    minWidth: 44,
  },
  editBtn: {
    background: "none",
    border: "none",
    color: "#3DDC97",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  duplicateBtn: {
    background: "none",
    border: "none",
    color: "#F2C14E",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#767C89",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  matchList: { display: "flex", flexDirection: "column", gap: 6 },
  matchRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 12,
    padding: "8px 10px",
    background: "#14161A",
    borderRadius: 3,
    border: "1px solid #2C303A",
  },
  matchTime: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    color: "#F2C14E",
    minWidth: 44,
  },
  matchTimeFB: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    color: "#767C89",
    minWidth: 44,
    fontStyle: "italic",
  },
  matchTeams: { fontSize: 14, fontWeight: 500, flex: 1 },
  matchLiveOn: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: "#F2C14E",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    maxWidth: 180,
  },
  matchLiveOnChannelChip: {
    display: "inline-flex",
    alignItems: "center",
    background: "#F2EFE9",
    borderRadius: 3,
    padding: "1px 4px",
  },
  matchLiveOnChannelChipText: {
    display: "inline-flex",
    alignItems: "center",
    color: "#F2C14E",
  },
  matchLiveOnLabel: {
    color: "#767C89",
    letterSpacing: "0.08em",
    fontSize: 9,
  },
  matchLiveOnLogo: {
    height: 16,
    width: "auto",
    maxWidth: 70,
    objectFit: "contain",
    display: "block",
  },
  vs: { color: "#767C89", fontSize: 12, margin: "0 4px" },
  mutedSmall: { fontSize: 12, color: "#767C89" },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 50,
  },
  modal: {
    background: "#1D2027",
    border: "1px solid #2C303A",
    borderRadius: 4,
    padding: 20,
    width: "100%",
    maxHeight: "85vh",
    overflowY: "auto",
  },
  modalTitle: { fontFamily: "'Teko', sans-serif", fontSize: 24, fontWeight: 600, marginBottom: 12 },
  input: {
    width: "100%",
    background: "#14161A",
    border: "1px solid #2C303A",
    borderRadius: 3,
    padding: "11px 12px",
    color: "#EDEFF3",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    marginBottom: 10,
    boxSizing: "border-box",
    outline: "none",
  },
  matchEditorLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: "#767C89",
    letterSpacing: "0.08em",
    margin: "6px 0 8px",
    textTransform: "uppercase",
  },
  formatToggleRow: { display: "flex", gap: 6, marginBottom: 14 },
  formatBtn: {
    flex: 1,
    background: "#14161A",
    border: "1px solid #2C303A",
    borderRadius: 3,
    color: "#767C89",
    padding: "9px 8px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  formatBtnActive: {
    flex: 1,
    background: "rgba(61,220,151,0.12)",
    border: "1px solid #3DDC97",
    borderRadius: 3,
    color: "#3DDC97",
    padding: "9px 8px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  matchEditGroup: { marginBottom: 10 },
  matchEditRow: { display: "flex", gap: 6, marginBottom: 6, alignItems: "center" },
  fbBadgeInput: {
    width: 84,
    flexShrink: 0,
    background: "#14161A",
    border: "1px solid #2C303A",
    borderRadius: 3,
    color: "#767C89",
    padding: "8px 6px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    textAlign: "center",
  },
  fbToggleLabel: {
    display: "block",
    fontSize: 11,
    color: "#767C89",
    marginBottom: 8,
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
  },
  liveOnInput: {
    width: "100%",
    background: "#14161A",
    border: "1px solid #2C303A",
    borderRadius: 3,
    color: "#EDEFF3",
    padding: "8px 8px",
    fontSize: 12,
    fontFamily: "'Inter', sans-serif",
    boxSizing: "border-box",
    outline: "none",
  },
  timeInputSmall: {
    background: "#14161A",
    border: "1px solid #2C303A",
    borderRadius: 3,
    color: "#EDEFF3",
    padding: "8px 6px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    width: 84,
    flexShrink: 0,
  },
  teamInput: {
    flex: 1,
    background: "#14161A",
    border: "1px solid #2C303A",
    borderRadius: 3,
    color: "#EDEFF3",
    padding: "8px 8px",
    fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    minWidth: 0,
  },
  rowRemoveBtn: {
    background: "none",
    border: "none",
    color: "#767C89",
    fontSize: 18,
    cursor: "pointer",
    padding: "0 4px",
    flexShrink: 0,
  },
  addMatchBtn: {
    background: "none",
    border: "1px dashed #2C303A",
    color: "#3DDC97",
    borderRadius: 3,
    padding: "8px 10px",
    fontSize: 12,
    cursor: "pointer",
    width: "100%",
    marginBottom: 14,
    fontFamily: "'Inter', sans-serif",
  },
  modalActions: { display: "flex", gap: 8 },
  authErrorText: { color: "#FF6B6B", fontSize: 12, marginTop: -6, marginBottom: 10 },
  secondaryBtn: {
    flex: 1,
    background: "transparent",
    color: "#EDEFF3",
    border: "1px solid #2C303A",
    borderRadius: 3,
    padding: "11px 16px",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  primaryBtn: {
    flex: 1,
    background: "#3DDC97",
    color: "#14161A",
    border: "none",
    borderRadius: 3,
    padding: "11px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  fabWrap: {
    position: "fixed",
    bottom: 24,
    right: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 12,
    zIndex: 30,
  },
  fabMain: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#3DDC97",
    color: "#14161A",
    border: "none",
    fontSize: 28,
    fontWeight: 400,
    lineHeight: 1,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
    transition: "transform 0.15s ease",
  },
  fabMainOpen: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#3DDC97",
    color: "#14161A",
    border: "none",
    fontSize: 28,
    fontWeight: 400,
    lineHeight: 1,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
    transform: "rotate(45deg)",
  },
  fabOption: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  fabOptionLabel: {
    background: "#1D2027",
    border: "1px solid #2C303A",
    color: "#EDEFF3",
    borderRadius: 4,
    padding: "6px 10px",
    fontSize: 12,
    fontFamily: "'Inter', sans-serif",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  },
  fabOptionCircle: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#1D2027",
    border: "1px solid #2C303A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    flexShrink: 0,
  },
  toast: {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#3DDC97",
    color: "#14161A",
    padding: "10px 18px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
  },
};
