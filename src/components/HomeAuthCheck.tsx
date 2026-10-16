"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

function getOrigin() {
  if (typeof window === "undefined") return "https://mdlivechat.vercel.app";
  return window.location.origin || "https://mdlivechat.vercel.app";
}

export default function HomeAuthCheck() {
  const router = useRouter();

  useEffect(() => {
    let redirected = false;

    function redirectTo(path: string) {
      if (redirected) return;
      redirected = true;
      window.location.replace(getOrigin() + path);
    }

    async function checkAuth() {
      if (typeof window === "undefined") return;

      // 1. Check localStorage first
      let sessionStr: string | null = null;
      try {
        sessionStr = localStorage.getItem("mdlivechat-auth-auth-token");
      } catch (e) {
        console.warn("[HomeAuthCheck] localStorage read failed:", e);
      }

      // 2. Fallback to Capacitor Preferences
      if (!sessionStr && Capacitor.isNativePlatform()) {
        try {
          const { value } = await Preferences.get({ key: "mdlivechat-auth-auth-token" });
          sessionStr = value;
        } catch (e) {
          console.warn("[HomeAuthCheck] Preferences read failed:", e);
        }
      }

      if (!sessionStr) {
        // No session - stay on landing page
        return;
      }

      let session: any;
      try {
        session = JSON.parse(sessionStr);
      } catch {
        return;
      }

      if (!session?.access_token || !session?.user?.id) {
        return;
      }

      // We have a valid session in localStorage/Preferences.
      // Mirror it into Capacitor Preferences so the next launch finds it,
      // and into the supabase cookies adapter for any in-app SDK calls.
      if (Capacitor.isNativePlatform()) {
        try {
          await Preferences.set({ key: "mdlivechat-auth-auth-token", value: sessionStr });
        } catch {}
      }

      // Set cookie for server-side rendering
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
        if (projectRef) {
          document.cookie = `sb-${projectRef}-auth-token=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=3600; SameSite=Lax`;
        }
      } catch {}

      const user = session.user;
      const isMasterAdmin = user?.app_metadata?.role === "master_admin" || user?.user_metadata?.global_role === "master_admin";

      if (isMasterAdmin) {
        redirectTo("/master");
        return;
      }

      // Need account info - fetch from API directly to avoid SDK hangs
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const res = await fetch(
          `${supabaseUrl}/rest/v1/accounts?owner_id=eq.${user.id}&select=id,account_number,status&order=created_at`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!res.ok) {
          // Token invalid - go to dashboard, layout will handle re-auth
          redirectTo("/dashboard");
          return;
        }

        const accounts = await res.json();
        if (!accounts || accounts.length === 0) {
          redirectTo("/dashboard");
          return;
        }

        const active = accounts.find((a: any) => a.status === "active") || accounts[0];
        const num = active.account_number || active.id;
        redirectTo(`/dashboard/${num}/inbox`);
      } catch (err) {
        console.error("[HomeAuthCheck] error:", err);
        redirectTo("/dashboard");
      }
    }

    // Run on next tick so the page renders first
    const id = setTimeout(checkAuth, 100);
    return () => clearTimeout(id);
  }, [router]);

  return null;
}
