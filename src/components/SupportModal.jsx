import React, { useEffect, useState } from "react";
import { styles } from "../styles";

const STORAGE_KEY = "jo_qris_popup_shown";
const DELAY_MS = 10000;
const DEFAULT_QRIS = "/qris.jpg";

export default function SupportModal({ imageUrl }) {
  const [open, setOpen] = useState(false);
  const src = imageUrl || DEFAULT_QRIS;

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch (e) {
      /* private mode */
    }

    const t = setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch (e) {
        /* ignore */
      }
    }, DELAY_MS);

    return () => clearTimeout(t);
  }, []);

  if (!open) return null;

  const close = () => setOpen(false);

  return (
    <div className="jo-overlay-center" style={styles.overlay} onClick={close}>
      <div
        className="jo-modal"
        style={{ ...styles.modal, maxWidth: 380, textAlign: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ ...styles.modalTitle, marginBottom: 8 }}>Dukung @sporttiaphari</div>
        <div style={styles.modalBody}>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: "#C8CCD4",
              margin: "0 0 16px",
              textAlign: "left",
            }}
          >
            Halo, pecinta olahraga! Kami senang kamu mengunjungi halaman Jadwal Olahraga
            @sporttiaphari. Scan QRIS berikut untuk terus mendukung kami update jadwal olahraga
            setiap harinya. Terima kasih!
          </p>
          <img
            src={src}
            alt="QRIS @sporttiaphari"
            style={{
              width: "100%",
              maxWidth: 280,
              height: "auto",
              borderRadius: 12,
              border: "1px solid #2C303A",
              display: "block",
              margin: "0 auto 8px",
              background: "#fff",
            }}
          />
          <p style={{ ...styles.mutedSmall, marginTop: 4 }}>
            Scan dengan aplikasi e-wallet / m-banking
          </p>
        </div>
        <div style={styles.modalActions}>
          <button type="button" style={styles.primaryBtn} onClick={close}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
