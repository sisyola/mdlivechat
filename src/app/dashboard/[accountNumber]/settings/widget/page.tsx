import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getAccountContext } from "@/lib/supabase/account-context";
import SettingsLayout from "../SettingsLayout";
import WidgetCustomizer from "./WidgetCustomizer";

export default async function WidgetSettingsPage({
  params,
}: {
  params: Promise<{ accountNumber: string }>;
}) {
  const { accountNumber } = await params;
  const ctx = await getAccountContext(accountNumber);
  if (!ctx?.currentAccount || !ctx.currentAccountSettings) notFound();

  return (
    <SettingsLayout accountNumber={accountNumber}>
      <WidgetCustomizer
        accountNumber={accountNumber}
        settings={ctx.currentAccountSettings}
      />
    </SettingsLayout>
  );
}