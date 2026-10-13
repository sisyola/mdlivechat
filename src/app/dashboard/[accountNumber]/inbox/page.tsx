import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getAccountContext } from "@/lib/supabase/account-context";
import InboxList from "./InboxList";

export default async function InboxPage({
  params,
}: {
  params: Promise<{ accountNumber: string }>;
}) {
  const { accountNumber } = await params;
  const ctx = await getAccountContext(accountNumber);
  if (!ctx?.currentAccount) notFound();

  const supabase = await createClient();

  // Initial fetch (client will subscribe realtime)
  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select("*")
    .eq("account_id", ctx.currentAccount.id)
    .order("last_message_at", { ascending: false })
    .limit(50);

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <p className="text-sm text-gray-900 mt-1">
            {rooms?.length || 0} chat
          </p>
        </div>
      </div>

      <InboxList
        accountId={ctx.currentAccount.id}
        initialRooms={rooms || []}
      />
    </div>
  );
}