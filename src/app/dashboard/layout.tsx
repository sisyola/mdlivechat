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
  if (Capacitor.isNativePlatform()) {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY + "-auth-token" });
      if (value) {
        const parsed = JSON.parse(value);
        if (parsed?.access_token) return parsed;
      }
    } catch {}
  }
  // Fallback: ask Supabase client (reads from web cookies if any)
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
        user: data.session.user,
      };
    }
  } catch {}
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

  // Extract accountNumber from URL
  const accountMatch = pathname?.match(/^\/dashboard\/([^\/]+)/);
  const currentAccountNumber = accountMatch?.[1];

  useEffect(() => {
    let mounted = true;

    async function init() {
      const session = await getStoredSession();

      if (!mounted) return;

      if (!session) {
        // Not logged in
        window.location.replace(window.location.origin + "/login");
        return;
      }

      // Sync session to Supabase client + cookies
      try {
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        // Set auth cookie for any server-rendered needs
        const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([^.]+)/)?.[1];
        if (projectRef) {
          const cookieValue = encodeURIComponent(JSON.stringify(session));
          document.cookie = `sb-${projectRef}-auth-token=${cookieValue}; path=/; max-age=${session.expires_in || 3600}; SameSite=Lax`;
        }

        // Fetch user data
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!u) {
          window.location.replace(window.location.origin + "/login");
          return;
        }

        const { data: prof } = await supabase
          .from("profiles")
          .select("global_role, full_name, avatar_url")
          .eq("id", u.id)
          .single();

        const { data: accs } = await supabase
          .from("accounts")
          .select("*")
          .eq("owner_id", u.id)
          .order("created_at", { ascending: true });

        const allAccounts = (accs || []) as Account[];

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
          // No account - redirect to pending
          window.location.replace(window.location.origin + "/pending-approval");
          return;
        }

        setUser(u);
        setProfile(prof);
        setAccounts(allAccounts);
        setActiveAccount(active);
        setReady(true);
      } catch (err) {
        console.error("Dashboard init error:", err);
        if (mounted) {
          window.location.replace(window.location.origin + "/login");
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [currentAccountNumber]);

  if (!ready || !activeAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-sm">Loading...</div>
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
