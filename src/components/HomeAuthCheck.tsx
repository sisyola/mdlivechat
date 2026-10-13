"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function HomeAuthCheck() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();

      // Wait for Capacitor WebView to hydrate native storage
      await new Promise((r) => setTimeout(r, 500));

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("global_role")
        .eq("id", user.id)
        .single();

      if (profile?.global_role === "master_admin") {
        router.replace("/master");
        return;
      }

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, status")
        .eq("owner_id", user.id);

      let accountId: string | undefined;
      if (accountsData && accountsData.length > 0) {
        const active = accountsData.find((a) => a.status === "active");
        accountId = active?.id || accountsData[0].id;
      }

      if (accountId) {
        router.replace(`/dashboard/${accountId}/inbox`);
      } else {
        router.replace("/dashboard");
      }
    }

    checkAuth();
  }, [router]);

  return null;
}
