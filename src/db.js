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
