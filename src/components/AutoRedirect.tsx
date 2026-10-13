"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

export default function AutoRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkAndRedirect() {
      const supabase = createClient();
      const isNative = Capacitor.isNativePlatform();

      // Native WebView butuh waktu untuk hydrate storage
      if (isNative) {
        await new Promise((r) => setTimeout(r, 500));
      }

      if (cancelled) return;

      // Listen for auth state changes (in case session is still hydrating)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (cancelled) return;
        if (session?.user) {
          await doRedirect(supabase, session.user.id);
        }
      });

      // Try getSession first
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.user) {
        await doRedirect(supabase, session.user.id);
      } else if (isNative) {
        // Fallback: try getUser (refreshes from storage)
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (user) {
          await doRedirect(supabase, user.id);
        }
      }

      return () => subscription.unsubscribe();
    }

    async function doRedirect(supabase: ReturnType<typeof createClient>, userId: string) {
      if (cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("global_role")
        .eq("id", userId)
        .single();

      if (cancelled) return;

      if (profile?.global_role === "master_admin") {
        window.location.href = "/master";
        return;
      }

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, account_number, status")
        .eq("owner_id", userId);

      if (cancelled) return;

      let accountNumber: string | undefined;
      if (accountsData && accountsData.length > 0) {
        const active = accountsData.find((a) => a.status === "active");
        const acc = active || accountsData[0];
        accountNumber = acc.account_number || acc.id;
      }

      if (accountNumber) {
        window.location.href = `/dashboard/${accountNumber}/inbox`;
      } else {
        window.location.href = "/dashboard";
      }
    }

    checkAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
