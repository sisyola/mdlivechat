import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getAccountContext } from "@/lib/supabase/account-context";
import SettingsLayout from "./SettingsLayout";
import Link from "next/link";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ accountNumber: string }>;
}) {
  const { accountNumber } = await params;
  const ctx = await getAccountContext(accountNumber);
  if (!ctx?.currentAccount) notFound();

  const basePath = `/dashboard/${accountNumber}/settings`;
  const items = [
    {
      href: `${basePath}/widget`,
      title: "Widget Customization",
      desc: "Ubah warna, posisi, tema, dan welcome message",
    },
    {
      href: `${basePath}/pre-chat`,
      title: "Pre-chat Form",
      desc: "Atur field yang ditampilkan sebelum chat dimulai",
    },
    {
      href: `${basePath}/install`,
      title: "Install Widget",
      desc: "Copy script embed untuk website lu",
    },
  ];

  return (
    <SettingsLayout accountNumber={accountNumber}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
        <p className="text-gray-900 mb-6">
          Atur tampilan dan perilaku widget untuk {ctx.currentAccount.company_name}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block bg-white border border-gray-900 rounded-xl p-5 hover:shadow-md transition"
            >
              <h3 className="font-semibold text-gray-900 mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-gray-900">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </SettingsLayout>
  );
}