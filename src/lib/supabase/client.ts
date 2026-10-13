import { createBrowserClient } from "@supabase/ssr";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const STORAGE_KEY = "mdlivechat-auth";

const nativeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: STORAGE_KEY + "-" + key });
      return value;
    }
    return null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === "undefined") return;
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: STORAGE_KEY + "-" + key, value });
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === "undefined") return;
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: STORAGE_KEY + "-" + key });
    }
  },
};

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof window === "undefined") {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  if (cachedClient) return cachedClient;

  const isNative = Capacitor.isNativePlatform();

  // Di web: pake default cookies (ga override)
  // Di native APK: pake Capacitor Preferences sebagai storage
  if (!isNative) {
    cachedClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    return cachedClient;
  }

  // Native platform - custom storage with Capacitor Preferences
  cachedClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => {
          try {
            const allKeys: Array<{ name: string; value: string }> = [];
            const candidates = ["auth-token", "auth-token-code-verifier"];
            for (const name of candidates) {
              const value = await nativeStorage.getItem(name);
              if (value) allKeys.push({ name, value });
            }
            return allKeys;
          } catch {
            return [];
          }
        },
        setAll: async (cookiesToSet: Array<{ name: string; value: string }>) => {
          try {
            for (const { name, value } of cookiesToSet) {
              if (value === "" || value === null || value === undefined) {
                await nativeStorage.removeItem(name);
              } else {
                await nativeStorage.setItem(name, value);
              }
            }
          } catch (err) {
            console.error("Failed to save auth cookie", err);
          }
        },
      },
    }
  );

  return cachedClient;
}

export async function clearAuthStorage() {
  try {
    if (typeof window === "undefined") return;
    if (Capacitor.isNativePlatform()) {
      // Clear all auth-related Preferences keys
      await Preferences.remove({ key: STORAGE_KEY + "-auth-token" });
      await Preferences.remove({ key: STORAGE_KEY + "-auth-token-code-verifier" });
      // Also clear any legacy keys without prefix
      await Preferences.remove({ key: "auth-token" });
      await Preferences.remove({ key: "auth-token-code-verifier" });
    } else {
      localStorage.removeItem("auth-token");
      localStorage.removeItem("auth-token-code-verifier");
    }
  } catch (err) {
    console.error("Failed to clear auth storage:", err);
  }
}
