import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

declare global {
  interface Window {
    __SUPABASE_ENV__?: { url?: string; anonKey?: string };
  }
}

export function getSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error(
      "Supabase client is only available in the browser. Data must be fetched in client components (e.g. inside useEffect)."
    );
  }
  if (_client) return _client;
  // Prefer server-injected env (set in root layout from process.env) so client works
  // even when NEXT_PUBLIC_* are not inlined into the client bundle at build time.
  const injected = window.__SUPABASE_ENV__;
  const url = injected?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = injected?.anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local"
    );
  }
  _client = createClient(url, anonKey);
  return _client;
}
