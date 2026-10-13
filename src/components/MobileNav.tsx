"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Account } from "@/lib/types";

interface MobileNavProps {
  accounts: Account[];
  currentAccount: Account | null;
}

export default function MobileNav({
  accounts,
  currentAccount,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const basePath = currentAccount
    ? `/dashboard/${currentAccount.account_number}`
    : "/dashboard";

  const navItems = [
    { href: `${basePath}/inbox`, label: "Inbox" },
    { href: `${basePath}/traffic`, label: "Traffic" },
    { href: `${basePath}/automate`, label: "Automate" },
    { href: `${basePath}/settings`, label: "Settings" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 hover:bg-gray-100 rounded-md"
      >
        <svg
          className="w-6 h-6 text-gray-900"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50">
          <div className="w-72 h-full bg-white p-4 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-lg">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-md"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Account switcher */}
            {accounts.length > 1 && (
              <div className="mb-4 pb-4 border-b border-gray-900">
                <p className="text-xs text-gray-900 mb-2 px-2">Akun aktif</p>
                {accounts
                  .filter((a) => a.status === "active")
                  .map((acc) => (
                    <Link
                      key={acc.id}
                      href={`/dashboard/${acc.account_number}/inbox`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md text-sm"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-semibold text-sm">
                        {acc.company_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{acc.company_name}</span>
                    </Link>
                  ))}
              </div>
            )}

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}