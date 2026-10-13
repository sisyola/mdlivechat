"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SettingsLayoutProps {
  children: React.ReactNode;
  accountNumber: string;
}

export default function SettingsLayout({
  children,
  accountNumber,
}: SettingsLayoutProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/${accountNumber}/settings`;

  const items = [
    { href: `${basePath}`, label: "Overview", exact: true },
    { href: `${basePath}/widget`, label: "Widget" },
    { href: `${basePath}/pre-chat`, label: "Pre-chat" },
    { href: `${basePath}/install`, label: "Install" },
  ];

  return (
    <div>
      {/* Sub-nav */}
      <div className="flex gap-1 mb-6 border-b border-gray-900 overflow-x-auto">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                isActive
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-900 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}