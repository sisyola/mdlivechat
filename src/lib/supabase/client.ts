import { createBrowserClient } from "@supabase/ssr";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const STORAGE_KEY = "mdlivechat-auth";

const capacitorStorage = {
  getItem: async (key: string) => {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
      return;
    }
    localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
      return;
    }
    localStorage.removeItem(key);
  },
};

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (cachedClient) return cachedClient;

  cachedClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => {
          const session = await capacitorStorage.getItem(STORAGE_KEY);
          if (!session) return [];
          try {
            const parsed = JSON.parse(session);
            const accessToken = parsed?.currentSession?.access_token;
            if (!accessToken) return [];
            return [{ name: "auth-token", value: accessToken }];
          } catch {
            return [];
          }
        },
        setAll: async (cookies: Array<{ name: string; value: string }>) => {
          for (const { name, value } of cookies) {
            if (name === "auth-token" || name.includes("auth")) {
              const existing = await capacitorStorage.getItem(STORAGE_KEY);
              let parsed: any = {};
              if (existing) {
                try { parsed = JSON.parse(existing); } catch {}
              }
              if (value === "" || value === null) {
                await capacitorStorage.removeItem(STORAGE_KEY);
                return;
              }
              const tokenData = JSON.parse(atob(value.split(".")[1]));
              parsed.currentSession = {
                access_token: value,
                refresh_token: parsed.currentSession?.refresh_token || "",
                expires_at: tokenData.exp,
                expires_in: tokenData.exp - Math.floor(Date.now() / 1000),
                token_type: "bearer",
                user: parsed.currentSession?.user || tokenData,
              };
              await capacitorStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            }
          }
        },
      },
    }
  );

  return cachedClient;
}
