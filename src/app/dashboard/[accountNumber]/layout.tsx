import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getAccountContext } from "@/lib/supabase/account-context";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ accountNumber: string }>;
}) {
  const { accountNumber } = await params;
  const ctx = await getAccountContext(accountNumber);

  if (!ctx) redirect("/login");

  const account = ctx.accounts.find((a) => a.account_number === accountNumber);
  if (!account || account.status !== "active") {
    notFound();
  }

  return <>{children}</>;
}