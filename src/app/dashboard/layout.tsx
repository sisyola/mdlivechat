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

const STORAGE_KEY = "mdlivechat-auth";

async function getStoredSession() {
  if (typeof window === "undefined") return null;

  console.log("[Dashboard] Checking for session in localStorage and Preferences...");

  // 1. Check localStorage first (most reliable in WebView)
  try {
    const stored = localStorage.getItem("mdlivechat-auth-auth-token");
    console.log("[Dashboard] localStorage value:", stored ? "EXISTS" : "EMPTY");
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log("[Dashboard] parsed keys:", Object.keys(parsed || {}));
      if (parsed?.access_token) {
        console.log("[Dashboard] ✓ session from localStorage");
        return parsed;
      }
    }
  } catch (err) {
    console.error("[Dashboard] Failed to read localStorage:", err);
  }

  // 2. Try Capacitor Preferences
  if (Capacitor.isNativePlatform()) {
    try {
      const { value } = await Preferences.get({ key: "mdlivechat-auth-auth-token" });
      console.log("[Dashboard] Preferences value:", value ? "EXISTS" : "EMPTY");
      if (value) {
        const parsed = JSON.parse(value);
        if (parsed?.access_token) {
          console.log("[Dashboard] ✓ session from Preferences");
          return parsed;
        }
      }
    } catch (err) {
      console.error("[Dashboard] Failed to read Preferences:", err);
    }
  }

  console.log("[Dashboard] ✗ no session found");
  return null;
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

  // Extract accountNumber from URL
  const accountMatch = pathname?.match(/^\/dashboard\/([^\/]+)/);
  const currentAccountNumber = accountMatch?.[1];

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function init() {
      console.log("[Dashboard] init starting...");

      const session = await getStoredSession();
      console.log("[Dashboard] session from storage:", session ? "FOUND" : "NULL");

      if (!mounted) return;

      if (!session) {
        console.log("[Dashboard] No session, redirecting to login");
        window.location.replace(window.location.origin + "/login");
        return;
      }

      try {
        console.log("[Dashboard] creating supabase client...");
        const supabase = createClient();
        console.log("[Dashboard] setting session...");

        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        console.log("[Dashboard] session set OK");

        // Set auth cookie for any server-rendered needs
        try {
          const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([^.]+)/)?.[1];
          if (projectRef) {
            const cookieValue = encodeURIComponent(JSON.stringify(session));
            document.cookie = `sb-${projectRef}-auth-token=${cookieValue}; path=/; max-age=${session.expires_in || 3600}; SameSite=Lax`;
          }
        } catch {}

        // Fetch user data
        console.log("[Dashboard] fetching user...");
        const { data: { user: u }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !u) {
          console.error("[Dashboard] getUser failed:", userErr);
          window.location.replace(window.location.origin + "/login");
          return;
        }

        console.log("[Dashboard] fetching profile & accounts...");
        const [profRes, accsRes] = await Promise.all([
          supabase.from("profiles").select("global_role, full_name, avatar_url").eq("id", u.id).maybeSingle(),
          supabase.from("accounts").select("*").eq("owner_id", u.id).order("created_at", { ascending: true }),
        ]);

        const prof = profRes.data;
        const allAccounts = (accsRes.data || []) as Account[];

        // Determine active account: by URL param > first active > first
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

        if (!mounted) return;

        if (!active) {
          console.log("[Dashboard] no active account");
          window.location.replace(window.location.origin + "/pending-approval");
          return;
        }

        console.log("[Dashboard] active account:", active.account_number);
        setUser(u);
        setProfile(prof);
        setAccounts(allAccounts);
        setActiveAccount(active);
        setReady(true);
      } catch (err) {
        console.error("[Dashboard] init error:", err);
        if (mounted) {
          setInitError(err instanceof Error ? err.message : "Unknown error");
          setReady(true);
        }
      }
    }

    // Safety: force ready after 8s to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted && !ready) {
        console.warn("[Dashboard] init timeout, redirecting to login");
        window.location.replace(window.location.origin + "/login?error=dashboard_timeout");
      }
    }, 8000);

    init();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
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
          <h2 className="text-lg font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-sm text-gray-700 mb-4">{initError}</p>
          <button
            onClick={() => window.location.replace(window.location.origin + "/login")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            Back to Login
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
