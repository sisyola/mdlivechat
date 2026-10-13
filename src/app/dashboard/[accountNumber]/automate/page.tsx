import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getAccountContext } from "@/lib/supabase/account-context";
import CannedResponsesManager from "./CannedResponsesManager";

export default async function AutomatePage({
  params,
}: {
  params: Promise<{ accountNumber: string }>;
}) {
  const { accountNumber } = await params;
  const ctx = await getAccountContext(accountNumber);
  if (!ctx?.currentAccount || !ctx.currentAccountSettings) notFound();

  return (
    <CannedResponsesManager
      accountId={ctx.currentAccount.id}
      initialResponses={ctx.currentAccountSettings.canned_responses}
    />
  );
}