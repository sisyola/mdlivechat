"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const path = window.location.pathname;

        if (path === "/" || path === "/login" || path === "/register") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("global_role")
            .eq("id", user.id)
            .single();

          if (profile?.global_role === "master_admin") {
            router.push("/master");
            return;
          }

          const { data: accounts } = await supabase
            .from("accounts")
            .select("id")
            .eq("owner_id", user.id)
            .eq("status", "active")
            .single();

          if (accounts?.id) {
            router.push(`/dashboard/${accounts.id}/inbox`);
          } else {
            router.push("/dashboard");
          }
        }
      }
    }

    checkAuth();
  }, []);

  return <>{children}</>;
}
