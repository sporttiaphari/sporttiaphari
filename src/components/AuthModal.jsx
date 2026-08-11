import React from "react";
import { styles } from "../styles";

export default function AuthModal({
  open,
  loginEmail,
  loginPassword,
  authError,
  setLoginEmail,
  setLoginPassword,
  onClose,
  onLogin,
}) {
  if (!open) return null;

  return (
    <div
      className="jo-overlay-center"
      style={styles.overlay}
      onClick={() => {
        onClose();
      }}
    >
      <div className="jo-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>Login Developer</div>
        <p style={styles.mutedSmall}>
          Login pakai akun admin buat aktifin izin edit & hapus event. Pengunjung publik biasa cuma
          bisa lihat jadwal.
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
          onKeyDown={(e) => e.key === "Enter" && onLogin()}
          autoComplete="current-password"
        />
        {authError && <div style={styles.authErrorText}>{authError}</div>}
        <div style={styles.modalActions}>
          <button
            style={styles.secondaryBtn}
            onClick={() => {
              onClose();
            }}
          >
            Batal
          </button>
          <button style={styles.primaryBtn} onClick={onLogin}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
