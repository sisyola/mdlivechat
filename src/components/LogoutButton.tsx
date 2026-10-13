"use client";

import { useState } from "react";
import { createClient, clearAuthStorage } from "@/lib/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Sign out via Supabase
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.error("signOut error (continuing):", err);
      }

      // Clear all auth-related storage
      await clearAuthStorage();

      // Also clear Capacitor Preferences directly
      if (Capacitor.isNativePlatform()) {
        try {
          await Preferences.remove({ key: "mdlivechat-auth-auth-token" });
          await Preferences.remove({ key: "mdlivechat-auth-auth-token-code-verifier" });
        } catch (err) {
          console.error("Failed to clear Preferences:", err);
        }
      }

      // Clear all Supabase-related cookies
      try {
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
          if (name.startsWith("sb-") || name.includes("auth")) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }
        });
      } catch (err) {
        console.error("Failed to clear cookies:", err);
      }

      // Hard navigate to login - full URL to avoid WebView issues
      const origin = window.location.origin || "https://mdlivechat.vercel.app";
      window.location.href = origin + "/login";
    } catch (err) {
      console.error("Logout error:", err);
      // Force navigate even if cleanup fails
      const origin = window.location.origin || "https://mdlivechat.vercel.app";
      window.location.href = origin + "/login";
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-sm text-gray-900 hover:text-red-600 transition font-medium disabled:opacity-50"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
