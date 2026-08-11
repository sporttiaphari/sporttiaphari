import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { getKV, setKV, subscribeKV, submitSuggestion, fetchSuggestions, deleteSuggestion, subscribeSuggestions, uploadLogo } from "./db";
import { supabase } from "./supabaseClient";
import {
  fmtDateLabel,
  fmtDateShort,
  formatLocalTime,
  getLocalBroadcastDate,
  sortMatchesForDisplay,
  groupMatchesByCourt,
  todayLocalDate,
} from "./utils/date";
import { emptyMatch, emptyEvent, normalizeEvent, eventInitials, readImageFile } from "./utils/event";
import { makeLogoLookup } from "./utils/logos";
import { fontImports, styles } from "./styles";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import EventCard from "./components/EventCard";
import EventModal from "./components/EventModal";
import AuthModal from "./components/AuthModal";
import ChannelLogoModal from "./components/ChannelLogoModal";
import EventLogoModal from "./components/EventLogoModal";
import { SuggestModal, InboxModal } from "./components/SuggestionModals";
import FAB from "./components/FAB";

const BRAND_LOGO = "data:image/jpeg;base64,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888888888888888888888sc88888888888888888888888888888888888888888888888888888888884wok8EQcgQgo8Qko888888888oEU0gkIUEIUQ0Yok888888888s8kM88scc8MscMMMc88888888448844888800w084088888888AIc8UQAoY0sAUUoMA88888888cE0IAI8II8sI0MsYI8888888888s8c8888888cs88888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888o888888888888888888888808s//EABkRAAEFAAAAAAAAAAAAAAAAAAERIUBggP/aAAgBAwEBPxC8FpCbh//EABQRAQAAAAAAAAAAAAAAAAAAAJD/2gAIAQIBAT8QHH//xAAtEAEAAgECBQQCAgICAwAAAAABABEhMVFBYXGB8RCRofBAsSBQwdFgcICQ4f/aAAgBAQABPxD+sIjt/wCm64b/AP8AwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBTwU8FPBQZYwhpPBTwU8FPBTwX9b/mzZs2bNmzZs2bNmzZs2bNmzZs2bNmzZs2bNmzZs2bNmzZooZh6uWG7Rj/AA2zZs18hpUC6ljITAAo/wAj+sL6ULJxhtcVWRXr5gne0DRs/ia+q3/1RfNbsRT9HFeET9RgI2oCrNL56aS+oOmG1CwlHCAh8rzfPWFMSTHLKdaVkHnl/ga+q3/1Rdse5aYt3dlnQvW5i5XK6SU7NkMhFNX/ABDqv+WE7PYptFn+85xRiaSi+r2G0azmcFU5yfs2ePqa+q3/ANUXcYKBt0atSpb0xB/Vpcma9aq94caT1R1Q2LUYcaKv/OqFBUeMAY8QjAltNlOeLjFp9qB0Up7TGNfVb/6ovTXTWHwdWupFnHx3J22hRBxZ9qcNwfh9QB2IYgMl3Ku+t0OMcY52ri7s6IVovUI5mn3WWbUx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6KNS9VJCea+vLlwlc4a7OFvvNX8a0cOJ8hCpbIU0S0dkg3IagkQpvS94tiwsK1LXVhjFgGTUHZ956FXCkTBac41e7JtDsiJOrBoDmnjptQzDaJSPok38FVmL1/J8grpfpjMda3DQ7C+N9oUgHB6ko5lfoAo/DnXMWYB1WLrJ52QBaWPtGrW3V/zLQVb5pANsQMoFc95Sd0ri90BMKQTjmGBBQiwovEjK+wo0054Ud7KbQ36kq8WxnN9H3hAmN3UoLyVdYtAxW3i50vOyDw7WARoG3AvaanqndXkRXFVnvGwtbg6mTF0+0M0Piocq6EskBcVc7TjKye5Yw0L1bPeHUtAQ8Cr4Eg3rqmpNOdGqgnpqRK1cJaQde5mXRnShjArAS4PiDKmiPivFuM8Tg8kiG1K+6Y+3vvFoq8HYC8qx/DVZi99Pb1v1v8C/W/8A3fqsxdVmLqsxdVmLqsxdVmLqsxdVmLqsxdVmLqsxdVmLqsxdVmLqsxdVmLqs39Vm/qs39BQANrUgBEQjY/xg3//ZICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA==";

