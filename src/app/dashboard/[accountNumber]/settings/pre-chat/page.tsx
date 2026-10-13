import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getAccountContext } from "@/lib/supabase/account-context";
import SettingsLayout from "../SettingsLayout";
import PreChatBuilder from "./PreChatBuilder";

export default async function PreChatPage({
  params,
}: {
  params: Promise<{ accountNumber: string }>;
}) {
  const { accountNumber } = await params;
  const ctx = await getAccountContext(accountNumber);
  if (!ctx?.currentAccount || !ctx.currentAccountSettings) notFound();

  return (
    <SettingsLayout accountNumber={accountNumber}>
      <PreChatBuilder
        accountId={ctx.currentAccount.id}
        settings={ctx.currentAccountSettings}
      />
    </SettingsLayout>
  );
}