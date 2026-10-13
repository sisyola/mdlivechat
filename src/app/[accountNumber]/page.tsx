import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WidgetClient from "./WidgetClient";
import type { Account, AccountSettings, Profile } from "@/lib/types";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ accountNumber: string }>;
}) {
  const { accountNumber } = await params;

  // Match if it's a numeric ID (account_number)
  if (!/^\d+$/.test(accountNumber)) notFound();

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("account_number", accountNumber)
    .eq("status", "active")
    .single<Account>();

  if (!account) notFound();

  const { data: settings } = await supabase
    .from("account_settings")
    .select("*")
    .eq("account_id", account.id)
    .single<AccountSettings>();

  if (!settings) notFound();

  // Also fetch owner profile for fallback avatar
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("avatar_url, full_name, email")
    .eq("id", account.owner_id)
    .single<Profile>();

  return (
    <WidgetClient
      account={account}
      settings={settings}
      ownerProfile={ownerProfile || null}
    />
  );
}