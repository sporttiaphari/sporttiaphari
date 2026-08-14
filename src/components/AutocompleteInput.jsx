import React, { useEffect, useMemo, useRef, useState } from "react";
import { styles } from "../styles";

/**
 * Input + dropdown filter. Admin ketik → opsi menyempit → klik/tap pilih.
 * options: string[]
 * transformOption: optional display/value formatter (e.g. uppercase)
 */
export default function AutocompleteInput({
  value,
  onChange,
  options = [],
  placeholder,
  style,
  transformOption,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const normalizedOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const raw of options) {
      if (!raw || typeof raw !== "string") continue;
      const display = transformOption ? transformOption(raw) : raw;
      const key = display.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(display);
    }
    return out.sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base" }));
  }, [options, transformOption]);

  const q = (value || "").trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return normalizedOptions.slice(0, 30);
    return normalizedOptions.filter((o) => o.toLowerCase().includes(q)).slice(0, 30);
  }, [normalizedOptions, q]);

  useEffect(() => {
    setHighlight(0);
  }, [q, open]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, []);

  const pick = (opt) => {
    onChange(opt);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) pick(filtered[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", marginBottom: style?.marginBottom ?? 10 }}>
      <input
        style={{
          ...(style || styles.input),
          marginBottom: 0,
          width: "100%",
          boxSizing: "border-box",
        }}
        value={value || ""}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            marginTop: 4,
            maxHeight: 200,
            overflowY: "auto",
            background: "#1D2027",
            border: "1px solid #2C303A",
            borderRadius: 10,
            zIndex: 60,
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          }}
        >
          {filtered.map((opt, i) => (
            <button
              key={opt}
              type="button"
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                border: "none",
                borderBottom: i < filtered.length - 1 ? "1px solid #2C303A" : "none",
                background: i === highlight ? "rgba(61,220,151,0.12)" : "transparent",
                color: i === highlight ? "#3DDC97" : "#EDEFF3",
                fontSize: 14,
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(opt);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
