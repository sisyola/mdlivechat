import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getAccountContext } from "@/lib/supabase/account-context";
import TrafficList from "./TrafficList";

export default async function TrafficPage({
  params,
}: {
  params: Promise<{ accountNumber: string }>;
}) {
  const { accountNumber } = await params;
  const ctx = await getAccountContext(accountNumber);
  if (!ctx?.currentAccount) notFound();

  const supabase = await createClient();

  // Initial visitor fetch (last 50)
  const { data: visitors } = await supabase
    .from("visitors")
    .select("*")
    .eq("account_id", ctx.currentAccount.id)
    .order("last_seen_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Traffic</h1>
        <p className="text-gray-900 mt-1">
          Visitors yang lagi browse website lu
        </p>
      </div>
      <TrafficList
        accountId={ctx.currentAccount.id}
        accountNumber={accountNumber}
        initialVisitors={visitors || []}
      />
    </div>
  );
}