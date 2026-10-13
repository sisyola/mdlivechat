import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileNav from "@/components/MobileNav";
import ActiveSessionTracker from "@/components/ActiveSessionTracker";
import NotificationBell from "@/components/NotificationBell";
import ProfileAvatar from "@/components/ProfileAvatar";
import SoundSettingsButton from "@/components/SoundSettingsButton";
import type { Account } from "@/lib/types";

// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("global_role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Get user's accounts
  const { data: accountsData } = await supabase
    .from("accounts")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const accounts = (accountsData || []) as Account[];
  const activeAccount =
    accounts.find((a) => a.status === "active") || accounts[0] || null;

  // If no active account, redirect to pending approval
  if (!activeAccount || activeAccount.status !== "active") {
    redirect("/pending-approval");
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
                    userId={user.id}
                    avatarUrl={profile?.avatar_url}
                    name={profile?.full_name || user.email || ""}
                  />
                  <div>
                    <p className="text-sm text-gray-900">Logged in as</p>
                    <p className="text-sm font-medium text-gray-900">
                      {profile?.full_name || user.email}
                    </p>
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
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}