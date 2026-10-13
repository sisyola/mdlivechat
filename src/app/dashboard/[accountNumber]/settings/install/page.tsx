import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getAccountContext } from "@/lib/supabase/account-context";
import SettingsLayout from "../SettingsLayout";
import InstallCode from "./InstallCode";

export default async function InstallPage({
  params,
}: {
  params: Promise<{ accountNumber: string }>;
}) {
  const { accountNumber } = await params;
  const ctx = await getAccountContext(accountNumber);
  if (!ctx?.currentAccount) notFound();

  return (
    <SettingsLayout accountNumber={accountNumber}>
      <InstallCode
        accountNumber={ctx.currentAccount.account_number}
        companyName={ctx.currentAccount.company_name}
      />
    </SettingsLayout>
  );
}