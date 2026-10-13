import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getAccountContext } from "@/lib/supabase/account-context";
import ChatRoomDetail from "./ChatRoomDetail";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ accountNumber: string; id: string }>;
}) {
  const { accountNumber, id: roomId } = await params;
  const ctx = await getAccountContext(accountNumber);
  if (!ctx?.currentAccount) notFound();

  const supabase = await createClient();
  const { data: room } = await supabase
    .from("chat_rooms")
    .select("*")
    .eq("id", roomId)
    .eq("account_id", ctx.currentAccount.id)
    .single();

  if (!room) notFound();

  return (
    <ChatRoomDetail
      room={room}
      accountId={ctx.currentAccount.id}
      userId={ctx.user.id}
      cannedResponses={ctx.currentAccountSettings?.canned_responses || []}
      basePath={`/dashboard/${accountNumber}`}
    />
  );
}