// Cuma akun dengan email ini yang boleh nulis ke database (dicek juga di
// RLS policy Supabase, bukan cuma di sini). Ganti sesuai email akun lo.
const ADMIN_EMAIL = "sporttiaphari@outlook.com";

export default function JadwalOlahraga() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // loading state saat simpan event / logo
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
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
    let finalLogo = logo;
    // Pastikan tidak pernah simpan base64 ke database
    if (typeof finalLogo === "string" && finalLogo.startsWith("data:")) {
      try {
        finalLogo = await uploadLogo(finalLogo, "events");
      } catch (e) {
        throw e;
      }
    }
    const next = { ...eventLogos, [key]: finalLogo };
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
    let url = logoUrlInput.trim();
    if (!name || !url) return;
    if (saving) return;

    setSaving(true);
    try {
      // Kalau masih dataURL, upload ke Storage dulu (DB hanya simpan URL)
      if (url.startsWith("data:")) {
        url = await uploadLogo(url, "channels");
      }
      const next = { ...customLogos, [name]: url };
      setCustomLogos(next);
      setLogoNameInput("");
      setLogoUrlInput("");
      await setKV("broadcasterLogos", next);
      setToast("Logo channel disimpan");
    } catch (e) {
      setToast(e.message || "Gagal simpan logo");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 2500);
    }
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
    if (saving) return; // prevent double-submit

    setSaving(true);
    try {
      const cleanMatches = draft.matches
        .filter((m) => (m.time || m.followedBy) && (m.teamA || m.teamB || m.title))
        .map((m) => ({ ...m, liveOns: m.liveOns.map((x) => x.trim()).filter(Boolean) }));
      const cleanBroadcasters = draft.broadcasters.map((b) => b.trim()).filter(Boolean);
      let cleaned = { ...draft, matches: cleanMatches, broadcasters: cleanBroadcasters };

      // Kalau logo masih dataURL (base64), upload ke Storage dulu biar DB aman
      if (cleaned.logo && cleaned.logo.startsWith("data:")) {
        try {
          const publicUrl = await uploadLogo(cleaned.logo, "events");
          cleaned = { ...cleaned, logo: publicUrl };
        } catch (uploadErr) {
          setToast(uploadErr.message || "Gagal upload logo");
          setTimeout(() => setToast(""), 3000);
          setSaving(false);
          return;
        }
      }

      if (cleaned.logo) {
        await saveEventLogo(cleaned.name, cleaned.logo);
      }

      const next = editingEventId
        ? events.map((e) => (e.id === editingEventId ? cleaned : e))
        : [...events, cleaned];
      await persist(next);
      setModalOpen(false);
      setToast(editingEventId ? "Event diperbarui" : "Event ditambahkan");
      setTimeout(() => setToast(""), 2000);
    } catch (e) {
      setToast("Gagal simpan event, coba lagi");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (id) => {
    if (!isAdmin) return;
    await persist(events.filter((e) => e.id !== id));
  };

  // ---- Search / Filter ----
  // Cari di: nama event, round, channel, nama tim, court, liveOn
  const q = searchQuery.trim().toLowerCase();
  const filteredEvents = !q
    ? events
    : events
        .map((ev) => {
          const eventMatch =
            (ev.name || "").toLowerCase().includes(q) ||
            (ev.round || "").toLowerCase().includes(q) ||
            (ev.broadcasters || []).some((b) => (b || "").toLowerCase().includes(q));

          const matchingMatches = (ev.matches || []).filter((m) => {
            return (
              (m.teamA || "").toLowerCase().includes(q) ||
              (m.teamB || "").toLowerCase().includes(q) ||
              (m.title || "").toLowerCase().includes(q) ||
              (m.court || "").toLowerCase().includes(q) ||
              (m.liveOns || []).some((lv) => (lv || "").toLowerCase().includes(q))
            );
          });

          if (eventMatch) return ev; // event match → tampilkan semua match-nya
          if (matchingMatches.length > 0) return { ...ev, matches: matchingMatches };
          return null;
        })
        .filter(Boolean);

  // Group by tanggal kalender lokal (00:00–23:59).
  // Key kartu = nama event + round/sub-event, biar round berbeda jadi kartu terpisah
  // (mis. "WTT EUROPE SMASH / Sweden - Day 1" vs "Day 2").
  // Entry yang sama (nama+round) di tanggal yang sama digabung; beda round tetap terpisah.
  const byDate = {};
  filteredEvents.forEach((ev) => {
    const cardKey = `${(ev.name || "").trim().toLowerCase()}||${(ev.round || "").trim().toLowerCase()}`;
    const addToBucket = (bd, m) => {
      if (!byDate[bd]) byDate[bd] = {};
      if (!byDate[bd][cardKey]) {
        byDate[bd][cardKey] = { event: ev, matches: [], sourceEvents: [ev] };
      } else {
        const g = byDate[bd][cardKey];
        // lengkapi metadata yang kosong dari entry sebelumnya
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
      if (m) {
        // _sourceDate = tanggal WIB asli, dipakai untuk konversi & sort jam lokal
        byDate[bd][cardKey].matches.push({ ...m, _sourceDate: ev.date });
      }
    };

    if (ev.matches.length === 0) {
      addToBucket(ev.date, null);
      return;
    }
    ev.matches.forEach((m) => {
      addToBucket(getLocalBroadcastDate(ev.date, m.time), m);
    });
  });
  const sortedDates = Object.keys(byDate).sort();

  // Urutin grup dalam satu tanggal berdasarkan field `order`
  const getSortedGroupsForDate = (date) =>
    Object.values(byDate[date]).sort((a, b) => {
      const orderA = Math.min(...a.sourceEvents.map((s) => (typeof s.order === "number" ? s.order : 0)));
      const orderB = Math.min(...b.sourceEvents.map((s) => (typeof s.order === "number" ? s.order : 0)));
      return orderA - orderB;
    });

  // Geser urutan tampil satu kartu relatif ke tetangganya di tanggal yang sama
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

      <Header
        headerRef={headerRef}
        scrolled={scrolled}
        brandLogo={BRAND_LOGO}
        isAdmin={isAdmin}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        suggestionsCount={suggestions.length}
        onLogoClick={handleLogoClick}
        onToggleSearch={() => setSearchOpen((v) => !v)}
        onOpenInbox={() => setInboxModalOpen(true)}
        onLockAdmin={lockAdmin}
        onOpenSuggest={() => setSuggestModalOpen(true)}
      />

      <SearchBar
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setSearchOpen={setSearchOpen}
        resultCount={filteredEvents.length}
      />

      {sortedDates.length === 0 && (
        <div className="jo-content" style={styles.emptyState}>
          {q
            ? `Tidak ada hasil untuk “${searchQuery.trim()}”`
            : "Belum ada jadwal. Tambah event buat mulai isi agenda."}
        </div>
      )}

      {sortedDates.map((date) => (
        <section key={date} className="jo-content" style={styles.dateBlock}>
          <div style={{ ...styles.dateLabel, top: headerHeight }}>
            {fmtDateLabel(date)} <span style={styles.dateLabelRange}>waktu lokal kamu</span>
          </div>
          {getSortedGroupsForDate(date).map(({ event: ev, matches, sourceEvents }, idx, arr) => (
            <EventCard
              key={sourceEvents[0].id}
              ev={ev}
              matches={matches}
              sourceEvents={sourceEvents}
              idx={idx}
              arrLength={arr.length}
              isAdmin={isAdmin}
              lookupBroadcasterLogo={lookupBroadcasterLogo}
              onMoveUp={() => moveEventInDate(date, ev.id, "up")}
              onMoveDown={() => moveEventInDate(date, ev.id, "down")}
              onEdit={openEditEvent}
              onDuplicate={duplicateEvent}
              onDelete={deleteEvent}
            />
          ))}
        </section>
      ))}

      <EventModal
        open={modalOpen}
        editingEventId={editingEventId}
        draft={draft}
        setDraft={setDraft}
        eventLogos={eventLogos}
        saving={saving}
        setSaving={setSaving}
        setToast={setToast}
        onClose={() => setModalOpen(false)}
        onSave={saveEvent}
        updateDraftMatch={updateDraftMatch}
        addDraftMatch={addDraftMatch}
        removeDraftMatch={removeDraftMatch}
      />

      <AuthModal
        open={devModalOpen}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        authError={authError}
        setLoginEmail={setLoginEmail}
        setLoginPassword={setLoginPassword}
        onClose={() => {
          setDevModalOpen(false);
          setLoginEmail("");
          setLoginPassword("");
          setAuthError("");
        }}
        onLogin={handleLogin}
      />

      <ChannelLogoModal
        open={logoModalOpen}
        logoNameInput={logoNameInput}
        setLogoNameInput={setLogoNameInput}
        logoUrlInput={logoUrlInput}
        setLogoUrlInput={setLogoUrlInput}
        customLogos={customLogos}
        saving={saving}
        setSaving={setSaving}
        setToast={setToast}
        onSave={saveCustomLogo}
        onRemove={removeCustomLogo}
        onClose={() => setLogoModalOpen(false)}
      />

      <EventLogoModal
        open={eventLogoModalOpen}
        eventLogoNameInput={eventLogoNameInput}
        setEventLogoNameInput={setEventLogoNameInput}
        eventLogoUrlInput={eventLogoUrlInput}
        setEventLogoUrlInput={setEventLogoUrlInput}
        eventLogos={eventLogos}
        saving={saving}
        setSaving={setSaving}
        setToast={setToast}
        onSave={async () => {
          if (!eventLogoNameInput.trim() || !eventLogoUrlInput.trim()) return;
          if (saving) return;
          setSaving(true);
          try {
            await saveEventLogo(eventLogoNameInput, eventLogoUrlInput);
            setEventLogoNameInput("");
            setEventLogoUrlInput("");
            setToast("Logo event disimpan");
          } catch (e) {
            setToast(e.message || "Gagal simpan logo event");
          } finally {
            setSaving(false);
            setTimeout(() => setToast(""), 2500);
          }
        }}
        onRemove={removeEventLogo}
        onClose={() => setEventLogoModalOpen(false)}
      />

      <SuggestModal
        open={suggestModalOpen}
        suggestMessage={suggestMessage}
        setSuggestMessage={setSuggestMessage}
        suggestContact={suggestContact}
        setSuggestContact={setSuggestContact}
        suggestSending={suggestSending}
        onClose={() => setSuggestModalOpen(false)}
        onSubmit={handleSubmitSuggestion}
      />

      <InboxModal
        open={inboxModalOpen}
        suggestions={suggestions}
        onClose={() => setInboxModalOpen(false)}
        onDelete={handleDeleteSuggestion}
      />

      <FAB
        isAdmin={isAdmin}
        fabOpen={fabOpen}
        setFabOpen={setFabOpen}
        onOpenEventLogo={() => setEventLogoModalOpen(true)}
        onOpenChannelLogo={() => setLogoModalOpen(true)}
        onNewEvent={openNewEvent}
      />

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}
