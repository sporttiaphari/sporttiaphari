import { supabase } from "./supabaseClient";

// Wrapper ini niru gaya window.storage yang dipakai versi artifact,
// tapi datanya beneran tersimpan di Postgres (Supabase), jadi publik
// dan persisten selama-lamanya (bukan cuma di sesi Claude).

export async function getKV(key) {
  const { data, error } = await supabase
    .from("kv_store")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data ? data.value : null;
}

export async function setKV(key, value) {
  const { error } = await supabase
    .from("kv_store")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// Dengerin perubahan realtime buat key tertentu, biar semua pengunjung
// otomatis lihat update tanpa perlu refresh manual.
export function subscribeKV(key, onChange) {
  const channel = supabase
    .channel(`kv_store:${key}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "kv_store", filter: `key=eq.${key}` },
      (payload) => {
        if (payload.new && payload.new.value !== undefined) {
          onChange(payload.new.value);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ---- Fitur Saran/Suggestions ----
// Beda tabel dari kv_store: tiap saran baris sendiri (bukan blob JSON
// yang ditimpa ulang), jadi aman kalau banyak orang submit bersamaan.

// Siapa aja boleh kirim saran, termasuk yang belum login.
export async function submitSuggestion(message, contact) {
  const { error } = await supabase.from("suggestions").insert({
    message,
    contact: contact || null,
  });
  if (error) throw error;
}

// Cuma jalan kalau yang manggil ini akun admin (RLS di database yang
// nentuin, bukan kode ini) — pengunjung publik biasa bakal dapet array
// kosong, bukan error, kalau nyoba manggil ini.
export async function fetchSuggestions() {
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteSuggestion(id) {
  const { error } = await supabase.from("suggestions").delete().eq("id", id);
  if (error) throw error;
}

// realtime buat daftar saran, biar admin nggak perlu refresh manual
export function subscribeSuggestions(onChange) {
  const channel = supabase
    .channel("suggestions-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "suggestions" }, () => {
      onChange();
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}
