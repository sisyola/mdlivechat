"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Account, Profile } from "@/lib/types";

interface DashboardSidebarProps {
  accounts: Account[];
  currentAccount: Account | null;
}

export default function DashboardSidebar({
  accounts,
  currentAccount,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const basePath = currentAccount
    ? `/dashboard/${currentAccount.account_number}`
    : "/dashboard";

  // Fetch current user profile (client-side) for avatar
  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data as Profile);
    };
    void fetchProfile();
  }, []);

  const navItems = [
    {
      href: `${basePath}/inbox`,
      label: "Inbox",
      icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
    },
    {
      href: `${basePath}/traffic`,
      label: "Traffic",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    },
    {
      href: `${basePath}/automate`,
      label: "Automate",
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
    },
    {
      href: `${basePath}/settings`,
      label: "Settings",
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    },
  ];

  const activeAccounts = accounts.filter((a) => a.status === "active");

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 bg-white border-r border-gray-900">
        {/* Account switcher */}
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={() => setShowSwitcher(!showSwitcher)}
            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || ""}
                  className="w-full h-full object-cover"
                />
              ) : currentAccount ? (
                currentAccount.company_name.charAt(0).toUpperCase()
              ) : (
                "?"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || currentAccount?.company_name || "Pilih akun"}
              </p>
              <p className="text-xs text-gray-900">
                #{currentAccount?.account_number}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-gray-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </button>

          {showSwitcher && activeAccounts.length > 1 && (
            <div className="mt-2 border border-gray-200 rounded-md bg-white shadow-lg overflow-hidden">
              {activeAccounts.map((acc) => (
                <Link
                  key={acc.id}
                  href={`/dashboard/${acc.account_number}/inbox`}
                  onClick={() => setShowSwitcher(false)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 text-sm"
                >
                  <div className="w-7 h-7 rounded bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-semibold text-xs">
                    {acc.company_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {acc.company_name}
                    </p>
                    <p className="text-xs text-gray-900">
                      #{acc.account_number}
                    </p>
                  </div>
                  {acc.id === currentAccount?.id && (
                    <svg
                      className="w-4 h-4 text-brand-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-900 hover:bg-gray-50"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={item.icon}
                  />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}