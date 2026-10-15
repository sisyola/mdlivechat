"use client";

import { useEffect, useState } from "react";
import { createClient, clearAuthStorage } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileNav from "@/components/MobileNav";
import ActiveSessionTracker from "@/components/ActiveSessionTracker";
import NotificationBell from "@/components/NotificationBell";
import ProfileAvatar from "@/components/ProfileAvatar";
import SoundSettingsButton from "@/components/SoundSettingsButton";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { Account } from "@/lib/types";

function getOrigin() {
  if (typeof window === "undefined") return "https://mdlivechat.vercel.app";
  return window.location.origin || "https://mdlivechat.vercel.app";
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.replace(getOrigin() + "/login");
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const accountMatch = pathname?.match(/^\/dashboard\/([^\/]+)/);
  const currentAccountNumber = accountMatch?.[1];

  useEffect(() => {
    let mounted = true;

    async function init() {
      console.log("[Dashboard] init starting...");

      const stored = localStorage.getItem("mdlivechat-auth-auth-token");
      console.log("[Dashboard] localStorage:", stored ? "EXISTS" : "EMPTY");

      if (!stored) {
        redirectToLogin();
        return;
      }

      let session: any;
      try {
        session = JSON.parse(stored);
      } catch {
        redirectToLogin();
        return;
      }

      if (!session?.access_token) {
        redirectToLogin();
        return;
      }

      console.log("[Dashboard] ✓ Have session, syncing cookies + fetching data...");

      // Set cookie for server-side (Next.js) rendering
      try {
        const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([^.]+)/)?.[1];
        if (projectRef) {
          document.cookie = `sb-${projectRef}-auth-token=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=3600; SameSite=Lax`;
        }
      } catch (e) {
        console.warn("[Dashboard] cookie set failed:", e);
      }

      // Mirror session into Capacitor Preferences so SDK can find it on next launch
      if (Capacitor.isNativePlatform()) {
        try {
          await Preferences.set({ key: "mdlivechat-auth-auth-token", value: JSON.stringify(session) });
        } catch (e) {
          console.warn("[Dashboard] Preferences set failed:", e);
        }
      }

      try {
        // Validate session by hitting Supabase REST directly (same approach as login page).
        // This avoids supabase.auth.setSession() which can hang in WebView.
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!userRes.ok) {
          console.error("[Dashboard] /auth/v1/user failed:", userRes.status);
          // Token expired or invalid - try refresh
          if (session.refresh_token) {
            const refreshRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ refresh_token: session.refresh_token }),
            });

            if (refreshRes.ok) {
              const newAuth = await refreshRes.json();
              session = {
                access_token: newAuth.access_token,
                refresh_token: newAuth.refresh_token,
                expires_at: newAuth.expires_at,
                expires_in: newAuth.expires_in,
                token_type: newAuth.token_type,
                user: newAuth.user,
              };
              localStorage.setItem("mdlivechat-auth-auth-token", JSON.stringify(session));
              if (Capacitor.isNativePlatform()) {
                await Preferences.set({ key: "mdlivechat-auth-auth-token", value: JSON.stringify(session) });
              }
            } else {
              console.error("[Dashboard] refresh failed");
              redirectToLogin();
              return;
            }
          } else {
            redirectToLogin();
            return;
          }
        }

        const u = session.user;
        if (!u) {
          redirectToLogin();
          return;
        }

        // Now create supabase client - it will use the cookie we just set
        const supabase = createClient();
        const [{ data: prof }, { data: accs }] = await Promise.all([
          supabase.from("profiles").select("global_role, full_name, avatar_url").eq("id", u.id).maybeSingle(),
          supabase.from("accounts").select("*").eq("owner_id", u.id).order("created_at", { ascending: true }),
        ]);

        const allAccounts = (accs || []) as Account[];
        let active: Account | null = null;
        if (currentAccountNumber) {
          active =
            allAccounts.find((a) => a.account_number === currentAccountNumber) ||
            allAccounts.find((a) => a.id === currentAccountNumber) ||
            null;
        }
        if (!active) {
          active = allAccounts.find((a) => a.status === "active") || allAccounts[0] || null;
        }

        if (!active) {
          window.location.replace(getOrigin() + "/pending-approval");
          return;
        }

        if (!mounted) return;

        console.log("[Dashboard] ✓ Ready, account:", active.account_number);
        setUser(u);
        setProfile(prof);
        setAccounts(allAccounts);
        setActiveAccount(active);
        setReady(true);
      } catch (err) {
        console.error("[Dashboard] Error:", err);
        if (mounted) {
          setInitError("Gagal memuat dashboard. Cek koneksi lalu coba lagi.");
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [currentAccountNumber]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-600 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl p-6 text-center">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Gagal memuat dashboard</h2>
          <p className="text-sm text-gray-700 mb-4">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-sm">No account found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ActiveSessionTracker accountId={activeAccount.id} />
      <DashboardSidebar accounts={accounts} currentAccount={activeAccount} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-900 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <MobileNav
                  accounts={accounts}
                  currentAccount={activeAccount}
                />
                <div className="hidden md:flex items-center gap-2">
                  <ProfileAvatar
                    userId={user?.id}
                    avatarUrl={profile?.avatar_url}
                    name={profile?.full_name || user?.email || ""}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {profile?.full_name || user?.email}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <SoundSettingsButton accountId={activeAccount.id} />
                <NotificationBell accountId={activeAccount.id} />
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
